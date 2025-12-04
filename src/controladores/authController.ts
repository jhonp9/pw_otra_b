import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db';

export const register = async (req: Request, res: Response) => {
    try {
        const { nombre, email, password, rol } = req.body;
        const userExists = await prisma.usuario.findUnique({ where: { email } });
        if (userExists) return res.status(400).json({ msg: 'El usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await prisma.usuario.create({
            data: { 
                nombre, 
                email, 
                password: hash, 
                rol: rol || 'espectador' // Por defecto espectador
            }
        });

        res.status(201).json({ msg: 'Usuario creado', userId: newUser.id });
    } catch (error) {
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.usuario.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ msg: 'Credenciales inválidas' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ msg: 'Credenciales inválidas' });

        const token = jwt.sign(
            { id: user.id, rol: user.rol }, 
            process.env.JWT_SECRET || 'secret', 
            { expiresIn: '8h' }
        );

        // Excluir password del objeto retornado
        const { password: _, ...userData } = user;
        res.json({ token, user: userData });
    } catch (error) {
        res.status(500).json({ msg: 'Error al iniciar sesión' });
    }
};