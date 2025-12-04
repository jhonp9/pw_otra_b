import { Request, Response } from 'express';
import { prisma } from '../../db';

export const enviarMensaje = async (req: Request, res: Response) => {
    const { userId, contenido, streamId, nivel, rol, nombre } = req.body;
    try {
        const mensaje = await prisma.mensaje.create({
            data: {
                usuarioId: Number(userId),
                usuarioNombre: nombre,
                contenido,
                nivelUsuario: Number(nivel),
                rolUsuario: rol,
                streamId: Number(streamId) // El ID del canal donde se escribe
            }
        });
        res.json(mensaje);
    } catch (error) {
        res.status(500).json({ error: 'Error enviando mensaje' });
    }
};

export const obtenerMensajes = async (req: Request, res: Response) => {
    const { streamId } = req.params;
    // Traemos los últimos 50 mensajes para no saturar
    const mensajes = await prisma.mensaje.findMany({
        where: { streamId: Number(streamId) },
        orderBy: { fecha: 'asc' },
        take: 50 
    });
    res.json(mensajes);
};