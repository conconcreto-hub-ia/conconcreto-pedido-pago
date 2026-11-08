import Link from "next/link";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { Cifra, Contenedor, Encabezado, Insignia, Tarjeta, Vacio, Boton } from "@/components/ui";
import { IconoBuscar, IconoFlecha } from "@/components/iconos";
import { db } from "@/lib/db";
import { buscar } from "@/lib/consultas";
import { ESTADO_FACTURA } from "@/lib/etiquetas";
import { copCorto, fecha, pesos, nombrePropio } from "@/lib/formato";


export const dynamic = "force-dynamic";

type FilaFactura = Awaited<ReturnType<typeof buscar>>[number];

function Fila({ f }: { f: FilaFactura }) {
  const e = ESTADO_FACTURA[f.estado];
  const pagado = f.pagos[0]?.valorPagado;
  return (
    <Link href={`/facturas/${f.id}`} className="block">
      <Tarjeta viva className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_150px_150px_110px] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-tinta-3">
            <span className="font-mono text-[13px] font-semibold text-tinta">{f.numero}</span>
            <span>·</span><span>pedido {f.pedidoNumero ?? "—"}</span>
            <span>·</span><span>NIT {f.nitEmisor}</span>
          </div>
          <div className="mt-1 truncate font-semibold">{f.proveedor ? nombrePropio(f.proveedor.razonSocial) : f.razonEmisor}</div>
          <div className="truncate text-[13px] text-tinta-2">{f.pedido ? `${f.pedido.obra.nombre} · ${f.pedido.obra.municipio}` : "Sin pedido en S/4HANA"}</div>
        </div>
        <div><div className="num text-[16px] font-extrabold">{pesos(f.total)}</div><div className="text-[12px] text-tinta-3">factura · {fecha(f.fecha)}</div></div>
        <div><div className="num text-[16px] font-extrabold">{pagado ? pesos(pagado) : "—"}</div><div className="text-[12px] text-tinta-3">pagado</div></div>
        <div className="flex items-center justify-between gap-2 sm:justify-end"><Insignia tono={e.tono} punto>{e.etiqueta}</Insignia><IconoFlecha className="size-4 text-tinta-3" /></div>
      </Tarjeta>
    </Link>
  );
}

export default async function Rastrear({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirSesion();
  const { q } = await searchParams;
  const [resultados, recientes, porAprobar, pendientes, detenidas, pagos] = await Promise.all([
    q ? buscar(q) : Promise.resolve([] as FilaFactura[]),
    q ? Promise.resolve([] as FilaFactura[]) : db.factura.findMany({ include: { proveedor: true, pedido: { include: { obra: true } }, pagos: true }, orderBy: { fecha: "desc" }, take: 12 }),
    db.reclamo.count({ where: { estado: "por_aprobar" } }),
    db.pendiente.count({ where: { estado: "abierto" } }),
    db.factura.count({ where: { estado: { in: ["detenida", "revisar"] } } }),
    db.pago.aggregate({ _sum: { valorPagado: true }, where: { fecha: { gte: new Date(Date.now() - 31 * 86_400_000) } } }),
  ]);

  return (
    <>
      <Barra>
        <Contenedor className="pb-10 pt-8">
          <div className="flex flex-wrap items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[.08em] text-white/75"><span className="punto-vivo" />Pedido · liberación · entrada · causación · pago</div>
          <h1 className="mt-4 max-w-[880px] text-[34px] font-extrabold leading-[1.08] text-white sm:text-[44px]">¿Por qué le pagamos <span className="dorado">90 si eran 100?</span></h1>
          <form action="/" className="mt-7 flex max-w-[720px] flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="q">NIT, factura o pedido</label>
            <div className="relative flex-1">
              <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tinta-3" />
              <input id="q" name="q" defaultValue={q ?? ""} placeholder="NIT del proveedor, número de factura o de pedido" className="h-12 w-full rounded-ctl border border-white/15 bg-white pl-10 pr-3 text-[15px] text-tinta outline-none focus:border-oro" />
            </div>
            <Boton type="submit" variante="primario" className="h-12">Rastrear</Boton>
          </form>
          <div className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
            <Cifra oscuro valor={porAprobar} rotulo="Respuestas por aprobar" />
            <Cifra oscuro valor={pendientes} rotulo="Pendientes abiertos" nota="almacén, obra, dirección, CxP" />
            <Cifra oscuro valor={detenidas} rotulo="Facturas detenidas o por revisar" />
            <Cifra oscuro valor={copCorto(pagos._sum.valorPagado ?? 0)} rotulo="Pagado en los últimos 31 días" />
          </div>
        </Contenedor>
      </Barra>

      <Contenedor className="space-y-5 py-10">
        {q ? (
          <>
            <Encabezado et="Resultado" titulo={resultados.length ? `${resultados.length} ${resultados.length === 1 ? "factura" : "facturas"} para «${q}»` : `Nada para «${q}»`} bajada="Abre una para ver la cadena completa, el recálculo de las retenciones y dónde se fue la diferencia." />
            {resultados.length ? <div className="space-y-2.5">{resultados.map((f) => <Fila key={f.id} f={f} />)}</div> : (
              <Vacio icono={<IconoBuscar className="size-5" />} titulo="No encontré esa factura">Prueba con el NIT sin dígito de verificación (901377219), el número como lo escribe el proveedor (LAD-1021) o el pedido (4500128942).</Vacio>
            )}
          </>
        ) : (
          <>
            <Encabezado et="Las últimas facturas" titulo="Busca por NIT, factura o pedido" bajada="O abre una de las recientes. El rastreo sale del extracto de S/4HANA: el agente no carga nada en SAP ni ejecuta pagos." />
            <div className="space-y-2.5">{recientes.map((f) => <Fila key={f.id} f={f} />)}</div>
          </>
        )}
      </Contenedor>
    </>
  );
}
