# **Project Blueprint: Cloud Video Transcoder (Rebuild)**

This document provides a complete guide for refactoring an existing video transcoder application. The plan involves building a new, stateless backend and robust cloud infrastructure, and then modifying the existing frontend to integrate with these new components.

## **1\. High-Level Architecture**

The target architecture is a stateless, containerized web service deployed on a single EC2 instance, designed for scalability and security.

* **Frontend**: An existing React SPA (to be modified) served by Nginx.  
* **Backend**: A new Node.js/Express REST API (to be built).  
* **Database**: DynamoDB for metadata and ElastiCache for caching.  
* **Storage**: S3 for video files.  
* **Authentication**: AWS Cognito for user management.  
* **Configuration**: AWS Parameter Store and Secrets Manager.  
* **Deployment**: Docker Compose on EC2.  
* **Infrastructure Management**: Terraform (Infrastructure as Code).

## **2\. Overall Project Structure**

The final monorepo should have the following directory structure.

/cab432-a2-video-app/  
|  
├── /terraform/              \# All Terraform (.tf) files for infrastructure  
|  
├── /backend/                \# New Node.js/Express application (to be built)  
|   ├── src/  
|   |   ├── controllers/  
|   |   ├── middleware/  
|   |   ├── routes/  
|   |   └── services/  
|   ├── Dockerfile  
|   └── package.json  
|  
├── /frontend/               \# Existing React application (to be modified)  
|   ├── nginx/  
|   |   └── default.conf  
|   ├── Dockerfile  
|   └── ... (existing repo contents)  
|  
└── docker-compose.yml       \# Docker Compose file to orchestrate services

## **3\. Part 1: Infrastructure as Code (Terraform)**

Create a directory /terraform and define all the following AWS resources.

### **providers.tf**

* Configure the AWS provider for region ap-southeast-2.

### **s3.tf**

* **Resource**: aws\_s3\_bucket named n11817143-a2. Configure it to be private.

### **dynamodb.tf**

* **Resource**: aws\_dynamodb\_table named n11817143-VideoApp.  
* **Key Schema**: Partition Key userId (String), Sort Key videoId (String).

### **elasticache.tf**

* **Resource**: aws\_elasticache\_cluster named n11817143-a2-cache.  
* **Engine**: memcached, Node Type: cache.t2.micro.  
* **Security**: Must be accessible from the EC2 instance on port 11211\.

### **cognito.tf**

* **Resource**: aws\_cognito\_user\_pool named n11817143-a2.  
* **MFA Configuration**: Set to ON.  
* **Resource**: aws\_cognito\_user\_pool\_client named webapp-client. Enable ALLOW\_USER\_SRP\_AUTH and generate a client secret.  
* **Resource**: aws\_cognito\_user\_group (two groups): standard-users and premium-users.

### **ssm.tf (Parameter Store)**

* Create aws\_ssm\_parameter resources under /n11817143/app/ for: /cognitoUserPoolId, /cognitoClientId, /s3Bucket, /dynamoTable, /elasticacheEndpoint.

### **secretsmanager.tf**

* **Resource**: aws\_secretsmanager\_secret named n11817143-a2-secret.  
* **Secret String**: {"COGNITO\_CLIENT\_SECRET": "your-secret-value"}.

### **route53.tf**

* **Resource**: aws\_route53\_record for n11817143-videoapp.cab432.com.  
* **Type**: CNAME, pointing to the EC2 instance's public DNS.

## **4\. Part 2: Backend Development (Node.js/Express)**

Build the new backend application in the /backend directory.

### **package.json**

* **Dependencies**: express, cors, aws-sdk, jsonwebtoken, jwk-to-pem, node-fetch, memcached.

### **Core Logic**

* **Config Service**: On startup, fetch all configuration from AWS Parameter Store and Secrets Manager.  
* **Auth Middleware**: Implement verifyToken to validate the Cognito JWT from the Authorization header and attach user details to req.user.

