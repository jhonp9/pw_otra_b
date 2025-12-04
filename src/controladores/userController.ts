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
        await prisma.usuario.update({
            where: { id: userId },
            data: { puntosXP: { increment: 1 } } // 1 XP por mensaje
        });
        res.json({ ok: true });
    } catch(e) {
        res.status(500).json({ error: 'Error XP' });
    }
};