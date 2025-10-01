import crypto from 'crypto';
import { getAwsClients } from './awsClients.js';
import { getCacheValue, setCacheValue } from './cacheService.js';

const STATUS_CACHE_TTL = 30;

export function createVideoId() {
  return crypto.randomUUID();
}

function getTableName() {
  const { config } = getAwsClients();
  return config.dynamoTable;
}

export async function createUploadPlaceholder({ userId, videoId, objectKey, originalName, contentType }) {
  const { dynamo } = getAwsClients();
  const tableName = getTableName();

  await dynamo
    .put({
      TableName: tableName,
      Item: {
        userId,
        videoId,
        objectKey,
        originalName,
        contentType,
        status: 'UPLOADING',
        createdAt: new Date().toISOString()
      }
    })
    .promise();
}

export async function finalizeUploadRecord({ userId, videoId, sizeBytes, durationSec }) {
  const { dynamo } = getAwsClients();
  const tableName = getTableName();

  await dynamo
    .update({
      TableName: tableName,
      Key: { userId, videoId },
      UpdateExpression: 'SET #status = :status, sizeBytes = :size, durationSec = :duration, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'READY',
        ':size': sizeBytes || null,
        ':duration': durationSec || null,
        ':updatedAt': new Date().toISOString()
      }
    })
    .promise();

  setCacheValue(`status:${userId}:${videoId}`, { status: 'READY' }, STATUS_CACHE_TTL);
}

export async function listVideos(userId) {
  const { dynamo } = getAwsClients();
  const tableName = getTableName();

  const result = await dynamo
    .query({
      TableName: tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false
    })
    .promise();

  return result.Items || [];
}

export async function getVideo(userId, videoId) {
  const { dynamo } = getAwsClients();
  const tableName = getTableName();

  const result = await dynamo
    .get({
      TableName: tableName,
      Key: { userId, videoId }
    })
    .promise();

  return result.Item || null;
}

export async function updateVideoStatus(userId, videoId, status) {
  const { dynamo } = getAwsClients();
  const tableName = getTableName();

  await dynamo
    .update({
      TableName: tableName,
      Key: { userId, videoId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      }
    })
    .promise();

  setCacheValue(`status:${userId}:${videoId}`, { status }, STATUS_CACHE_TTL);
}

export async function getVideoStatus(userId, videoId) {
  const cached = await getCacheValue(`status:${userId}:${videoId}`);
  if (cached?.status) {
    return cached;
  }

  const item = await getVideo(userId, videoId);
  if (!item) {
    return null;
  }

  setCacheValue(`status:${userId}:${videoId}`, { status: item.status }, STATUS_CACHE_TTL);
  return { status: item.status, updatedAt: item.updatedAt };
}
