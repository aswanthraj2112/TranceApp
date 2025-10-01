const AWS = require('aws-sdk');

const region = process.env.AWS_REGION || 'ap-southeast-2';
AWS.config.update({ region });

const parameterPath = '/n11817143/app/';
const secretName = 'n11817143-a2-secret';

const DEFAULTS = {
  userPoolId: 'ap-southeast-2_CdVnmKfrW',
  userPoolClientId: '',
  s3Bucket: 'n11817143-a2',
  dynamoTable: 'n11817143-VideoApp',
  dynamoOwnerIndex: 'OwnerIndex',
  elasticacheEndpoint: 'n11817143-a2-cache.km2jzi.cfg.apse2.cache.amazonaws.com:11211',
  maxUploadSizeMb: 512,
  preSignedUrlTtl: 600,
  s3RawPrefix: 'raw-videos/',
  s3TranscodedPrefix: 'transcoded-videos/',
  s3ThumbnailPrefix: 'thumbnails/',
  dynamoPartitionKey: 'qut-username',
  dynamoSortKey: 'id',
  domainName: 'n11817143-trancevapp.cab432.com',
};

const ssm = new AWS.SSM();
const secretsManager = new AWS.SecretsManager();

let cachedConfig = null;
let fetchingPromise = null;

async function fetchParameters() {
  const params = {
    Path: parameterPath,
    Recursive: false,
    WithDecryption: true,
  };

  try {
    const response = await ssm.getParametersByPath(params).promise();
    const values = {};

    response.Parameters.forEach((param) => {
      const key = param.Name.replace(`${parameterPath}`, '');
      values[key] = param.Value;
    });

    return values;
  } catch (error) {
    console.warn(
      '[config] Failed to load SSM parameters, falling back to environment variables.',
      error.message
    );
    return {};
  }
}

async function fetchSecret() {
  try {
    const secret = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    if (secret.SecretString) {
      return JSON.parse(secret.SecretString);
    }
    return {};
  } catch (error) {
    console.warn('[config] Failed to load secret, falling back to environment variables.', error.message);
    return {};
  }
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePrefix(prefix, fallback) {
  if (!prefix) {
    return fallback;
  }

  let normalized = prefix;
  if (normalized.startsWith('s3://')) {
    const [, ...parts] = normalized.replace('s3://', '').split('/');
    normalized = parts.join('/');
  }

  normalized = normalized.replace(/^\/+/, '');
  if (normalized && !normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized || fallback;
}

function buildConfig(parameterValues, secretValues) {
  const maxUploadSizeMb =
    parseNumber(parameterValues.maxUploadSizeMb, null) ||
    parseNumber(process.env.MAX_UPLOAD_SIZE_MB, null) ||
    DEFAULTS.maxUploadSizeMb;

  const preSignedUrlTtl =
    parseNumber(parameterValues.preSignedUrlTTL, null) ||
    parseNumber(process.env.PRESIGNED_URL_TTL, null) ||
    DEFAULTS.preSignedUrlTtl;

  return {
    region,
    userPoolId:
      parameterValues.cognitoUserPoolId || process.env.COGNITO_USER_POOL_ID || DEFAULTS.userPoolId,
    userPoolClientId:
      parameterValues.cognitoClientId || process.env.COGNITO_CLIENT_ID || DEFAULTS.userPoolClientId,
    s3Bucket: parameterValues.s3Bucket || process.env.S3_BUCKET || DEFAULTS.s3Bucket,
    dynamoTable:
      parameterValues.dynamoTable || process.env.DYNAMO_TABLE || DEFAULTS.dynamoTable,
    dynamoOwnerIndex:
      parameterValues.dynamoOwnerIndex ||
      process.env.DYNAMO_OWNER_INDEX ||
      DEFAULTS.dynamoOwnerIndex,
    elasticacheEndpoint:
      parameterValues.elasticacheEndpoint ||
      process.env.ELASTICACHE_ENDPOINT ||
      DEFAULTS.elasticacheEndpoint,
    clientSecret:
      secretValues.COGNITO_CLIENT_SECRET || process.env.COGNITO_CLIENT_SECRET || '',
    maxUploadSizeMb,
    preSignedUrlTtl,
    s3RawPrefix: normalizePrefix(parameterValues.s3_raw_prefix, DEFAULTS.s3RawPrefix),
    s3TranscodedPrefix: normalizePrefix(
      parameterValues.s3_transcoded_prefix,
      DEFAULTS.s3TranscodedPrefix
    ),
    s3ThumbnailPrefix: normalizePrefix(
      parameterValues.s3_thumbnail_prefix,
      DEFAULTS.s3ThumbnailPrefix
    ),
    dynamoPartitionKey: process.env.DYNAMO_PARTITION_KEY || DEFAULTS.dynamoPartitionKey,
    dynamoSortKey: process.env.DYNAMO_SORT_KEY || DEFAULTS.dynamoSortKey,
    domainName: parameterValues.domainName || process.env.DOMAIN_NAME || DEFAULTS.domainName,
  };
}

async function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (fetchingPromise) {
    return fetchingPromise;
  }

  fetchingPromise = (async () => {
    const [parameters, secrets] = await Promise.all([fetchParameters(), fetchSecret()]);
    cachedConfig = buildConfig(parameters, secrets);
    fetchingPromise = null;
    return cachedConfig;
  })();

  return fetchingPromise;
}

function clearConfigCache() {
  cachedConfig = null;
  fetchingPromise = null;
}

module.exports = {
  loadConfig,
  clearConfigCache,
};
