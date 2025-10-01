# TranceApp Monorepo

This repository contains the rebuilt full-stack video transcoder project with three primary areas:

- `frontend/` – React + Vite single-page app that authenticates with AWS Cognito via Amplify.
- `backend/` – Node.js/Express API that brokers authentication, media uploads, and admin tasks.
- `terraform/` – Infrastructure-as-code definitions for the AWS resources referenced by the stack.

The sections below outline the common workflows for installing dependencies, starting the services in development, building production bundles, and running the Docker topology.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (optional, only required for container workflows)

## Frontend

```bash
cd frontend
npm install
```

### Start the Vite dev server

```bash
npm run dev
```

The dev server defaults to <http://localhost:5173>. Update `.env` or Vite config if you need to target a different backend URL.

### Build for production

```bash
npm run build
```

The compiled assets will be emitted to `frontend/dist/`. You can preview the production build with:

```bash
npm run preview
```

## Backend

```bash
cd backend
npm install
```

### Start the API (development)

```bash
npm run dev
```

This uses `nodemon` (installed globally or via `npx`) to watch `src/index.js` and serves on port `8080` by default. Use `npm start` for a plain Node.js process without file watching.

Environment variables such as `AWS_REGION`, Cognito pool IDs, and resource ARNs should be set before launching. Consult the Terraform outputs or your parameter store to populate the necessary values.

## Docker Compose stack

To run both services together with their production Docker images:

```bash
docker compose up --build
```

This publishes the frontend on port 80 and the backend on port 8080 of your machine. Update the `docker-compose.yml` file if you need alternative ports or environment configuration.

Stop the stack with:

```bash
docker compose down
```

## Infrastructure (Terraform)

Review `terraform/` for the AWS resources provisioned for this stack. Typical workflow:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Ensure your AWS credentials are configured (e.g., via `aws configure`) before running Terraform commands.

