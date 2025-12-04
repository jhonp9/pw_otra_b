// jhonp9/pw_otra_b/pw_otra_b-4bcaef2a4703ca2b1e2c1733d163516ac5905278/src/controladores/streamController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';

// Usamos 10 segundos para el pulso, pero el cálculo final será exacto al milisegundo
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
        // Cerrar streams colgados anteriores
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
                tiempoAcumulado: 0.0 // Iniciamos en 0
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

        // 1. Sumamos el incremento al USUARIO y al registro del STREAM
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

        // 2. Cálculo de Nivel (Cada 30 seg)
        const nuevoNivel = Math.floor(updatedUser.horasStream / META_HORAS_NIVEL) + 1;
        
        let subioNivel = false;
        if (nuevoNivel > updatedUser.nivelStreamer) {
            await prisma.usuario.update({
                where: { id: Number(userId) },
                data: { nivelStreamer: nuevoNivel }
            });
            subioNivel = true;
        }

        res.json({ ok: true, horas: updatedUser.horasStream, subioNivel, nivel: nuevoNivel });
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
        
        // 1. Calcular duración REAL total (en horas)
        const diffMs = fin.getTime() - new Date(stream.inicio).getTime();
        const horasTotalesReales = diffMs / (1000 * 60 * 60);

        // 2. Calcular cuánto falta sumar (Real - Lo que ya sumamos por pulsos)
        // Esto maneja streams de 10s (donde tiempoAcumulado es 0) o streams largos con remanente.
        let faltante = horasTotalesReales - stream.tiempoAcumulado;
        if (faltante < 0) faltante = 0; // Por seguridad

        // 3. Actualizar Usuario (sumar el faltante) y cerrar Stream
        await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { horasStream: { increment: faltante } }
        });

        await prisma.stream.update({
            where: { id: Number(streamId) },
            data: { estaEnVivo: false, fin: fin, tiempoAcumulado: horasTotalesReales }
        });

        // Verificamos nivel una última vez al cerrar
        const userFinal = await prisma.usuario.findUnique({ where: { id: Number(userId) } });
        if (userFinal) {
             const nivelFinal = Math.floor(userFinal.horasStream / META_HORAS_NIVEL) + 1;
             if (nivelFinal > userFinal.nivelStreamer) {
                 await prisma.usuario.update({
                     where: { id: Number(userId) },
                     data: { nivelStreamer: nivelFinal }
                 });
             }
        }

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