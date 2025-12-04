import { Router } from 'express';
import { getStreams, startStream, stopStream } from '../src/controladores/streamController';
const router = Router();
router.get('/', getStreams);
router.post('/start', startStream);
router.post('/stop', stopStream);
export default router;