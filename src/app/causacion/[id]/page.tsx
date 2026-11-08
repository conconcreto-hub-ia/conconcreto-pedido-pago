import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { Cifra, Contenedor, Insignia, SeccionEt, Tarjeta } from "@/components/ui";
import { IconoAlerta, IconoDocumento } from "@/components/iconos";
import { db } from "@/lib/db";
import { ESTADO_CAUSACION } from "@/lib/etiquetas";
import { fecha, nombrePropio, pesos, porMil, porciento } from "@/lib/formato";
import type { Retencion } from "@/lib/retenciones";
import type { Alerta } from "@/lib/cruce";

export const dynamic = "force-dynamic";

const ORDEN = { detenida: 0, revisar: 1, lista: 2 } as const;

export default async function Lote({ params }: { params: Promise<{ id: string }> }) {
  await exigirSesion();
  const { id } = await params;
  const lote = await db.lote.findUnique({ where: { id }, include: { facturas: { include: { causacion: true, proveedor: true, pedido: { include: { obra: true } } } } } });
  if (!lote) notFound();
  const facturas = [...lote.facturas].sort((a, b) => ORDEN[a.causacion?.estado ?? "lista"] - ORDEN[b.causacion?.estado ?? "lista"]);
  const listas = facturas.filter((f) => f.causacion?.estado === "lista");

  return (
    <>
      <Barra>
        <Contenedor className="pb-9 pt-7">
          <Link href="/causacion" className="text-[13px] font-semibold text-white/60 hover:text-white">← Causación</Link>
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight text-white sm:text-[34px]">{lote.nombre}</h1>
          <p className="mt-1 text-[14px] text-white/65">{fecha(lote.createdAt)} · cargado por {lote.creadoPor}</p>
          <div className="mt-6 flex flex-wrap gap-x-12 gap-y-5">
            <Cifra oscuro valor={facturas.length} rotulo="Facturas cruzadas" />
            <Cifra oscuro valor={listas.length} rotulo="Listas para causar" nota={`${pesos(listas.reduce((s, f) => s + (f.causacion?.neto ?? 0), 0))} neto a pagar`} />
            <Cifra oscuro valor={facturas.filter((f) => f.causacion?.estado === "detenida").length} rotulo="Detenidas antes de pagar" />
            <Cifra oscuro valor={facturas.filter((f) => f.causacion?.estado === "revisar").length} rotulo="Para revisar" />
          </div>
          {listas.length > 0 && <a href={`/api/lotes/${lote.id}/carga`} className="mt-6 inline-flex h-10 items-center gap-2 rounded-ctl bg-white/10 px-4 font-display text-[14px] font-semibold text-white hover:bg-white/15"><IconoDocumento />Carga para SAP (FB60 simulada)</a>}
        </Contenedor>
      </Barra>
      <Contenedor className="space-y-4 py-10">
        {facturas.map((f) => {
          const c = f.causacion!;
          const e = ESTADO_CAUSACION[c.estado];
          const ret = (c.retenciones as Retencion[]) ?? [];
          const alertas = ((c.alertas as Alerta[]) ?? []).filter((a) => a.tipo !== "cantidad" && a.tipo !== "precio" || c.estado !== "lista");
          const correo = c.correo as { para: string; asunto: string; cuerpo: string } | null;
          return (
            <Tarjeta key={f.id} className="overflow-hidden">
              <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2"><Link href={`/facturas/${f.id}`} className="font-mono text-[14px] font-semibold hover:underline">{f.numero}</Link><Insignia tono={e.tono} punto>{e.etiqueta}</Insignia>{c.municipioIca && <span className="text-[12.5px] text-tinta-3">ICA de {c.municipioIca}</span>}</div>
                  <div className="font-semibold">{f.proveedor ? nombrePropio(f.proveedor.razonSocial) : f.razonEmisor}</div>
                  <div className="text-[13px] text-tinta-2">{f.pedido ? `Pedido ${f.pedido.numero} · ${f.pedido.obra.nombre}` : `Pedido ${f.pedidoNumero ?? "—"} · no existe en S/4HANA`}</div>
                  {c.motivo && <p className="m-0 text-[13.5px] font-semibold text-rojo">{c.motivo}</p>}
                  <p className="m-0 text-[14px] text-tinta">{c.criterio}</p>
                  {alertas.length > 0 && <ul className="m-0 list-none space-y-1 p-0">{alertas.map((a, i) => <li key={i} className="flex gap-2 text-[12.5px] text-tinta-2"><IconoAlerta className="mt-0.5 size-3.5 shrink-0 text-[#8a5a00]" />{a.detalle}</li>)}</ul>}
                </div>
                <div className="rounded-ctl border border-linea bg-fondo p-3.5 text-[13px]">
                  <div className="flex justify-between"><span className="text-tinta-3">Subtotal</span><span className="num">{pesos(f.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-tinta-3">IVA</span><span className="num">{pesos(f.iva)}</span></div>
                  {ret.map((x) => <div key={x.clave} className="flex justify-between gap-2"><span className="text-tinta-3">{x.nombre}{x.porMil ? ` · ${porMil(x.porMil)}` : x.tarifa ? ` · ${porciento(x.tarifa)}` : ""}</span><span className="num">{x.valor ? `−${pesos(x.valor)}` : "—"}</span></div>)}
                  <div className="mt-1.5 flex justify-between border-t border-linea pt-1.5 font-semibold"><span>{c.estado === "lista" ? "Neto a pagar" : "Total factura"}</span><span className="num">{pesos(c.estado === "lista" ? c.neto : f.total)}</span></div>
                </div>
              </div>
              {correo && (
                <details className="border-t border-linea bg-fondo px-5 py-3">
                  <summary className="cursor-pointer font-display text-[13px] font-semibold text-verde-profundo">Correo redactado para {correo.para} · borrador, no sale solo</summary>
                  <div className="mt-2 text-[13px] font-semibold">{correo.asunto}</div>
                  <pre className="mt-1.5 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-tinta-2">{correo.cuerpo}</pre>
                </details>
              )}
            </Tarjeta>
          );
        })}
        <SeccionEt>Nada se cargó a SAP</SeccionEt>
        <p className="text-[13.5px] text-tinta-2">La carga es un Excel con el formato de la FB60 para que Cuentas por pagar la revise y la suba. Los correos de lo detenido son borradores.</p>
      </Contenedor>
    </>
  );
}
