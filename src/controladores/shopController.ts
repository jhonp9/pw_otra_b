// jhonp9/pw_otra_b/pw_otra_b-4bcaef2a4703ca2b1e2c1733d163516ac5905278/src/controladores/shopController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';
import { calcularNuevoNivel } from './userController'; 

export const getRegalos = async (req: Request, res: Response) => {
    try {
        const regalos = await prisma.regalo.findMany();
        res.json(regalos);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener regalos' });
    }
};

export const crearRegalo = async (req: Request, res: Response) => {
    const { nombre, costo, puntos, icono, streamerId } = req.body;
    try {
        const regalo = await prisma.regalo.create({
            data: { nombre, costo, puntos, icono, streamerId }
        });
        res.json(regalo);
    } catch (error) {
        res.status(500).json({ msg: 'Error creando regalo' });
    }
};

export const eliminarRegalo = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.regalo.delete({ where: { id: Number(id) } });
        res.json({ msg: 'Regalo eliminado' });
    } catch (e) {
        res.status(500).json({ msg: 'Error eliminando regalo' });
    }
};

export const comprarMonedas = async (req: Request, res: Response) => {
    const { userId, monto } = req.body;
    try {
        const user = await prisma.usuario.update({
            where: { id: userId },
            data: { monedas: { increment: monto } }
        });
        await prisma.transaccion.create({
            data: { usuarioId: userId, monto, tipo: 'compra_monedas', detalle: `Recarga de ${monto}` }
        });
        res.json({ msg: 'Recarga exitosa', monedas: user.monedas });
    } catch (error) {
        res.status(500).json({ msg: 'Error en compra' });
    }
};

export const enviarRegalo = async (req: Request, res: Response) => {
    const { viewerId, regaloId, streamerId } = req.body;

    try {
        const viewer = await prisma.usuario.findUnique({ where: { id: viewerId } });
        const regalo = await prisma.regalo.findUnique({ where: { id: regaloId } });
        const streamer = await prisma.usuario.findUnique({ where: { id: Number(streamerId) } });

        if (!viewer || !regalo) return res.status(404).json({ msg: 'Datos incorrectos' });
        if (viewer.monedas < regalo.costo) return res.status(400).json({ msg: 'Saldo insuficiente' });

        const updatedUser = await prisma.usuario.update({
            where: { id: viewerId },
            data: {
                monedas: { decrement: regalo.costo },
                puntosXP: { increment: regalo.puntos }
            }
        });

        const configNiveles = streamer?.configNiveles || "{}";
        const nuevoNivel = calcularNuevoNivel(updatedUser.puntosXP, viewer.nivelEspectador, configNiveles);
        
        let subioNivel = false;
        if (nuevoNivel > updatedUser.nivelEspectador) {
            await prisma.usuario.update({
                where: { id: viewerId },
                data: { nivelEspectador: nuevoNivel }
            });
            subioNivel = true;
        }

        await prisma.transaccion.create({
            data: { 
                usuarioId: viewerId, 
                destinatarioId: streamerId ? Number(streamerId) : null,
                monto: -regalo.costo, 
                tipo: 'envio_regalo', 
                detalle: `¡${viewer.nombre} envió ${regalo.nombre} ${regalo.icono} (+${regalo.puntos} XP)!` 
            }
        });

        res.json({ success: true, monedas: updatedUser.monedas, xp: updatedUser.puntosXP, subioNivel, nivel: nuevoNivel });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error enviando regalo' });
    }
};

// CAMBIO CLAVE: Usar lastId en vez de tiempo para mayor precisión
export const getMisEventos = async (req: Request, res: Response) => {
    const { userId } = req.body; // Viene del token
    const { lastId } = req.query; // El último ID que el frontend tiene

    try {
        const idLimit = Number(lastId) || 0;

        const eventos = await prisma.transaccion.findMany({
            where: {
                destinatarioId: Number(userId), // Solo lo que yo recibo
                tipo: 'envio_regalo',
                id: {
                    gt: idLimit // Traer solo eventos NUEVOS (ID mayor al último visto)
                }
            },
            orderBy: { id: 'asc' } // Orden cronológico
        });
        res.json(eventos);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json([]);
    }
}