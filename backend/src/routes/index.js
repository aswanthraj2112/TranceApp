import { Router } from 'express';
import adminRoutes from './admin.js';
import videoRoutes from './videos.js';

const router = Router();

router.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/videos', videoRoutes);
router.use('/admin', adminRoutes);

export default router;
