import { Request, Response } from 'express';
import { prisma } from '../../db';

// CONFIGURACIÓN: 30 segundos para subir de nivel
// 30 segundos / 3600 = 0.0083333... horas
const SEGUNDOS_PULSE = 5;
const INCREMENTO_HORAS = SEGUNDOS_PULSE / 3600; 
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

        // 1. Transacción: Sumar tiempo al User y al Stream
        // updatedUser tendrá el valor YA incrementado
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

        // 2. Cálculo de Nivel basado en el TIEMPO TOTAL ACUMULADO
        // Ejemplo: 30s acumulados / 30s meta = 1.0 -> Math.floor(1.0) + 1 = Nivel 2
        // Usamos epsilon para evitar errores de punto flotante (ej: 0.999999)
        const epsilon = 0.000001;
        const nivelCalculado = Math.floor((updatedUser.horasStream + epsilon) / META_HORAS_NIVEL) + 1;
        
        let subioNivel = false;

        // Si el nivel matemático es mayor al nivel guardado en la DB, actualizamos
        if (nivelCalculado > updatedUser.nivelStreamer) {
            await prisma.usuario.update({
                where: { id: Number(userId) },
                data: { nivelStreamer: nivelCalculado }
            });
            subioNivel = true;
        }

        res.json({ 
            ok: true, 
            horasTotales: updatedUser.horasStream, 
            subioNivel, 
            nivel: nivelCalculado 
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
        // Calculamos diferencia real por si el pulse falló alguna vez
        const diffMs = fin.getTime() - new Date(stream.inicio).getTime();
        const horasTotalesReales = diffMs / (1000 * 60 * 60);

        // Ajuste fino al cerrar
        let faltante = horasTotalesReales - stream.tiempoAcumulado;
        if (faltante < 0) faltante = 0; 

        const updatedUser = await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: faltante } }
        });

        await prisma.stream.update({
            where: { id: Number(streamId) },
            data: { estaEnVivo: false, fin: fin, tiempoAcumulado: horasTotalesReales }
        });

        // Verificación FINAL de nivel
        const epsilon = 0.000001;
        const nivelFinal = Math.floor((updatedUser.horasStream + epsilon) / META_HORAS_NIVEL) + 1;
        let subioNivel = false;

        if (nivelFinal > updatedUser.nivelStreamer) {
             await prisma.usuario.update({
                 where: { id: Number(userId) },
                 data: { nivelStreamer: nivelFinal }
             });
             subioNivel = true;
        }

        res.json({ msg: 'Stream finalizado', subioNivel, nivel: nivelFinal });
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