import Link from "next/link";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { IconoLista } from "@/components/iconos";
import { db } from "@/lib/db";
import { AREA } from "@/lib/etiquetas";
import { fechaHora, haceCuanto } from "@/lib/formato";
import { CerrarPendiente } from "./cerrar";

export const dynamic = "force-dynamic";

export default async function Pendientes() {
  const yo = await exigirSesion();
  const todos = await db.pendiente.findMany({ include: { factura: true, reclamo: { select: { id: true, estado: true } } }, orderBy: { createdAt: "desc" } });
  const abiertos = todos.filter((p) => p.estado === "abierto");
  const porResponsable = new Map<string, typeof abiertos>();
  for (const p of abiertos) porResponsable.set(p.responsable, [...(porResponsable.get(p.responsable) ?? []), p]);
  const cerrar = puede(yo.rol, "pendientes.cerrar");
  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10">
        <Encabezado et="Pendientes por responsable" titulo={abiertos.length ? `${abiertos.length} abiertos` : "Nada pendiente"} bajada="Cuando el rastreo encuentra un error real —un pedido sin liberar, una entrada sin registrar, una retención mal calculada— el agente no lo arregla: se lo deja a quien le toca. El aviso por correo sale cuando una persona aprueba la respuesta al proveedor." />
        {!abiertos.length && <Vacio icono={<IconoLista className="size-5" />} titulo="Nadie tiene pendientes">Aparecen aquí cuando un reclamo destapa un error en la cadena.</Vacio>}
        {[...porResponsable.entries()].map(([quien, lista]) => (
          <section key={quien} className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-2"><h3 className="text-[18px] font-bold">{quien}</h3><span className="text-[13px] text-tinta-3">{quien !== AREA[lista[0].area].etiqueta ? `${AREA[lista[0].area].etiqueta} · ` : ""}{lista[0].correo}</span></div>
            {lista.map((p) => (
              <Tarjeta key={p.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-[760px]">
                    <div className="font-semibold">{p.titulo}</div>
                    <p className="m-0 mt-1 text-[13.5px] text-tinta-2">{p.detalle}</p>
                    <p className="m-0 mt-2 text-[12.5px] text-tinta-3">
                      {haceCuanto(p.createdAt)}{p.factura && <> · <Link href={`/facturas/${p.factura.id}`} className="font-semibold text-verde-profundo hover:underline">{p.factura.numero}</Link></>}
                      {p.reclamo && <> · <Link href={`/reclamos/${p.reclamo.id}`} className="font-semibold text-verde-profundo hover:underline">reclamo</Link></>}
                      {" · "}{p.avisoId ? `aviso enviado ${p.avisadoEn ? fechaHora(p.avisadoEn) : ""}` : "aviso pendiente de aprobación o retenido (modo prueba)"}
                    </p>
                  </div>
                  {cerrar && <CerrarPendiente id={p.id} />}
                </div>
              </Tarjeta>
            ))}
          </section>
        ))}
        {todos.some((p) => p.estado === "cerrado") && (
          <section className="space-y-3">
            <SeccionEt>Cerrados</SeccionEt>
            {todos.filter((p) => p.estado === "cerrado").map((p) => (
              <Tarjeta key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4 opacity-75">
                <div><div className="font-semibold">{p.titulo}</div><div className="text-[12.5px] text-tinta-3">{p.responsable} · cerró {p.cerradoPor}{p.nota ? `: ${p.nota}` : ""}</div></div>
                <Insignia tono="neutro">Cerrado</Insignia>
              </Tarjeta>
            ))}
          </section>
        )}
      </Contenedor>
    </>
  );
}
