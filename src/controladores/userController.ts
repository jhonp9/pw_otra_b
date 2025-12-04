// jhonp9/pw_otra_b/pw_otra_b-c8de98761eeb42f17684ef7afe1da3d572434c70/src/controladores/userController.ts
import { Request, Response } from 'express';
import { prisma } from '../../db';

// Helper para calcular nivel basado en config personalizada
export const calcularNuevoNivel = (xpActual: number, nivelActual: number, configJson: string) => {
    let config: Record<string, number> = {};
    try {
        config = JSON.parse(configJson);
    } catch (e) {
        config = {};
    }

    // Buscar si existe un requisito para el siguiente nivel
    const siguienteNivel = nivelActual + 1;
    const xpNecesaria = config[siguienteNivel.toString()];

    // Si hay configuración personalizada para el siguiente nivel
    if (xpNecesaria !== undefined) {
        if (xpActual >= xpNecesaria) return siguienteNivel;
        return nivelActual;
    } 
    
    // Fallback lineal (por si no hay config para ese nivel): cada 1000 XP
    // Pero si el usuario pidió explícitamente configurar, esto solo aplica si no hay regla.
    const nivelLineal = Math.floor(xpActual / 1000) + 1;
    return Math.max(nivelActual, nivelLineal);
};

export const getUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) return res.status(400).json({ msg: 'ID inválido' });

    const user = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if(user) {
        const { password, ...resto } = user;
        res.json(resto);
    } else {
        res.status(404).json({msg: 'Usuario no encontrado'});
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    const { userId, configNiveles } = req.body; // Recibe objeto JSON stringificado o objeto
    try {
        const configString = typeof configNiveles === 'string' ? configNiveles : JSON.stringify(configNiveles);
        
        await prisma.usuario.update({
            where: { id: Number(userId) },
            data: { configNiveles: configString }
        });
        res.json({ msg: 'Configuración actualizada', config: configString });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error actualizando config' });
    }
};

export const addChatXp = async (req: Request, res: Response) => {
    const { userId, streamerId } = req.body; 
    
    const idUsuario = Number(userId);
    const idStreamer = Number(streamerId);

    if (!idUsuario) return res.status(400).json({ error: 'ID inválido' });

    try {
        const user = await prisma.usuario.findUnique({ where: { id: idUsuario } });
        const streamer = await prisma.usuario.findUnique({ where: { id: idStreamer } }); // Obtener config del streamer
        
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        const updatedUser = await prisma.usuario.update({
            where: { id: idUsuario },
            data: { puntosXP: { increment: 1 } }
        });
        
        // Usar la configuración del STREAMER para calcular el nivel del ESPECTADOR
        const configNiveles = streamer?.configNiveles || "{}";
        const nuevoNivel = calcularNuevoNivel(updatedUser.puntosXP, user.nivelEspectador, configNiveles);
        
        let subioNivel = false;
        if (nuevoNivel > user.nivelEspectador) {
            await prisma.usuario.update({
                where: { id: idUsuario },
                data: { nivelEspectador: nuevoNivel }
            });
            subioNivel = true;
        }

        res.json({ ok: true, xp: updatedUser.puntosXP, nivel: nuevoNivel, subioNivel });
    } catch(e) {
        res.status(500).json({ error: 'Error interno' });
    }
};