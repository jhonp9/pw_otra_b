import { Request, Response } from 'express';
import { prisma } from '../../db';

// Usamos 10 segundos para el pulso
const SEGUNDOS_PULSE = 10;
const INCREMENTO_HORAS = SEGUNDOS_PULSE / 3600; 
// Regla: 30 segundos para subir de nivel (0.008333... horas)
const META_HORAS_NIVEL = 30 / 3600; 

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
                inicio: new Date(),
                tiempoAcumulado: 0.0 
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

        // 1. Sumamos el incremento al registro del STREAM y al USUARIO (Tiempo Total)
        const [updatedStream, updatedUser] = await prisma.$transaction([
            prisma.stream.update({
                where: { id: Number(streamId) },
                data: { tiempoAcumulado: { increment: INCREMENTO_HORAS } }
            }),
            prisma.usuario.update({
                where: { id: Number(userId) },
                data: { horasStream: { increment: INCREMENTO_HORAS } }
            })
        ]);

        // 2. Cálculo de Nivel basado en TIEMPO TOTAL ACUMULADO (updatedUser.horasStream)
        // Usamos una pequeña tolerancia (epsilon) para evitar errores de punto flotante
        const epsilon = 0.00001; 
        const nuevoNivel = Math.floor((updatedUser.horasStream + epsilon) / META_HORAS_NIVEL) + 1;
        
        let subioNivel = false;
        
        // Verificamos contra el nivel que tiene guardado en base de datos
        if (nuevoNivel > updatedUser.nivelStreamer) {
            await prisma.usuario.update({
                where: { id: Number(userId) },
                data: { nivelStreamer: nuevoNivel }
            });
            subioNivel = true;
        }

        res.json({ 
            ok: true, 
            horasTotales: updatedUser.horasStream, // Enviamos el total acumulado
            subioNivel, 
            nivel: nuevoNivel 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error en pulse' });
    }
};

export const stopStream = async (req: Request, res: Response) => {
    const { userId, streamId } = req.body;
    try {
        const stream = await prisma.stream.findUnique({ where: { id: Number(streamId) } });
        if (!stream || !stream.inicio) return res.status(400).json({ msg: 'Stream inválido' });

        const fin = new Date();
        const diffMs = fin.getTime() - new Date(stream.inicio).getTime();
        const horasTotalesReales = diffMs / (1000 * 60 * 60);

        // Ajuste final preciso
        let faltante = horasTotalesReales - stream.tiempoAcumulado;
        if (faltante < 0) faltante = 0; 

        await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: faltante } }
        });

        await prisma.stream.update({
            where: { id: Number(streamId) },
            data: { estaEnVivo: false, fin: fin, tiempoAcumulado: horasTotalesReales }
        });

        res.json({ msg: 'Stream finalizado con precisión' });
    } catch (error) {
        console.error(error);
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