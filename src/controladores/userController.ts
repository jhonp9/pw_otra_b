import { Request, Response } from 'express';
import { prisma } from '../../db';

export const getUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if(user) {
        const { password, ...resto } = user;
        res.json(resto);
    } else {
        res.status(404).json({msg: 'Usuario no encontrado'});
    }
};

// REQ 22: Endpoint para actualizar configuración del usuario (Streamer cambia la meta)
export const updateConfig = async (req: Request, res: Response) => {
    const { userId, metaXp } = req.body;
    try {
        await prisma.usuario.update({
            where: { id: userId },
            data: { metaXp: Number(metaXp) }
        });
        res.json({ msg: 'Configuración actualizada', metaXp });
    } catch (e) {
        res.status(500).json({ error: 'Error actualizando config' });
    }
};

export const addChatXp = async (req: Request, res: Response) => {
    // Recibimos userId y opcionalmente la metaXp del canal actual
    const { userId, currentMetaXp } = req.body; 
    
    // Si no envían meta, usamos 1000 por defecto
    const meta = currentMetaXp || 1000; 

    try {
        const user = await prisma.usuario.findUnique({ where: { id: userId } });
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // REQ 11: Sumar 1 punto por mensaje
        const updatedUser = await prisma.usuario.update({
            where: { id: userId },
            data: { puntosXP: { increment: 1 } }
        });
        
        // REQ 12 & 22: Calcular nivel basado en la meta dinámica
        const nuevoNivel = Math.floor(updatedUser.puntosXP / meta) + 1;
        let subioNivel = false;

        if (nuevoNivel > user.nivelEspectador) {
            await prisma.usuario.update({
                where: { id: userId },
                data: { nivelEspectador: nuevoNivel }
            });
            subioNivel = true;
        }

        res.json({ ok: true, xp: updatedUser.puntosXP, nivel: nuevoNivel, subioNivel });
    } catch(e) {
        res.status(500).json({ error: 'Error XP' });
    }
};