const {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand
} = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });

const EVENTS_TABLE = "GameFinderEvents";
const MESSAGES_TABLE = "GameFinderMessages";

const GOOGLE_CLIENT_ID = "806474530135-eu9tcf85pn9t8k92c34uir3u6gvmoaka.apps.googleusercontent.com";

// ✅ ADDED (chaos mode toggle)
const CHAOS_MODE = process.env.CHAOS_MODE === "true";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body)
  };
}

function formatEvent(item) {
  return {
    id: Number(item.id.N),
    title: item.title?.S || "",
    category: item.category?.S || "",
    city: item.city?.S || "",
    state: item.state?.S || "",
    location: item.location?.S || "",
    date: item.date?.S || "",
    time: item.time?.S || "",
    description: item.description?.S || "",
    latitude: item.latitude ? Number(item.latitude.N) : null,
    longitude: item.longitude ? Number(item.longitude.N) : null,
    createdBy: item.createdBy?.S || "",
    joinedBy: item.joinedBy?.SS || []
  };
}

function formatMessage(item) {
  return {
    eventId: item.eventID?.S || "",
    createdAt: item.createdAt ? Number(item.createdAt.N) : null,
    userEmail: item.userEmail?.S || "",
    message: item.message?.S || ""
  };
}

async function verifyGoogleToken(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  const googleResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
  );

  if (!googleResponse.ok) {
    return null;
  }

  const tokenInfo = await googleResponse.json();

  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    return null;
  }

  return {
    email: tokenInfo.email,
    name: tokenInfo.name || tokenInfo.email
  };
}

async function geocodeLocation(city, state) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const address = `${city}, ${state}`;

  if (!apiKey) {
    throw new Error("Missing Google Maps API key");
  }

  const geoResponse = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  );

  const geoData = await geoResponse.json();

  if (geoData.status !== "OK" || !geoData.results || geoData.results.length === 0) {
    throw new Error("Could not geocode location");
  }

  const location = geoData.results[0].geometry.location;

  return {
    latitude: location.lat,
    longitude: location.lng
  };
}

exports.handler = async (event) => {
  try {
    const path = event.rawPath || event.path || "/";
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";

    if (CHAOS_MODE && path.includes("/events")) {
      return response(503, {
        message: "Chaos test active: simulated service failure",
      });
    }

    if (method === "OPTIONS") {
      return response(204, {});
    }

    if (method === "GET" && path === "/events") {
      const data = await client.send(new ScanCommand({
        TableName: EVENTS_TABLE
      }));

      const events = (data.Items || []).map(formatEvent);

      return response(200, events);
    }

    if (method === "GET" && path.startsWith("/events/") && !path.endsWith("/messages")) {
      const id = path.split("/")[2];

      const data = await client.send(new GetItemCommand({
        TableName: EVENTS_TABLE,
        Key: {
          id: { N: id }
        }
      }));

      if (!data.Item) {
        return response(404, { message: "Event not found" });
      }

      return response(200, formatEvent(data.Item));
    }

    if (method === "POST" && path === "/events") {
      const user = await verifyGoogleToken(event);

      if (!user) {
        return response(401, {
          message: "Unauthorized: invalid or missing Google OIDC token"
        });
      }

      const body = JSON.parse(event.body || "{}");

      const requiredFields = [
        "title",
        "category",
        "city",
        "state",
        "date",
        "time",
        "description"
      ];

      const missingFields = requiredFields.filter(field =>
        body[field] === undefined ||
        body[field] === null ||
        body[field] === ""
      );

      if (missingFields.length > 0) {
        return response(400, {
          message: "Missing required fields",
          missingFields
        });
      }

      const coordinates = await geocodeLocation(body.city, body.state);
      const id = Date.now();

      await client.send(new PutItemCommand({
        TableName: EVENTS_TABLE,
        Item: {
          id: { N: String(id) },
          title: { S: body.title },
          category: { S: body.category },
          city: { S: body.city },
          state: { S: body.state },
          location: { S: `${body.city}, ${body.state}` },
          date: { S: body.date },
          time: { S: body.time },
          description: { S: body.description },
          latitude: { N: String(coordinates.latitude) },
          longitude: { N: String(coordinates.longitude) },
          createdBy: { S: user.email },
          joinedBy: { SS: [user.email] }
        }
      }));

      return response(201, {
        message: "Event created successfully",
        id,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });
    }

    if (method === "POST" && path.startsWith("/events/") && path.endsWith("/join")) {
      const user = await verifyGoogleToken(event);

      if (!user) {
        return response(401, {
          message: "Unauthorized: invalid or missing Google OIDC token"
        });
      }

      const id = path.split("/")[2];

      await client.send(new UpdateItemCommand({
        TableName: EVENTS_TABLE,
        Key: {
          id: { N: id }
        },
        UpdateExpression: "ADD joinedBy :user",
        ExpressionAttributeValues: {
          ":user": { SS: [user.email] }
        }
      }));

      return response(200, {
        message: "Joined event successfully"
      });
    }

    if (method === "POST" && path.startsWith("/events/") && path.endsWith("/leave")) {
      const user = await verifyGoogleToken(event);

      if (!user) {
        return response(401, {
          message: "Unauthorized: invalid or missing Google OIDC token"
        });
      }

      const id = path.split("/")[2];

      await client.send(new UpdateItemCommand({
        TableName: EVENTS_TABLE,
        Key: {
          id: { N: id }
        },
        UpdateExpression: "DELETE joinedBy :user",
        ExpressionAttributeValues: {
          ":user": { SS: [user.email] }
        }
      }));

      return response(200, {
        message: "Left event successfully"
      });
    }

    if (method === "GET" && path.startsWith("/events/") && path.endsWith("/messages")) {
      const eventId = path.split("/")[2];

      const data = await client.send(new QueryCommand({
        TableName: MESSAGES_TABLE,
        KeyConditionExpression: "eventID = :eventID",
        ExpressionAttributeValues: {
          ":eventID": { S: eventId }
        }
      }));

      const messages = (data.Items || []).map(formatMessage);

      return response(200, messages);
    }

    if (method === "POST" && path.startsWith("/events/") && path.endsWith("/messages")) {
      const user = await verifyGoogleToken(event);

      if (!user) {
        return response(401, {
          message: "Unauthorized: invalid or missing Google OIDC token"
        });
      }

      const eventId = path.split("/")[2];
      const body = JSON.parse(event.body || "{}");

      if (!body.message || body.message.trim() === "") {
        return response(400, {
          message: "Message is required"
        });
      }

      const createdAt = Date.now();

      await client.send(new PutItemCommand({
        TableName: MESSAGES_TABLE,
        Item: {
          eventID: { S: eventId },
          createdAt: { N: String(createdAt) },
          userEmail: { S: user.email },
          message: { S: body.message.trim() }
        }
      }));

      return response(201, {
        message: "Message sent",
        eventId,
        createdAt
      });
    }

    return response(200, {
      message: "GameFinder secure DynamoDB API with events and messages running"
    });

  } catch (error) {
    console.error(error);

    return response(500, {
      message: "Server error",
      error: error.message
    });
  }
};