// backend/src/controladores/streamController.ts

import { Request, Response } from 'express';
import { prisma } from '../../db';

// Constantes para el tiempo
const SEGUNDOS_PULSE = 30;
const INCREMENTO_HORAS = SEGUNDOS_PULSE / 3600; // 0.008333...

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

// Se llama cada 30 segundos desde el frontend
export const pulseStream = async (req: Request, res: Response) => {
    const { userId, streamId } = req.body;
    try {
        const stream = await prisma.stream.findUnique({ where: { id: Number(streamId) } });
        if (!stream || !stream.estaEnVivo) return res.status(400).json({ msg: 'Stream inactivo' });

        // Actualizamos las horas
        const user = await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: INCREMENTO_HORAS } }
        });

        // Lógica de Nivel Streamer: Sube cada 30 segundos (INCREMENTO_HORAS)
        // Fórmula: (Horas Totales / Horas por Nivel) + 1
        // Usamos Math.floor para obtener el nivel entero.
        const nuevoNivel = Math.floor(user.horasStream / INCREMENTO_HORAS) + 1;
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