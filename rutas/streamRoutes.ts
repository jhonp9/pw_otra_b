import { Router } from 'express';
import { getStreams, startStream, stopStream } from '../src/controladores/streamController';
import { verifyToken } from '../src/middleware/auth';
const router = Router();
router.get('/', getStreams);
router.post('/start',verifyToken, startStream);
router.post('/stop',verifyToken, stopStream);
export default router;