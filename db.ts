// backend/src/db.ts
import { PrismaClient } from '@prisma/client';

// Sin argumentos, lee automáticamente el .env gracias al schema.prisma
export const prisma = new PrismaClient();