const AWS = require('aws-sdk');
const { loadConfig } = require('./config');

const documentClient = new AWS.DynamoDB.DocumentClient();
const inMemoryStore = new Map();

function getCompositeKey(username, videoId) {
  return `${username}#${videoId}`;
}

function normalizeItem(item, partitionKey, sortKey) {
  if (!item) {
    return null;
  }

  const username =
    item[partitionKey] || item.userId || item.username || item.owner || item['cognito:username'];
  const videoId = item.videoId || item[sortKey];

  if (!username || !videoId) {
    return null;
  }

  return {
    userId: username,
    owner: username,
    videoId,
    id: videoId,
    filename: item.filename,
    status: item.status,
    createdAt: item.createdAt,
  };
}

function buildItem({ username, videoId, filename, status, createdAt }, partitionKey, sortKey) {
  return {
    [partitionKey]: username,
    [sortKey]: videoId,
    videoId,
    filename,
    status,
    createdAt,
  };
}

async function saveVideoMetadata({ username, userId, videoId, filename, status, createdAt }) {
  const owner = username || userId;
  const config = await loadConfig();
  const { dynamoTable: tableName, dynamoPartitionKey: partitionKey, dynamoSortKey: sortKey } = config;

  const item = buildItem({ username: owner, videoId, filename, status, createdAt }, partitionKey, sortKey);

  if (!tableName) {
    const normalized = normalizeItem(item, partitionKey, sortKey);
    inMemoryStore.set(getCompositeKey(owner, videoId), normalized);
    return normalized;
  }

  const params = {
    TableName: tableName,
    Item: item,
  };

  try {
    await documentClient.put(params).promise();
    return normalizeItem(item, partitionKey, sortKey);
  } catch (error) {
    console.error('[dynamoService] Failed to write to DynamoDB, using in-memory store.', error);
    const normalized = normalizeItem(item, partitionKey, sortKey);
    inMemoryStore.set(getCompositeKey(owner, videoId), normalized);
    return normalized;
  }
}

async function listVideosByUser(username) {
  const config = await loadConfig();
  const {
    dynamoTable: tableName,
    dynamoPartitionKey: partitionKey,
    dynamoSortKey: sortKey,
  } = config;

  if (!tableName) {
    return Array.from(inMemoryStore.values()).filter((item) => item && item.userId === username);
  }

  const params = {
    TableName: tableName,
    KeyConditionExpression: '#pk = :username',
    ExpressionAttributeNames: {
      '#pk': partitionKey,
    },
    ExpressionAttributeValues: {
      ':username': username,
    },
  };

  try {
    const result = await documentClient.query(params).promise();
    return (result.Items || [])
      .map((item) => normalizeItem(item, partitionKey, sortKey))
      .filter(Boolean);
  } catch (error) {
    console.error('[dynamoService] Failed to query DynamoDB, using in-memory store.', error);
    return Array.from(inMemoryStore.values()).filter((item) => item && item.userId === username);
  }
}

async function updateVideoStatus(username, videoId, status) {
  const config = await loadConfig();
  const {
    dynamoTable: tableName,
    dynamoPartitionKey: partitionKey,
    dynamoSortKey: sortKey,
  } = config;

  if (!tableName) {
    const key = getCompositeKey(username, videoId);
    const existing = inMemoryStore.get(key);
    if (existing) {
      existing.status = status;
      inMemoryStore.set(key, existing);
    }
    return existing || null;
  }

  const key = {
    [partitionKey]: username,
    [sortKey]: videoId,
  };

  const params = {
    TableName: tableName,
    Key: key,
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': status,
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await documentClient.update(params).promise();
    return normalizeItem(result.Attributes, partitionKey, sortKey);
  } catch (error) {
    console.error('[dynamoService] Failed to update DynamoDB, using in-memory store.', error);
    const fallbackKey = getCompositeKey(username, videoId);
    const existing = inMemoryStore.get(fallbackKey) || {
      userId: username,
      owner: username,
      videoId,
      id: videoId,
    };
    existing.status = status;
    inMemoryStore.set(fallbackKey, existing);
    return existing;
  }
}

async function getVideo(username, videoId) {
  const config = await loadConfig();
  const {
    dynamoTable: tableName,
    dynamoPartitionKey: partitionKey,
    dynamoSortKey: sortKey,
  } = config;

  if (!tableName) {
    return inMemoryStore.get(getCompositeKey(username, videoId)) || null;
  }

  const params = {
    TableName: tableName,
    Key: {
      [partitionKey]: username,
      [sortKey]: videoId,
    },
  };

  try {
    const result = await documentClient.get(params).promise();
    return normalizeItem(result.Item, partitionKey, sortKey);
  } catch (error) {
    console.error('[dynamoService] Failed to get from DynamoDB, using in-memory store.', error);
    return inMemoryStore.get(getCompositeKey(username, videoId)) || null;
  }
}

module.exports = {
  saveVideoMetadata,
  listVideosByUser,
  updateVideoStatus,
  getVideo,
};
