// jhonp9/pw_otra_b/pw_otra_b-c8de98761eeb42f17684ef7afe1da3d572434c70/rutas/streamRoutes.ts
import { Router } from 'express';
import { getStreams, startStream, stopStream, getStreamStatus, pulseStream } from '../src/controladores/streamController';
import { verifyToken } from '../src/middleware/auth';

const router = Router();
router.get('/', getStreams);
router.get('/status/:userId', getStreamStatus);
router.post('/start', verifyToken, startStream);
router.post('/stop', verifyToken, stopStream);
router.post('/pulse', verifyToken, pulseStream); // <--- NUEVA RUTA HEARTBEAT

export default router;