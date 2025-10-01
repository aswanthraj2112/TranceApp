const express = require('express');
const { verifyToken } = require('../middleware/auth');
const videoController = require('../controllers/videoController');

const router = express.Router();

router.get('/config', videoController.getPublicConfig);

router.use(verifyToken);

router.post('/videos/initiate-upload', videoController.initiateUpload);
router.post('/videos/finalize-upload', videoController.finalizeUpload);
router.get('/videos', videoController.getVideos);
router.post('/videos/:videoId/transcode', videoController.transcodeVideo);
router.get('/videos/:videoId/download-url', videoController.getDownloadUrl);
router.get('/videos/:videoId/status', videoController.getVideoStatus);

module.exports = router;
