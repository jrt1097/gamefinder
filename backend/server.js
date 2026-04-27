const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const events = [
  {
    id: 1,
    title: "Local Gaming Tournament",
    category: "Gaming",
    city: "Durham",
    state: "NH",
    location: "Durham, NH",
    date: "2026-05-10",
    time: "6:00 PM",
    distanceMiles: 2,
    description: "A local gaming tournament for students and community members."
  },
  {
    id: 2,
    title: "Pickup Basketball Night",
    category: "Sports",
    city: "Portsmouth",
    state: "NH",
    location: "Portsmouth, NH",
    date: "2026-05-12",
    time: "7:00 PM",
    distanceMiles: 18,
    description: "Casual pickup basketball games open to all skill levels."
  },
  {
    id: 3,
    title: "Community Board Game Meetup",
    category: "Community",
    city: "Dover",
    state: "NH",
    location: "Dover, NH",
    date: "2026-05-15",
    time: "5:30 PM",
    distanceMiles: 9,
    description: "Meet people nearby and play board games."
  },
  {
    id: 4,
    title: "Esports Watch Party",
    category: "Gaming",
    city: "Manchester",
    state: "NH",
    location: "Manchester, NH",
    date: "2026-05-18",
    time: "8:00 PM",
    distanceMiles: 38,
    description: "Watch competitive esports with other local fans."
  }
];

app.get('/', (req, res) => {
  res.send('GameFinder API is running');
});

app.get('/events', (req, res) => {
  res.json(events);
});

app.get('/events/:id', (req, res) => {
  const eventId = Number(req.params.id);
  const event = events.find(e => e.id === eventId);

  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  res.json(event);
});

app.listen(PORT, () => {
  console.log(`GameFinder API running at http://localhost:${PORT}`);
});