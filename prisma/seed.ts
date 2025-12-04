// backend/prisma/seed.ts

import { PrismaClient } from '@prisma/client/extension';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Constructor vacío
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando Seed...");

  // Limpiar base de datos
  await prisma.transaccion.deleteMany();
  await prisma.stream.deleteMany();
  await prisma.regalo.deleteMany();
  await prisma.usuario.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('123456', salt);

  // 1. Crear Streamer Principal
  await prisma.usuario.create({
    data: {
      nombre: 'AdminStream',
      email: 'streamer@test.com',
      password: passwordHash,
      rol: 'streamer',
      monedas: 1000,
      horasStream: 10.5,
      nivelStreamer: 2
    }
  });

  // 2. Crear Espectador de prueba
  await prisma.usuario.create({
    data: {
      nombre: 'ViewerFan',
      email: 'viewer@test.com',
      password: passwordHash,
      rol: 'espectador',
      monedas: 500,
      puntosXP: 150,
      nivelEspectador: 1
    }
  });

  // 3. Crear Regalos Globales
  await prisma.regalo.createMany({
    data: [
      { nombre: 'GG', costo: 10, puntos: 5, icono: '👾' },
      { nombre: 'Corazón', costo: 50, puntos: 25, icono: '💖' },
      { nombre: 'Fuego', costo: 100, puntos: 60, icono: '🔥' },
      { nombre: 'Diamante', costo: 500, puntos: 300, icono: '💎' },
    ]
  });

  console.log('✅ Seed completado correctamente.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());