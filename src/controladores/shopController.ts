// jhonp9/pw_otra_b/pw_otra_b-c8de98761eeb42f17684ef7afe1da3d572434c70/src/controladores/shopController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';
import { calcularNuevoNivel } from './userController'; // Importar helper

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

        // Lógica de nivel personalizada
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

        // Registrar transacción para overlay del streamer
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
        console.log(error)
        res.status(500).json({ msg: 'Error enviando regalo' });
    }
};

export const getMisEventos = async (req: Request, res: Response) => {
    const { userId } = req.body; 
    const { since } = req.query; 

    try {
        const eventos = await prisma.transaccion.findMany({
            where: {
                destinatarioId: userId,
                tipo: 'envio_regalo',
                fecha: {
                    gt: new Date(Number(since) || Date.now() - 5000) 
                }
            },
            orderBy: { fecha: 'asc' }
        });
        res.json(eventos);
    } catch (error) {
        res.status(500).json([]);
    }
}