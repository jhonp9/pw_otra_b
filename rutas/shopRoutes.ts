// jhonp9/pw_otra_b/pw_otra_b-eb410fb86ee1e2f99aeca94d5e7031bc09cf3d3a/rutas/shopRoutes.ts
import { Router } from 'express';
import { getRegalos, crearRegalo, eliminarRegalo, comprarMonedas, enviarRegalo, getMisEventos } from '../src/controladores/shopController';
import { verifyToken } from '../src/middleware/auth'; 

const router = Router();
router.get('/regalos', getRegalos); 
router.post('/regalos/crear', verifyToken, crearRegalo); 
router.delete('/regalos/:id', verifyToken, eliminarRegalo); 
router.post('/comprar', verifyToken, comprarMonedas); 
router.post('/enviar', verifyToken, enviarRegalo); 
router.get('/eventos', verifyToken, getMisEventos); // <--- NUEVA RUTA PARA OVERLAY
export default router;