import { Request, Response } from 'express';
import { prisma } from '../../db';

export const getStreams = async (req: Request, res: Response) => {
    // Obtener streamers (usuarios con rol streamer)
    // En un caso real filtraríamos por 'estaEnVivo: true' en la tabla Stream
    const streamers = await prisma.usuario.findMany({
        where: { rol: 'streamer' },
        select: { id: true, nombre: true, nivelStreamer: true, horasStream: true }
    });
    
    // Para simplificar, asumimos que si tienen un registro en Stream con estaEnVivo=true, están live
    const streamsActivos = await prisma.stream.findMany({
        where: { estaEnVivo: true },
        include: { usuario: { select: { nombre: true, nivelStreamer: true } } }
    });

    res.json(streamsActivos);
};

export const startStream = async (req: Request, res: Response) => {
    const { userId, titulo, categoria } = req.body;
    try {
        const stream = await prisma.stream.create({
            data: {
                usuarioId: userId,
                titulo,
                categoria,
                estaEnVivo: true,
                inicio: new Date()
            }
        });
        res.json({ msg: 'Stream iniciado', streamId: stream.id });
    } catch (error) {
        res.status(500).json({ msg: 'Error iniciando stream' });
    }
};

export const stopStream = async (req: Request, res: Response) => {
    const { userId, streamId } = req.body;
    try {
        const stream = await prisma.stream.findUnique({ where: { id: streamId } });
        if (!stream || !stream.inicio) return res.status(400).json({ msg: 'Stream no válido' });

        const fin = new Date();
        const duracionHoras = (fin.getTime() - new Date(stream.inicio).getTime()) / (1000 * 60 * 60);

        await prisma.stream.update({
            where: { id: streamId },
            data: { estaEnVivo: false, fin }
        });

        // Actualizar horas del streamer
        const user = await prisma.usuario.update({
            where: { id: userId },
            data: { horasStream: { increment: duracionHoras } }
        });

        // Lógica de Nivel Streamer (Ejemplo: cada 10 horas sube nivel)
        const nuevoNivel = Math.floor(user.horasStream / 10) + 1;
        if (nuevoNivel > user.nivelStreamer) {
            await prisma.usuario.update({
                where: { id: userId },
                data: { nivelStreamer: nuevoNivel }
            });
            return res.json({ msg: 'Stream finalizado', horas: user.horasStream, subioNivel: true, nivel: nuevoNivel });
        }

        res.json({ msg: 'Stream finalizado', horas: user.horasStream, subioNivel: false });
    } catch (error) {
        res.status(500).json({ msg: 'Error deteniendo stream' });
    }
};