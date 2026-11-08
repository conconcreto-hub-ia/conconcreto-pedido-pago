import Link from "next/link";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta } from "@/components/ui";
import { db } from "@/lib/db";
import { ESTADO_FACTURA } from "@/lib/etiquetas";
import { fecha, nombrePropio, pesos } from "@/lib/formato";
import type { Retencion } from "@/lib/retenciones";

export const dynamic = "force-dynamic";

export default async function Pagos() {
  await exigirSesion();
  const [pagos, sinPagar] = await Promise.all([
    db.pago.findMany({ include: { factura: { include: { proveedor: true, pedido: { include: { obra: true } } } } }, orderBy: { fecha: "desc" } }),
    db.factura.findMany({ where: { estado: { in: ["causada", "detenida", "revisar", "recibida"] } }, include: { proveedor: true, causacion: true }, orderBy: { vence: "asc" } }),
  ]);
  return (
    <>
      <Barra />
      <Contenedor className="space-y-10 py-10">
        <section className="space-y-4">
          <Encabezado et="Tesorería" titulo="Lo que se pagó y lo que retuvo cada pago" bajada="El registro de pagos del extracto. Cada pago muestra las retenciones que se aplicaron de verdad: es lo que el rastreador compara contra el recálculo." />
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-4 py-2.5 font-medium">Fecha</th><th className="px-3 py-2.5 font-medium">Factura · proveedor</th><th className="px-3 py-2.5 text-right font-medium">Factura</th><th className="px-3 py-2.5 font-medium">Retenciones aplicadas</th><th className="px-3 py-2.5 text-right font-medium">Pagado</th><th className="px-4 py-2.5 font-medium">Banco · comprobante</th></tr></thead>
              <tbody>
                {pagos.map((p) => {
                  const ret = (p.retenciones as Retencion[]).filter((x) => x.valor > 0);
                  return (
                    <tr key={p.id} className="border-t border-linea-2 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">{fecha(p.fecha)}</td>
                      <td className="px-3 py-3"><Link href={`/facturas/${p.facturaId}`} className="font-mono font-semibold hover:underline">{p.factura.numero}</Link><div className="text-[12.5px] text-tinta-2">{p.factura.proveedor ? nombrePropio(p.factura.proveedor.razonSocial) : p.factura.razonEmisor}</div><div className="text-[12px] text-tinta-3">{p.factura.pedido?.obra.nombre}</div></td>
                      <td className="px-3 py-3 text-right num">{pesos(p.factura.total)}</td>
                      <td className="px-3 py-3 text-[12.5px] text-tinta-2">{ret.length ? ret.map((x) => <div key={x.clave}>{x.nombre}: <span className="num font-semibold text-tinta">{pesos(x.valor)}</span></div>) : "Ninguna"}</td>
                      <td className="px-3 py-3 text-right num font-bold">{pesos(p.valorPagado)}</td>
                      <td className="px-4 py-3 text-[12.5px]">{p.banco}<div className="font-mono text-tinta-3">{p.referencia}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Tarjeta>
        </section>
        <section className="space-y-3">
          <SeccionEt>Sin pagar</SeccionEt>
          <Tarjeta className="divide-y divide-linea-2">
            {sinPagar.map((f) => (
              <Link key={f.id} href={`/facturas/${f.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-fondo">
                <div className="min-w-0"><span className="font-mono font-semibold">{f.numero}</span> <span className="text-tinta-2">· {f.proveedor ? nombrePropio(f.proveedor.razonSocial) : f.razonEmisor}</span><div className="text-[12.5px] text-tinta-3">{f.causacion?.motivo ?? (f.vence ? `vence el ${fecha(f.vence)}` : "")}</div></div>
                <div className="flex items-center gap-3"><span className="num font-semibold">{pesos(f.estado === "causada" ? f.causacion?.neto : f.total)}</span><Insignia tono={ESTADO_FACTURA[f.estado].tono}>{ESTADO_FACTURA[f.estado].etiqueta}</Insignia></div>
              </Link>
            ))}
          </Tarjeta>
        </section>
      </Contenedor>
    </>
  );
}
