import { Router } from 'express';
import {
  finalizeUpload,
  getDownloadUrl,
  getVideoStatusHandler,
  initiateUpload,
  listUserVideos,
  transcodeVideo
} from '../controllers/videosController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken());
router.post('/initiate-upload', initiateUpload);
router.post('/finalize-upload', finalizeUpload);
router.get('/', listUserVideos);
router.post('/:videoId/transcode', transcodeVideo);
router.get('/:videoId/download-url', getDownloadUrl);
router.get('/:videoId/status', getVideoStatusHandler);

export default router;
