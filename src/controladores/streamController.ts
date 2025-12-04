import { Request, Response } from 'express';
import { prisma } from '../../db';

export const getStreams = async (req: Request, res: Response) => {
    // Solo devolvemos los que están realmente en vivo
    const streamsActivos = await prisma.stream.findMany({
        where: { estaEnVivo: true },
        include: { usuario: { select: { id: true, nombre: true, nivelStreamer: true } } } // Incluimos ID para el link
    });
    res.json(streamsActivos);
};

export const startStream = async (req: Request, res: Response) => {
    const { userId, titulo, categoria } = req.body;
    try {
        // Asegurar que cerramos streams huerfanos anteriores si existen
        await prisma.stream.updateMany({
            where: { usuarioId: Number(userId), estaEnVivo: true },
            data: { estaEnVivo: false, fin: new Date() }
        });

        const stream = await prisma.stream.create({
            data: {
                usuarioId: Number(userId),
                titulo,
                categoria: categoria || 'General',
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
        const stream = await prisma.stream.findUnique({ where: { id: Number(streamId) } });
        if (!stream || !stream.inicio) return res.status(400).json({ msg: 'Stream no válido' });

        const fin = new Date();
        const inicio = new Date(stream.inicio);
        // Calculo en horas con decimales
        const duracionHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);

        await prisma.stream.update({
            where: { id: Number(streamId) },
            data: { estaEnVivo: false, fin }
        });

        // Actualizar horas del streamer
        const user = await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: duracionHoras } }
        });

        // Lógica de Nivel Streamer: Sube cada 10 horas acumuladas
        const nuevoNivel = Math.floor(user.horasStream / 10) + 1;
        let subioNivel = false;

        if (nuevoNivel > user.nivelStreamer) {
            await prisma.usuario.update({
                where: { id: Number(userId) },
                data: { nivelStreamer: nuevoNivel }
            });
            subioNivel = true;
        }

        res.json({ msg: 'Stream finalizado', horas: user.horasStream, subioNivel, nivel: nuevoNivel });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'Error deteniendo stream' });
    }
};

export const getStreamStatus = async (req: Request, res: Response) => {
    const { userId } = req.params;
    
    const stream = await prisma.stream.findFirst({
        where: { 
            usuarioId: Number(userId),
            estaEnVivo: true 
        }
    });

    if (stream) {
        res.json({ isLive: true, streamId: stream.id, titulo: stream.titulo });
    } else {
        res.json({ isLive: false });
    }
};