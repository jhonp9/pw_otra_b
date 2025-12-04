// backend/src/controladores/streamController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';

// CAMBIO: Intervalo más corto (10 segundos) para mayor precisión
const SEGUNDOS_PULSE = 10;
const INCREMENTO_HORAS = SEGUNDOS_PULSE / 3600; // 0.002777... horas

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
        // Cerrar streams anteriores colgados
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
                inicio: new Date() // Se guarda la hora exacta de inicio
            }
        });
        // Devolvemos la fecha de inicio para el cronómetro del frontend
        res.json({ msg: 'Stream iniciado', streamId: stream.id, inicio: stream.inicio });
    } catch (error) {
        res.status(500).json({ msg: 'Error iniciando stream' });
    }
};

export const pulseStream = async (req: Request, res: Response) => {
    const { userId, streamId } = req.body;
    try {
        const stream = await prisma.stream.findUnique({ where: { id: Number(streamId) } });
        if (!stream || !stream.estaEnVivo) return res.status(400).json({ msg: 'Stream inactivo' });

        // Sumar el incremento pequeño al TOTAL acumulado del usuario
        const user = await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: INCREMENTO_HORAS } }
        });

        // REGLA: Subir de nivel cada 0.01 horas (36 segundos aprox) acumuladas
        const META_HORAS_NIVEL = 0.01;
        const nuevoNivel = Math.floor(user.horasStream / META_HORAS_NIVEL) + 1;
        
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
        console.error(error);
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
        // IMPORTANTE: Devolver 'inicio' para calcular el cronómetro de sesión
        res.json({ isLive: true, streamId: stream.id, titulo: stream.titulo, inicio: stream.inicio });
    } else {
        res.json({ isLive: false });
    }
};