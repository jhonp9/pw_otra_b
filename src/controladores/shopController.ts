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

        // 1. Descontar monedas y sumar XP al espectador
        const updatedUser = await prisma.usuario.update({
            where: { id: viewerId },
            data: {
                monedas: { decrement: regalo.costo },
                puntosXP: { increment: regalo.puntos }
            }
        });

        // 2. Calcular si el espectador sube de nivel (usando config del streamer)
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

        // 3. Registrar transacción (IMPORTANTE: Guardar destinatarioId para el overlay)
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

// Endpoint para que el Streamer consulte si recibió regalos recientemente
export const getMisEventos = async (req: Request, res: Response) => {
    const { userId } = req.body; 
    const { since } = req.query; 

    try {
        // Usamos un fallback seguro: si no envían 'since', buscamos eventos de los últimos 5 segundos
        const timestamp = Number(since);
        const fechaCorte = (!isNaN(timestamp) && timestamp > 0) 
            ? new Date(timestamp) 
            : new Date(Date.now() - 5000);

        const eventos = await prisma.transaccion.findMany({
            where: {
                destinatarioId: Number(userId),
                tipo: 'envio_regalo',
                fecha: {
                    gt: fechaCorte 
                }
            },
            orderBy: { fecha: 'asc' }
        });
        res.json(eventos);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json([]);
    }
}