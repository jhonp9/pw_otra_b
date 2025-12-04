-- AlterTable
ALTER TABLE "Transaccion" ADD COLUMN     "destinatarioId" INTEGER;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
