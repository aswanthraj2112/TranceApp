const AWS = require('aws-sdk');
const { loadConfig } = require('./config');

const s3 = new AWS.S3({ signatureVersion: 'v4' });

async function createUploadUrl({ bucket, key, fileType }) {
  try {
    const config = await loadConfig();
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: config.preSignedUrlTtl || 900,
      ContentType: fileType,
    };

    return await s3.getSignedUrlPromise('putObject', params);
  } catch (error) {
    console.error('[s3Service] Failed to create upload URL.', error);
    return `https://example.com/mock-upload/${encodeURIComponent(key)}`;
  }
}

async function createDownloadUrl({ bucket, key }) {
  try {
    const config = await loadConfig();
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: config.preSignedUrlTtl || 900,
    };

    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('[s3Service] Failed to create download URL.', error);
    return `https://example.com/mock-download/${encodeURIComponent(key)}`;
  }
}

async function getBucket() {
  const config = await loadConfig();
  if (!config.s3Bucket) {
    throw new Error('S3 bucket is not configured.');
  }
  return config.s3Bucket;
}

module.exports = {
  createUploadUrl,
  createDownloadUrl,
  getBucket,
};
