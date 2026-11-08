import Link from "next/link";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { IconoCalculo, IconoFlecha } from "@/components/iconos";
import { db } from "@/lib/db";
import { fecha, pesos } from "@/lib/formato";
import type { ResultadoLote } from "@/lib/causacion";
import { FormLote } from "./controles";

export const dynamic = "force-dynamic";

export default async function Causacion() {
  const yo = await exigirSesion();
  const lotes = await db.lote.findMany({ include: { facturas: { include: { causacion: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <Barra />
      <Contenedor className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <Encabezado et="Causación preventiva" titulo="Lo que no cuadra se detiene antes de pagar" bajada="Cada factura se cruza contra el pedido, su liberación, la entrada o la HES y el maestro. El ICA va donde está la obra del pedido. Lo detenido sale con su correo redactado; nada se carga a SAP desde aquí." />
          {lotes.length ? lotes.map((l) => {
            const listas = l.facturas.filter((f) => f.causacion?.estado === "lista");
            const det = l.facturas.filter((f) => f.causacion?.estado === "detenida").length;
            const rev = l.facturas.filter((f) => f.causacion?.estado === "revisar").length;
            const neto = listas.reduce((s, f) => s + (f.causacion?.neto ?? 0), 0);
            const r = l.resumen as ResultadoLote | null;
            return (
              <Link key={l.id} href={`/causacion/${l.id}`} className="block">
                <Tarjeta viva className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="font-semibold">{l.nombre}</div>
                    <div className="text-[13px] text-tinta-3">{fecha(l.createdAt)} · {l.creadoPor} · {l.facturas.length} facturas{r?.repetidas?.length ? ` · ${r.repetidas.length} ya estaban` : ""}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Insignia tono="verde">{listas.length} listas · {pesos(neto)}</Insignia>
                      {det > 0 && <Insignia tono="rojo">{det} detenidas</Insignia>}
                      {rev > 0 && <Insignia tono="oro">{rev} para revisar</Insignia>}
                    </div>
                  </div>
                  <IconoFlecha className="size-4 text-tinta-3" />
                </Tarjeta>
              </Link>
            );
          }) : <Vacio icono={<IconoCalculo className="size-5" />} titulo="Todavía no hay lotes">Carga las facturas XML de la semana para cruzarlas antes de pagar.</Vacio>}
        </section>
        <aside>
          <Tarjeta className="p-5">
            <SeccionEt>Cruzar un lote</SeccionEt>
            <div className="mt-3">{puede(yo.rol, "causacion.correr") ? <FormLote /> : <p className="text-[13.5px] text-tinta-3">Tu rol ve los lotes pero no los causa.</p>}</div>
          </Tarjeta>
        </aside>
      </Contenedor>
    </>
  );
}
