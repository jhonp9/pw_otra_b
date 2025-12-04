import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './rutas/authRoutes';
import userRoutes from './rutas/userRoutes';
import streamRoutes from './rutas/streamRoutes';
import shopRoutes from './rutas/shopRoutes';
import chatRoutes from './rutas/chatRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas Modulares
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
});