import { Router } from 'express';
import { getRegalos, crearRegalo, eliminarRegalo, comprarMonedas, enviarRegalo } from '../src/controladores/shopController';
const router = Router();
router.get('/regalos', getRegalos);
router.post('/regalos/crear', crearRegalo);
router.delete('/regalos/:id', eliminarRegalo);
router.post('/comprar', comprarMonedas);
router.post('/enviar', enviarRegalo);
export default router;