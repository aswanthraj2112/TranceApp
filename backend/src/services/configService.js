import AWS from 'aws-sdk';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const PARAMETER_PATH = process.env.CONFIG_PARAMETER_PATH || '/n11817143/app';
const SECRET_ID = process.env.CONFIG_SECRET_ID || 'n11817143-a2-secret';

AWS.config.update({ region: REGION });

const ssm = new AWS.SSM();
const secretsManager = new AWS.SecretsManager();

let cachedConfig = null;

function normalizeParameterName(name = '') {
  const parts = name.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export async function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parameters = await ssm
    .getParametersByPath({
      Path: PARAMETER_PATH,
      Recursive: true,
      WithDecryption: true
    })
    .promise();

  const configFromParameters = parameters.Parameters.reduce((accumulator, parameter) => {
    const key = normalizeParameterName(parameter.Name);
    if (key) {
      accumulator[key] = parameter.Value;
    }
    return accumulator;
  }, {});

  let secretString = {};
  try {
    const secret = await secretsManager.getSecretValue({ SecretId: SECRET_ID }).promise();
    if (secret.SecretString) {
      secretString = JSON.parse(secret.SecretString);
    }
  } catch (error) {
    console.warn('Failed to fetch secret value, continuing without secrets:', error.message);
  }

  cachedConfig = {
    region: REGION,
    parameterPath: PARAMETER_PATH,
    secretId: SECRET_ID,
    ...configFromParameters,
    secrets: secretString
  };

  return cachedConfig;
}

export function getConfig() {
  if (!cachedConfig) {
    throw new Error('Configuration has not been loaded yet');
  }
  return cachedConfig;
}

export async function reloadConfig() {
  cachedConfig = null;
  return loadConfig();
}
