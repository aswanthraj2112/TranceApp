# **Project Blueprint: Cloud Video Transcoder (Rebuild)**

This document provides a complete guide for refactoring an existing video transcoder application. The plan involves building a new, stateless backend and robust cloud infrastructure, and then modifying the existing frontend to integrate with these new components, including a full admin dashboard.

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

/tranceVapp/  
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
* **MFA Configuration**: Set to ON. Users can opt-in.  
* **User Attributes**: Enable email and configure username as an alias for sign-in.  
* **Resource**: aws\_cognito\_user\_pool\_client named webapp-client. Enable ALLOW\_USER\_SRP\_AUTH and generate a client secret.  
* **Resource**: aws\_cognito\_user\_group (three groups): standard-users, premium-users, and admin-users.

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

### **Core Logic & Middleware**

* **Config Service**: On startup, fetch all configuration from AWS Parameter Store and Secrets Manager.  
* **Auth Middleware (verifyToken)**: Validate the Cognito JWT from the Authorization header and attach user details to req.user.  
* **Admin Middleware (isAdmin)**: A separate middleware that checks if req.user\['cognito:groups'\] contains admin-users. If not, it returns a 403 Forbidden error.

### **API Endpoints (To Be Built)**

* **User Endpoints (Protected by verifyToken)**  
  * POST /api/videos/initiate-upload  
  * POST /api/videos/finalize-upload  
  * GET /api/videos  
  * POST /api/videos/:videoId/transcode  
  * GET /api/videos/:videoId/download-url  
  * GET /api/videos/:videoId/status  
* **Admin Endpoints (Protected by verifyToken AND isAdmin)**  
  * GET /api/admin/users:  
    * **Logic**: Uses the AWS SDK's CognitoIdentityServiceProvider.listUsers() method to retrieve a list of all users in the User Pool.  
    * **Returns**: An array of user objects containing details like username, email, creation date, and status.  
  * DELETE /api/admin/users/:username:  
    * **Logic**: Uses the AWS SDK's CognitoIdentityServiceProvider.adminDeleteUser() method to permanently delete a user from the User Pool.  
    * **Returns**: A success message.

### **Dockerfile (in /backend)**

* Use a node:18-alpine base image, expose port 8080, and run the app.

## **5\. Part 3: Frontend Modification (React)**

Take the existing frontend code and place it in the /frontend directory. Then, perform the following modifications.

### **Frontend Modification Checklist**

1. **✅ verhaul Authentication Flow (Headless mode):**  
   * Remove any existing custom authentication logic (manual API calls, local state for login, etc.), but **keep your UI components and design intact**.  
   * Install aws-amplify and @aws-amplify/ui-react.  
   * Configure Amplify once in your app entry point (index.js or App.js) using the generated aws-exports.js.  
     import { Amplify } from 'aws-amplify';  
     import awsExports from './aws-exports';  
     Amplify.configure(awsExports);

   ✅ **Replace Authentication Logic Using Hooks:**

   * Use the useAuthenticator hook from @aws-amplify/ui-react to replace your current login, registration, and MFA logic.  
   * Keep your existing form elements, buttons, and styles. Only update their event handlers to call Amplify methods (signIn, signUp, confirmSignUp, signOut).

   ✅ **Configure Required Flow:**

   * **Sign Up:**  
     * Keep your current sign-up form layout.  
     * Replace logic with signUp({ username, password, attributes: { email } }).  
     * Allow optional setup of MFA authenticator app after sign-up.  
   * **Verification:**  
     * After successful sign-up, direct the user to your existing “enter verification code” screen.  
     * Replace logic with confirmSignUp({ username, confirmationCode }).  
     * Add a “Resend Code” button that calls resendCode({ username }).  
   * **Sign In:**  
     * Keep your current login form.  
     * Replace logic with signIn({ username, password }).  
     * If MFA is enabled for that user, Amplify automatically requires the MFA code; just add an input to capture it and call confirmSignIn({ challengeResponse }).

   ✅ **Post-Authentication App Flow:**

   * Use useAuthenticator to detect when authStatus \=== 'authenticated'.  
   * Show your main app components only in this state.  
   * Add a “Sign Out” button anywhere you like that calls signOut().  
2. **✅ Update Upload Flow**:  
   * Modify the video upload to use the new two-step pre-signed URL process: initiate-upload \-\> direct S3 PUT \-\> finalize-upload.  
3. **✅ Implement Role-Based UI (Standard & Premium Users)**:  
   * Decode the JWT (via Amplify's Auth module) to access the cognito:groups array.  
   * Conditionally render transcoding options based on whether the user is in the standard-users or premium-users group.  
4. **✅ Implement Status Polling**:  
   * When transcoding is initiated, use setInterval to poll the GET /api/videos/:videoId/status endpoint and update the UI upon completion.  
5. **✅ Implement Admin Dashboard**:  
   * **Conditional Navigation**: In the main navigation bar, check if the user's cognito:groups includes admin-users. If so, display a link/button to an /admin page.  
   * **Create Admin Page**: Create a new page component for the /admin route, accessible only to admins.  
   * **User List**: On this page, call the GET /api/admin/users endpoint to fetch all users. Display them in a table with columns for Username, Email, and Creation Date.  
   * **Delete Functionality**: Add a "Delete" button to each row in the user table. Clicking it should trigger a confirmation prompt. If confirmed, call the DELETE /api/admin/users/:username endpoint and refresh the user list upon success.  
6. **✅ Update All API Calls**:  
   * Review every API call. Ensure all endpoint URLs are correct and that the Cognito JWT is included in the Authorization header for all protected routes.

### **Containerization (Dockerfile & nginx/default.conf)**

* Ensure the /frontend directory contains a multi-stage Dockerfile and an nginx/default.conf file to configure the reverse proxy.

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
