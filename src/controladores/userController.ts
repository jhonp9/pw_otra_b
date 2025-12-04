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

export const addChatXp = async (req: Request, res: Response) => {
    const { userId } = req.body;
    try {
        const user = await prisma.usuario.findUnique({ where: { id: userId } });
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const updatedUser = await prisma.usuario.update({
            where: { id: userId },
            data: { puntosXP: { increment: 1 } }
        });
        
        const nuevoNivel = Math.floor(updatedUser.puntosXP / 1000) + 1;
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