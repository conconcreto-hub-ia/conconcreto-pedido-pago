import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { Contenedor, Encabezado, Tarjeta } from "@/components/ui";
import { Bitacora } from "@/components/bitacora";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PaginaBitacora() {
  await exigirSesion();
  const eventos = await db.evento.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <Barra />
      <Contenedor className="space-y-6 py-10">
        <Encabezado et="Bitácora" titulo="Todo lo que hizo el agente y cada persona" bajada="Qué leyó, qué rastreó, qué redactó, quién aprobó y qué salió. Firmado con el nombre de quien aprobó o cambió algo." />
        <Tarjeta className="p-6"><Bitacora eventos={eventos} /></Tarjeta>
      </Contenedor>
    </>
  );
}
