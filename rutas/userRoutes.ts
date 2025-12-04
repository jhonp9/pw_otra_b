import { Router } from 'express';
import { getUser, addChatXp } from '../src/controladores/userController';
const router = Router();
router.get('/:id', getUser);
router.post('/chat-xp', addChatXp);
export default router;