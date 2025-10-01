import { Router } from 'express';
import { deleteCognitoUser, listCognitoUsers } from '../controllers/adminController.js';
import { isAdmin, verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken());
router.use(isAdmin());
router.get('/users', listCognitoUsers);
router.delete('/users/:username', deleteCognitoUser);

export default router;
