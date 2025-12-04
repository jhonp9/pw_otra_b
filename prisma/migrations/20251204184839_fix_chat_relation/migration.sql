-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
