# TranceVapp – Cloud Video Transcoder

TranceVapp is a full-stack, cloud-native video transcoding platform designed for the CAB432 A2 assessment. The application combines a Cognito-protected React dashboard with an Express API that orchestrates uploads to Amazon S3, metadata persistence in DynamoDB, caching via ElastiCache (Memcached), and asynchronous transcoding simulation.

## Prerequisites

- Docker and Docker Compose **or** Node.js 18 with npm
- Access to the `n11817143-a2` AWS account (region `ap-southeast-2`)
- Provisioned AWS resources:
  - S3 bucket `n11817143-a2`
  - DynamoDB table `n11817143-VideoApp` (partition key `qut-username`, sort key `id`, GSI `OwnerIndex`)
  - ElastiCache cluster `n11817143-a2-cache`
  - Cognito User Pool `ap-southeast-2_CdVnmKfrW` with an application client
  - Parameter Store namespace `/n11817143/app` populated with configuration values
  - Secrets Manager secret `n11817143-a2-secret` storing the Cognito client secret
  - Route53 CNAME `n11817143-trancevapp.cab432.com` pointing at the EC2 instance

The supplied EC2 instance (`i-0aaedfc6a70038409`) should run Docker Compose to host both services. Ensure the instance role has permission to read Parameter Store, Secrets Manager, S3, DynamoDB, and ElastiCache.

## Quick start with Docker Compose

1. Clone this repository onto the EC2 instance (or your workstation for local testing).
2. Update `tranceVapp/docker-compose.yml` if you need to override any environment variables locally (the file already includes sane defaults for the assessment resources).
3. From the repository root run:
   ```bash
   cd tranceVapp
   docker compose up --build -d
   ```
4. Browse to `http://localhost/` (or `http://n11817143-trancevapp.cab432.com/` in production) and authenticate with a Cognito user.

## Running the backend manually

```bash
cd tranceVapp/backend
npm install
AWS_REGION=ap-southeast-2 \
COGNITO_USER_POOL_ID=ap-southeast-2_CdVnmKfrW \
S3_BUCKET=n11817143-a2 \
DYNAMO_TABLE=n11817143-VideoApp \
ELASTICACHE_ENDPOINT=n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com:11211 \
DYNAMO_PARTITION_KEY=qut-username \
DYNAMO_SORT_KEY=id \
MAX_UPLOAD_SIZE_MB=512 \
PRESIGNED_URL_TTL=600 \
DOMAIN_NAME=n11817143-trancevapp.cab432.com \
node src/index.js
```

If you are running locally without AWS credentials, the backend falls back to in-memory implementations for DynamoDB and ElastiCache, and provides mock pre-signed URLs for S3 interactions.

## Running the frontend manually

```bash
cd tranceVapp/frontend
npm install
npm start
```

For local development without the backend `/api/config` endpoint, create a `.env` file that supplies the Cognito configuration:

```
REACT_APP_AWS_REGION=ap-southeast-2
REACT_APP_COGNITO_USER_POOL_ID=ap-southeast-2_CdVnmKfrW
REACT_APP_COGNITO_CLIENT_ID=<your-app-client-id>
REACT_APP_MAX_UPLOAD_SIZE_MB=512
REACT_APP_PRESIGNED_URL_TTL=600
REACT_APP_DOMAIN_NAME=n11817143-trancevapp.cab432.com
```

## Application behaviour

- **Authentication:** Amplify’s `Authenticator` component enforces Cognito MFA (enabled at the user pool level).
- **Upload workflow:**
  1. The dashboard fetches configuration from `/api/config` and enforces the `maxUploadSizeMb` limit client-side.
  2. Uploads are initiated via `/api/videos/initiate-upload`, which returns an S3 pre-signed URL for `raw-videos/{username}/{videoId}/{filename}`.
  3. After the direct PUT to S3 completes, the client calls `/api/videos/finalize-upload` to persist metadata in DynamoDB.
- **Video listing:** The backend first checks ElastiCache (`n11817143-a2-cache`) before querying DynamoDB. On cache misses it caches results for 30 seconds.
- **Transcoding:** Only members of the `premium-users` Cognito group receive 1080p output; standard users receive 720p. The backend simulates the transcoding phase with a 15-second timer before marking the video as `COMPLETED`.
- **Downloads:** `/api/videos/:videoId/download-url` issues GET pre-signed URLs for either the raw or transcoded S3 prefixes (`raw-videos/` or `transcoded-videos/`).

## Project structure

```
tranceVapp/
├── backend/        # Express API, authentication middleware, AWS service adapters
├── frontend/       # React dashboard, Amplify bootstrap, upload & polling UI
├── terraform/      # Infrastructure as Code definitions for all AWS resources
└── docker-compose.yml
```

## Local development notes

- Without AWS access, the backend stores video metadata in-memory and generates synthetic pre-signed URLs. This allows end-to-end UI testing even when the real services are unavailable.
- The frontend polls `/api/videos/:videoId/status` every five seconds after a transcode request, automatically refreshing the video list once processing completes.
- Update the `.env` files or Docker Compose overrides if you create a new Cognito client for local testing.

## Deployment checklist

1. Apply the Terraform configuration (`terraform init && terraform apply`) from the `tranceVapp/terraform` directory using credentials with appropriate privileges.
2. Build and push the Docker images to `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2` if you are using ECR for distribution.
3. SSH into the EC2 instance and run `docker compose pull && docker compose up -d --build` within `/home/ec2-user/tranceVapp`.
4. Verify the health endpoint at `http://n11817143-trancevapp.cab432.com/health` and confirm Cognito sign-in via the web UI.

With these steps, TranceVapp will be fully operational on the supplied AWS environment.
