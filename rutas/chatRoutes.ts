import { Router } from 'express';
import { enviarMensaje, obtenerMensajes } from '../src/controladores/chatController';
import { verifyToken } from '../src/middleware/auth';

const router = Router();
router.post('/enviar', verifyToken, enviarMensaje);
router.get('/:streamId', obtenerMensajes);

export default router;