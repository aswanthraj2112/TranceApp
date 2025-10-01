import { getAwsClients } from '../services/awsClients.js';
import {
  createVideoId,
  createUploadPlaceholder,
  finalizeUploadRecord,
  getVideo,
  getVideoStatus,
  listVideos,
  updateVideoStatus
} from '../services/videoService.js';

function resolveUserId(claims = {}) {
  return claims.sub || claims.username || claims['cognito:username'];
}

export async function initiateUpload(req, res) {
  try {
    const { filename, contentType } = req.body;
    if (!filename) {
      return res.status(400).json({ error: { message: 'filename is required' } });
    }

    const userId = resolveUserId(req.user);
    const videoId = createVideoId();
    const { s3, config } = getAwsClients();

    const objectKey = `${userId}/${videoId}/${filename}`;
    await createUploadPlaceholder({
      userId,
      videoId,
      objectKey,
      originalName: filename,
      contentType: contentType || 'application/octet-stream'
    });

    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: config.s3Bucket,
      Key: objectKey,
      ContentType: contentType || 'application/octet-stream',
      Expires: 900
    });

    return res.json({ videoId, uploadUrl, objectKey });
  } catch (error) {
    console.error('initiate-upload failed', error);
    return res.status(500).json({ error: { message: 'Unable to initiate upload' } });
  }
}

export async function finalizeUpload(req, res) {
  try {
    const { videoId, sizeBytes, durationSec } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: { message: 'videoId is required' } });
    }

    const userId = resolveUserId(req.user);
    await finalizeUploadRecord({ userId, videoId, sizeBytes, durationSec });

    return res.json({ message: 'Upload finalized', videoId });
  } catch (error) {
    console.error('finalize-upload failed', error);
    return res.status(500).json({ error: { message: 'Unable to finalize upload' } });
  }
}

export async function listUserVideos(req, res) {
  try {
    const userId = resolveUserId(req.user);
    const items = await listVideos(userId);
    return res.json({ items });
  } catch (error) {
    console.error('list videos failed', error);
    return res.status(500).json({ error: { message: 'Unable to list videos' } });
  }
}

export async function transcodeVideo(req, res) {
  try {
    const { videoId } = req.params;
    const { preset = '720p' } = req.body || {};

    const userId = resolveUserId(req.user);
    const video = await getVideo(userId, videoId);
    if (!video) {
      return res.status(404).json({ error: { message: 'Video not found' } });
    }

    await updateVideoStatus(userId, videoId, `TRANSCODING-${preset}`);

    return res.json({ message: 'Transcode started', videoId, preset });
  } catch (error) {
    console.error('transcode failed', error);
    return res.status(500).json({ error: { message: 'Unable to start transcoding' } });
  }
}

export async function getDownloadUrl(req, res) {
  try {
    const { videoId } = req.params;
    const userId = resolveUserId(req.user);
    const video = await getVideo(userId, videoId);
    if (!video) {
      return res.status(404).json({ error: { message: 'Video not found' } });
    }

    const { s3, config } = getAwsClients();
    const downloadUrl = s3.getSignedUrl('getObject', {
      Bucket: config.s3Bucket,
      Key: video.objectKey,
      Expires: 900
    });

    return res.json({ downloadUrl });
  } catch (error) {
    console.error('download-url failed', error);
    return res.status(500).json({ error: { message: 'Unable to create download URL' } });
  }
}

export async function getVideoStatusHandler(req, res) {
  try {
    const { videoId } = req.params;
    const userId = resolveUserId(req.user);
    const status = await getVideoStatus(userId, videoId);
    if (!status) {
      return res.status(404).json({ error: { message: 'Video not found' } });
    }
    return res.json(status);
  } catch (error) {
    console.error('status lookup failed', error);
    return res.status(500).json({ error: { message: 'Unable to fetch status' } });
  }
}
