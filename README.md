# GameFinder: Sports Event Finder
live application: https://d6il0du8e0i9f.cloudfront.net/index.html 

A serverless cloud-based event discovery platform that allows users to find, create, and interact with nearby events.

---

## Overview

GameFinder is a full-stack cloud application built using AWS serverless services.

Users can:
- Find nearby events  
- Create and join events  
- Send messages within events  
- Authenticate securely using Google OIDC  

The system is designed to be scalable, cost-efficient, and resilient using modern cloud architecture principles.

---

## Architecture

The application follows a **serverless architecture**:

- **Frontend:** Amazon S3 + CloudFront  
- **Backend:** AWS Lambda  
- **API Layer:** API Gateway / Lambda URL  
- **Database:** DynamoDB  
- **Authentication:** Google OIDC  
- **Deployment:** CloudFormation + GitHub  

---

## System Flow

1. User accesses the app through a browser  
2. CloudFront delivers the frontend from S3  
3. User actions trigger API requests  
4. API Gateway routes requests to Lambda  
5. Lambda processes logic and interacts with DynamoDB  
6. Data is returned and displayed to the user  

---

## Features

- Event discovery with filtering (location, category, distance)  
- Create and join events  
- Event-based messaging system  
- Location-based search (within X miles)  
- Secure authentication with Google OIDC  
- Serverless backend with automatic scaling  

---

## Reliability & Chaos Testing

GameFinder includes a **Chaos Mode** feature to simulate backend failures.

- Randomly triggers Lambda failures  
- Demonstrates system fault tolerance  
- Frontend remains available even when backend fails  
- Displays graceful error messages to users  

---

## Monitoring (Operational Excellence)

The system uses **AWS CloudWatch** for monitoring:

- Lambda invocations  
- Error rates (4xx / 5xx)  
- Request count  
- Execution duration  

This enables real-time visibility into system performance and helps debug issues quickly.

---

## Cost Optimization

GameFinder is fully serverless, meaning:

- No idle servers  
- Pay-per-use pricing model  
- Estimated cost: **~$8/month (~$96/year)**  

This makes it highly cost-efficient compared to traditional infrastructure.

---

## Security

- Google OIDC authentication  
- Token-based access control  
- CORS configuration for secure API communication  

---

## Deployment

### Prerequisites

- AWS account  
- Node.js installed  
- AWS CLI configured  

---

### Steps

1. Clone the repository:
```bash
git clone https://github.com/jtio97/gamefinder.git
cd gamefinder
Deploy infrastructure:
./deploy.sh
Upload frontend to S3 and connect to CloudFront
Access the app via CloudFront URL