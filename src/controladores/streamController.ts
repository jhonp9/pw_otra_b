// jhonp9/pw_otra_b/pw_otra_b-c8de98761eeb42f17684ef7afe1da3d572434c70/src/controladores/streamController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';

export const getStreams = async (req: Request, res: Response) => {
    const streamsActivos = await prisma.stream.findMany({
        where: { estaEnVivo: true },
        include: { usuario: { select: { id: true, nombre: true, nivelStreamer: true } } }
    });
    res.json(streamsActivos);
};

export const startStream = async (req: Request, res: Response) => {
    const { userId, titulo, categoria } = req.body;
    try {
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

// NUEVO: Función que se llama cada 36 segundos (0.01 horas) desde el frontend
export const pulseStream = async (req: Request, res: Response) => {
    const { userId, streamId } = req.body;
    try {
        const stream = await prisma.stream.findUnique({ where: { id: Number(streamId) } });
        if (!stream || !stream.estaEnVivo) return res.status(400).json({ msg: 'Stream inactivo' });

        // Sumar 0.01 horas (aprox 36 segundos)
        const incremento = 0.01;
        
        const user = await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: incremento } }
        });

        // Lógica de Nivel Streamer: Sube cada 0.01 horas acumuladas (REQ ESPECÍFICO)
        // Nivel = Parte entera de horas / 0.01. Ejemplo: 0.02 horas = Nivel 3 (empieza en 1)
        const nuevoNivel = Math.floor(user.horasStream / 0.01) + 1;
        let subioNivel = false;

        if (nuevoNivel > user.nivelStreamer) {
            await prisma.usuario.update({
                where: { id: Number(userId) },
                data: { nivelStreamer: nuevoNivel }
            });
            subioNivel = true;
        }

        res.json({ ok: true, horas: user.horasStream, subioNivel, nivel: nuevoNivel });
    } catch (error) {
        res.status(500).json({ msg: 'Error en pulse' });
    }
};

export const stopStream = async (req: Request, res: Response) => {
    const { userId, streamId } = req.body;
    try {
        await prisma.stream.update({
            where: { id: Number(streamId) },
            data: { estaEnVivo: false, fin: new Date() }
        });
        // Ya no calculamos horas aquí porque el 'pulse' lo hace en tiempo real
        res.json({ msg: 'Stream finalizado' });
    } catch (error) {
        res.status(500).json({ msg: 'Error deteniendo stream' });
    }
};

export const getStreamStatus = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const stream = await prisma.stream.findFirst({
        where: { usuarioId: Number(userId), estaEnVivo: true }
    });
    if (stream) {
        res.json({ isLive: true, streamId: stream.id, titulo: stream.titulo });
    } else {
        res.json({ isLive: false });
    }
};