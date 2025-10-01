const { v4: uuidv4 } = require('uuid');
const { createUploadUrl, createDownloadUrl, getBucket } = require('../services/s3Service');
const {
  saveVideoMetadata,
  listVideosByUser,
  updateVideoStatus,
  getVideo,
} = require('../services/dynamoService');
const cacheService = require('../services/cacheService');
const { loadConfig } = require('../services/config');

const TRANSCODE_DELAY_MS = 15000;

function buildCacheKey(username) {
  return `videos:${username}`;
}

async function initiateUpload(req, res) {
  try {
    const { filename, fileType } = req.body;
    if (!filename || !fileType) {
      return res.status(400).json({ message: 'filename and fileType are required.' });
    }

    const bucket = await getBucket();
    const config = await loadConfig();
    const videoId = uuidv4();
    const rawPrefix = config.s3RawPrefix || 'raw-videos/';
    const objectKey = `${rawPrefix}${req.user.username}/${videoId}/${filename}`;
    const uploadUrl = await createUploadUrl({ bucket, key: objectKey, fileType });

    return res.status(200).json({ uploadUrl, videoId });
  } catch (error) {
    console.error('[videoController] initiateUpload failed', error);
    return res.status(500).json({ message: 'Failed to initiate upload.' });
  }
}

async function finalizeUpload(req, res) {
  try {
    const { videoId, filename } = req.body;
    if (!videoId || !filename) {
      return res.status(400).json({ message: 'videoId and filename are required.' });
    }

    const timestamp = new Date().toISOString();
    await saveVideoMetadata({
      username: req.user.username,
      videoId,
      filename,
      status: 'UPLOADED',
      createdAt: timestamp,
    });

    await cacheService.del(buildCacheKey(req.user.username));

    return res.status(200).json({ success: true, message: 'Video metadata saved.' });
  } catch (error) {
    console.error('[videoController] finalizeUpload failed', error);
    return res.status(500).json({ message: 'Failed to finalize upload.' });
  }
}

async function getVideos(req, res) {
  try {
    const cacheKey = buildCacheKey(req.user.username);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const videos = await listVideosByUser(req.user.username);
    await cacheService.set(cacheKey, videos, 30);

    return res.status(200).json(videos);
  } catch (error) {
    console.error('[videoController] getVideos failed', error);
    return res.status(500).json({ message: 'Failed to fetch videos.' });
  }
}

async function transcodeVideo(req, res) {
  try {
    const { videoId } = req.params;
    const groups = req.user.groups || [];
    const isPremium = groups.includes('premium-users');
    const quality = isPremium ? '1080p' : '720p';

    const current = await updateVideoStatus(req.user.username, videoId, 'TRANSCODING');
    if (!current) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    await cacheService.del(buildCacheKey(req.user.username));

    setTimeout(async () => {
      try {
        await updateVideoStatus(req.user.username, videoId, 'COMPLETED');
        await cacheService.del(buildCacheKey(req.user.username));
        console.log(`[videoController] Transcoding completed for ${videoId}`);
      } catch (error) {
        console.error('[videoController] Failed to finalize transcoding', error);
      }
    }, TRANSCODE_DELAY_MS);

    return res.status(200).json({ success: true, message: 'Transcoding started.', quality });
  } catch (error) {
    console.error('[videoController] transcodeVideo failed', error);
    return res.status(500).json({ message: 'Failed to start transcoding.' });
  }
}

async function getDownloadUrl(req, res) {
  try {
    const { videoId } = req.params;
    const { version = 'raw' } = req.query;
    const bucket = await getBucket();
    const config = await loadConfig();

    const video = await getVideo(req.user.username, videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const baseKey = `${req.user.username}/${videoId}/${video.filename}`;
    const rawPrefix = config.s3RawPrefix || 'raw-videos/';
    const transcodedPrefix = config.s3TranscodedPrefix || 'transcoded-videos/';
    const key =
      version === 'transcoded' ? `${transcodedPrefix}${baseKey}` : `${rawPrefix}${baseKey}`;

    const downloadUrl = await createDownloadUrl({ bucket, key });
    return res.status(200).json({ downloadUrl });
  } catch (error) {
    console.error('[videoController] getDownloadUrl failed', error);
    return res.status(500).json({ message: 'Failed to create download URL.' });
  }
}

async function getVideoStatus(req, res) {
  try {
    const { videoId } = req.params;
    const video = await getVideo(req.user.username, videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }
    return res.status(200).json({ status: video.status });
  } catch (error) {
    console.error('[videoController] getVideoStatus failed', error);
    return res.status(500).json({ message: 'Failed to get video status.' });
  }
}

async function getPublicConfig(req, res) {
  try {
    const config = await loadConfig();
    return res.status(200).json({
      region: config.region,
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId,
      maxUploadSizeMb: config.maxUploadSizeMb,
      preSignedUrlTtl: config.preSignedUrlTtl,
      domainName: config.domainName,
    });
  } catch (error) {
    console.error('[videoController] getPublicConfig failed', error);
    return res.status(500).json({ message: 'Failed to load configuration.' });
  }
}

module.exports = {
  initiateUpload,
  finalizeUpload,
  getVideos,
  transcodeVideo,
  getDownloadUrl,
  getVideoStatus,
  getPublicConfig,
};
