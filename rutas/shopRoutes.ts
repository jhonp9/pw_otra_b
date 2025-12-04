import { Router } from 'express';
import { getRegalos, crearRegalo, eliminarRegalo, comprarMonedas, enviarRegalo } from '../src/controladores/shopController';
import { verifyToken } from '../src/middleware/auth'; // <--- IMPORTAR

const router = Router();
router.get('/regalos', getRegalos); // Pública
router.post('/regalos/crear', verifyToken, crearRegalo); // Protegida
router.delete('/regalos/:id', verifyToken, eliminarRegalo); // Protegida
router.post('/comprar', verifyToken, comprarMonedas); // Protegida
router.post('/enviar', verifyToken, enviarRegalo); // Protegida
export default router;