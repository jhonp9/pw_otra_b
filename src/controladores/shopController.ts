// jhonp9/pw_otra_b/pw_otra_b-eb410fb86ee1e2f99aeca94d5e7031bc09cf3d3a/src/controladores/shopController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';

export const getRegalos = async (req: Request, res: Response) => {
    const regalos = await prisma.regalo.findMany();
    res.json(regalos);
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
    await prisma.regalo.delete({ where: { id: Number(id) } });
    res.json({ msg: 'Regalo eliminado' });
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

// REQ 19: Enviar regalo ahora registra destinatario para el overlay
export const enviarRegalo = async (req: Request, res: Response) => {
    const { viewerId, regaloId, streamerId } = req.body; // <--- Añadimos streamerId

    try {
        const viewer = await prisma.usuario.findUnique({ where: { id: viewerId } });
        const regalo = await prisma.regalo.findUnique({ where: { id: regaloId } });

        if (!viewer || !regalo) return res.status(404).json({ msg: 'Datos incorrectos' });
        if (viewer.monedas < regalo.costo) return res.status(400).json({ msg: 'Saldo insuficiente' });

        // Transacción atómica
        const updatedUser = await prisma.usuario.update({
            where: { id: viewerId },
            data: {
                monedas: { decrement: regalo.costo },
                puntosXP: { increment: regalo.puntos }
            }
        });

        // Calcular Nivel Espectador
        const nuevoNivel = Math.floor(updatedUser.puntosXP / 1000) + 1;
        let subioNivel = false;
        
        if (nuevoNivel > updatedUser.nivelEspectador) {
            await prisma.usuario.update({
                where: { id: viewerId },
                data: { nivelEspectador: nuevoNivel }
            });
            subioNivel = true;
        }

        // Registrar transacción con destinatario (Streamer)
        await prisma.transaccion.create({
            data: { 
                usuarioId: viewerId, 
                destinatarioId: streamerId ? Number(streamerId) : null, // <--- Importante
                monto: -regalo.costo, 
                tipo: 'envio_regalo', 
                detalle: `${viewer.nombre} envió ${regalo.nombre} ${regalo.icono}` 
            }
        });

        res.json({ success: true, monedas: updatedUser.monedas, xp: updatedUser.puntosXP, subioNivel, nivel: nuevoNivel });

    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Error enviando regalo' });
    }
};

// REQ 20: Polling para Overlay del Streamer
export const getMisEventos = async (req: Request, res: Response) => {
    const { userId } = req.body; // Viene del token middleware
    const { since } = req.query; // Timestamp

    try {
        const eventos = await prisma.transaccion.findMany({
            where: {
                destinatarioId: userId,
                tipo: 'envio_regalo',
                fecha: {
                    gt: new Date(Number(since)) // Buscar eventos después de X fecha
                }
            },
            orderBy: { fecha: 'asc' }
        });
        res.json(eventos);
    } catch (error) {
        res.status(500).json([]);
    }
}