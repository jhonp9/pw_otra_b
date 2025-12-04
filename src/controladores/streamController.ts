// jhonp9/pw_otra_b/pw_otra_b-4bcaef2a4703ca2b1e2c1733d163516ac5905278/src/controladores/streamController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';

// 1. INTERVALO DE PULSO (Cada cuánto el frontend avisa que sigue vivo)
const SEGUNDOS_PULSE = 10;
const INCREMENTO_HORAS = SEGUNDOS_PULSE / 3600; 

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

        // Sumar incremento al acumulado
        const user = await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: INCREMENTO_HORAS } }
        });

        // REGLA: Subir de nivel cada 30 segundos
        // 30 segundos en horas es 30/3600 = 0.008333...
        const META_HORAS_NIVEL = 30 / 3600; 
        
        // Calculamos el nivel basado en cuántos bloques de 30s ha completado
        // Nivel 1 es base, así que sumamos 1
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
        res.json({ isLive: true, streamId: stream.id, titulo: stream.titulo, inicio: stream.inicio });
    } else {
        res.json({ isLive: false });
    }
};