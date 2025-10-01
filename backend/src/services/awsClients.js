import AWS from 'aws-sdk';
import { getConfig } from './configService.js';

let cachedClients = null;

export function getAwsClients() {
  if (cachedClients) {
    return cachedClients;
  }

  const config = getConfig();

  const s3 = new AWS.S3({ signatureVersion: 'v4' });
  const dynamo = new AWS.DynamoDB.DocumentClient();
  const cognito = new AWS.CognitoIdentityServiceProvider();
  const ssm = new AWS.SSM();
  const secretsManager = new AWS.SecretsManager();

  cachedClients = {
    s3,
    dynamo,
    cognito,
    ssm,
    secretsManager,
    config
  };

  return cachedClients;
}

export function resetAwsClients() {
  cachedClients = null;
}