### **API Endpoints (To Be Built)**

* **POST /api/videos/initiate-upload**: Accepts { filename, fileType }, returns a pre-signed S3 PUT URL and a new videoId.  
* **POST /api/videos/finalize-upload**: Accepts { videoId, filename }, creates the metadata record in DynamoDB with status: 'UPLOADED'.  
* **GET /api/videos**: Implements cache-aside logic with ElastiCache to fetch the user's video list from DynamoDB.  
* **POST /api/videos/:videoId/transcode**: Checks req.user\['cognito:groups'\] to authorize. Updates DynamoDB status to TRANSCODING, simulates completion, then updates status to COMPLETED.  
* **GET /api/videos/:videoId/download-url**: Generates a pre-signed S3 GET URL.  
* **GET /api/videos/:videoId/status**: Fetches and returns the current video status from DynamoDB for frontend polling.

### **Dockerfile (in /backend)**

* Use a node:18-alpine base image, expose port 8080, and run the app.

## **5\. Part 3: Frontend Modification (React)**

Take the existing frontend code and place it in the /frontend directory. Then, perform the following modifications.

### **Frontend Modification Checklist**

1. **✅ Replace Authentication Logic**:  
   * Remove any existing custom login/registration code.  
   * Install aws-amplify and @aws-amplify/ui-react.  
   * Wrap the main application component with the \<Authenticator\> component from Amplify UI. This will automatically handle login, sign-up, and the **MFA challenge flow**.  
   * Configure Amplify in your index.js with the Cognito User Pool ID and Client ID fetched from your backend or environment variables.  
2. **✅ Update Upload Flow**:  
   * Modify the video upload component to follow the new two-step process:  
     1. First, call the new backend endpoint POST /api/videos/initiate-upload to get a pre-signed URL.  
     2. Second, use that URL to upload the file directly to S3 (e.g., with axios.put).  
     3. Third, on successful S3 upload, call POST /api/videos/finalize-upload.  
3. **✅ Implement Role-Based UI**:  
   * After a user logs in, use Amplify's Auth.currentAuthenticatedUser() to get their session and JWT.  
   * Decode the JWT to access the cognito:groups array.  
   * In the UI, conditionally render transcoding options. For example:  
     {userGroups.includes('premium-users') && \<button\>Transcode to 1080p\</button\>}  
     {userGroups.includes('standard-users') && \<button\>Transcode to 720p\</button\>}

4. **✅ Implement Status Polling**:  
   * In the component that displays the list of videos, create a mechanism to poll for updates on videos with a TRANSCODING status.  
   * When a user initiates a transcode, start a setInterval that calls the new GET /api/videos/:videoId/status endpoint every 5-10 seconds.  
   * When the status changes to COMPLETED, clear the interval and update the component's state to reflect the change (e.g., enable the download button for the transcoded version).  
5. **✅ Update API Calls**:  
   * Go through all axios or fetch calls in the application.  
   * Ensure all endpoint URLs match the new backend specification.  
   * For all protected routes, ensure the user's Cognito JWT is being retrieved from Amplify ((await Auth.currentSession()).getIdToken().getJwtToken()) and included in the Authorization: Bearer \<token\> header.

### **Containerization (Dockerfile & nginx/default.conf)**

* Ensure the /frontend directory contains a multi-stage Dockerfile to build the React app and serve it with Nginx, and an nginx/default.conf file to configure the reverse proxy to the backend.

## **6\. Part 4: Deployment (Docker Compose)**

Create the docker-compose.yml file in the root directory.

version: '3.8'

services:  
  frontend:  
    build:  
      context: ./frontend  
    ports:  
      \- "80:80"  
    restart: always  
    depends\_on:  
      \- backend

  backend:  
    build:  
      context: ./backend  
    ports:  
      \- "8080:8080"  
    restart: always  
    environment:  
      \- AWS\_REGION=ap-southeast-2  
      \# Credentials will be provided by the EC2 instance role in production  
