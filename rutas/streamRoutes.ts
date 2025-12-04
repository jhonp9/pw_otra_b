import { Router } from 'express';
import { getStreams, startStream, stopStream, getStreamStatus } from '../src/controladores/streamController';
import { verifyToken } from '../src/middleware/auth';

const router = Router();
router.get('/', getStreams);
router.get('/status/:userId', getStreamStatus); // <--- NUEVA RUTA
router.post('/start', verifyToken, startStream);
router.post('/stop', verifyToken, stopStream);

export default router;