import Link from "next/link";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { Contenedor, Encabezado, Insignia, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { TIPO_CASO } from "@/lib/etiquetas";
import type { TipoCaso } from "@prisma/client";
import { InterruptorEnvio } from "../controles";

export const dynamic = "force-dynamic";

// Un error real nunca sale solo (lo repite cambiarEnvioDirecto en el servidor).
const NUNCA: TipoCaso[] = ["ica_municipio_errado", "retencion_mal_calculada", "pedido_sin_liberar", "entrada_sin_registrar", "hes_sin_registrar", "hes_sin_aceptar", "no_identificado", "tarifa_por_validar"];

export default async function Reglas() {
  const yo = await exigirSesion();
  const reglas = new Map((await db.reglaEnvio.findMany()).map((r) => [r.tipo, r]));
  const admin = puede(yo.rol, "envio.configurar");
  return (
    <>
      <Barra />
      <Contenedor className="space-y-6 py-10">
        <Link href="/reclamos" className="text-[13px] font-semibold text-verde-profundo hover:underline">← Reclamos</Link>
        <Encabezado et="Reglas de envío" titulo="Qué puede salir sin aprobación" bajada="Todo nace apagado: los primeros casos los aprueba una persona. Cuando un tipo de caso se repita y el área confíe, el administrador lo prende. Aun prendido, solo sale directo si el remitente es el correo registrado del proveedor y el agente no dejó avisos. Los errores reales siempre los mira una persona." />
        <Tarjeta className="divide-y divide-linea-2">
          {(Object.keys(TIPO_CASO) as TipoCaso[]).map((tipo) => {
            const t = TIPO_CASO[tipo], r = reglas.get(tipo), nunca = NUNCA.includes(tipo);
            return (
              <div key={tipo} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{t.etiqueta}</span>{nunca && <Insignia tono="neutro">Siempre con aprobación</Insignia>}{r?.envioDirecto && <Insignia tono="verde">Envío directo</Insignia>}</div>
                  <div className="text-[13px] text-tinta-2">{t.detalle}{r?.actualizadoPor ? ` · último cambio: ${r.actualizadoPor}` : ""}</div>
                </div>
                {admin ? <InterruptorEnvio tipo={tipo} prendido={!!r?.envioDirecto} bloqueado={nunca && !r?.envioDirecto} /> : <span className="text-[13px] text-tinta-3">{r?.envioDirecto ? "Prendido" : "Apagado"}</span>}
              </div>
            );
          })}
        </Tarjeta>
        {!admin && <p className="text-[13px] text-tinta-3">Solo el administrador cambia estas reglas.</p>}
      </Contenedor>
    </>
  );
}
