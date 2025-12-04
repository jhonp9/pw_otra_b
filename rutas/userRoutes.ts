import { Router } from 'express';
import { getUser, addChatXp, updateConfig } from '../src/controladores/userController';
import { verifyToken } from '../src/middleware/auth'; // Proteger ruta de config

const router = Router();
router.get('/:id', getUser);
router.post('/chat-xp', addChatXp);
router.put('/config', verifyToken, updateConfig); // Nueva ruta
export default router;