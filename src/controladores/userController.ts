import { Request, Response } from 'express';
import { prisma } from '../../db';

export const getUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) return res.status(400).json({ msg: 'ID inválido' });

    const user = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if(user) {
        const { password, ...resto } = user;
        res.json(resto);
    } else {
        res.status(404).json({msg: 'Usuario no encontrado'});
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    const { userId, metaXp } = req.body;
    try {
        await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { metaXp: Number(metaXp) }
        });
        res.json({ msg: 'Configuración actualizada', metaXp });
    } catch (e) {
        res.status(500).json({ error: 'Error actualizando config' });
    }
};

// REQ 11: Solución del Bug de XP por Chat
export const addChatXp = async (req: Request, res: Response) => {
    const { userId, currentMetaXp } = req.body; 
    
    // Validación y conversión forzada de tipos
    const idUsuario = Number(userId);
    const meta = Number(currentMetaXp) || 1000; 

    if (!idUsuario || isNaN(idUsuario)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    try {
        const user = await prisma.usuario.findUnique({ where: { id: idUsuario } });
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Sumar 1 punto por mensaje
        const updatedUser = await prisma.usuario.update({
            where: { id: idUsuario },
            data: { puntosXP: { increment: 1 } }
        });
        
        // Calcular nivel basado en la meta dinámica del streamer actual
        const nuevoNivel = Math.floor(updatedUser.puntosXP / meta) + 1;
        let subioNivel = false;

        // Si el nuevo nivel calculado es mayor al que tiene guardado, actualizamos
        if (nuevoNivel > user.nivelEspectador) {
            await prisma.usuario.update({
                where: { id: idUsuario },
                data: { nivelEspectador: nuevoNivel }
            });
            subioNivel = true;
        }

        res.json({ ok: true, xp: updatedUser.puntosXP, nivel: nuevoNivel, subioNivel });
    } catch(e) {
        console.error("Error sumando XP:", e);
        res.status(500).json({ error: 'Error interno al sumar XP' });
    }
};