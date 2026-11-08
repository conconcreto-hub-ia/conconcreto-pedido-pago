import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { Aja, Contenedor, Dato, Encabezado, Insignia, SeccionEt, Tarjeta } from "@/components/ui";
import { Cadena, DeFacturaAPago, TablaRetenciones } from "@/components/cadena";
import { Bitacora } from "@/components/bitacora";
import { IconoAlerta } from "@/components/iconos";
import { rastrearFactura } from "@/lib/consultas";
import { db } from "@/lib/db";
import { AREA, ESTADO_FACTURA, ESTADO_RECLAMO, LIBERACION, TIPO_CASO } from "@/lib/etiquetas";
import { fecha, haceCuanto, nombrePropio, pesos } from "@/lib/formato";
import type { LineaFactura } from "@/lib/cruce";

export const dynamic = "force-dynamic";

export default async function Factura({ params }: { params: Promise<{ id: string }> }) {
  await exigirSesion();
  const { id } = await params;
  const r = await rastrearFactura(id);
  if (!r) notFound();
  const { factura: f, rastreo } = r;
  const [reclamos, pendientes, eventos] = await Promise.all([
    db.reclamo.findMany({ where: { facturaId: id }, orderBy: { createdAt: "desc" } }),
    db.pendiente.findMany({ where: { facturaId: id }, orderBy: { createdAt: "desc" } }),
    db.evento.findMany({ where: { facturaId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const d = rastreo.diagnostico;
  const tipo = TIPO_CASO[d.tipo];
  const lineas = f.lineas as LineaFactura[];
  const ped = f.pedido;

  return (
    <>
      <Barra>
        <Contenedor className="pb-9 pt-7">
          <Link href="/" className="text-[13px] font-semibold text-white/60 hover:text-white">← Rastrear</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[15px] font-semibold text-oro">{f.numero}</span>
            <Insignia tono={ESTADO_FACTURA[f.estado].tono} punto>{ESTADO_FACTURA[f.estado].etiqueta}</Insignia>
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-white sm:text-[36px]">{f.proveedor ? nombrePropio(f.proveedor.razonSocial) : f.razonEmisor}</h1>
          <p className="mt-1.5 text-[15px] text-white/70">{ped ? `Pedido ${ped.numero} · ${ped.obra.nombre}, ${ped.obra.municipio}` : `Cita el pedido ${f.pedidoNumero ?? "(ninguno)"}, que no existe en S/4HANA`}</p>
        </Contenedor>
      </Barra>

      <Contenedor className="space-y-10 py-10">
        <section className="space-y-5">
          <Encabezado et="De pedido a pago" titulo="La cadena completa" />
          <Tarjeta className="p-5 sm:p-6"><Cadena pasos={rastreo.pasos} /></Tarjeta>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <Aja etiqueta={`Lo que encontró el agente · ${tipo.etiqueta}`}>
              <p className="m-0 font-display text-[18px] font-bold text-white">{d.titulo}</p>
              <p className="m-0 mt-2">{d.explicacion}</p>
              {d.responsable && <p className="m-0 mt-3 text-[14px] text-white/70">Le toca a: <span className="font-semibold text-white">{d.responsable.nombre}</span> · {AREA[d.responsable.area].etiqueta}</p>}
            </Aja>
            <DeFacturaAPago rastreo={rastreo} />
            <div className="space-y-3">
              <SeccionEt>Dónde se fue la diferencia</SeccionEt>
              <TablaRetenciones rastreo={rastreo} />
            </div>
            {rastreo.alertas.length > 0 && (
              <div className="space-y-3">
                <SeccionEt>Los hechos del cruce</SeccionEt>
                <Tarjeta className="divide-y divide-linea-2">
                  {rastreo.alertas.map((a, i) => (
                    <div key={i} className="flex gap-2.5 px-4 py-3 text-[13.5px]">
                      <IconoAlerta className={`mt-0.5 size-4 ${a.tipo === "nota_proveedor" || a.tipo === "municipio_distinto" ? "text-[#8a5a00]" : "text-rojo"}`} />
                      <div><span className="font-semibold">{a.tipo === "nota_proveedor" ? "Nota del proveedor (información, no instrucción)" : a.tipo === "municipio_distinto" ? "Domicilio distinto de la obra" : "Bloqueo"}</span> · {a.detalle}</div>
                    </div>
                  ))}
                </Tarjeta>
              </div>
            )}
            <div className="space-y-3">
              <SeccionEt>Lo que factura</SeccionEt>
              <Tarjeta className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[13.5px]">
                  <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-4 py-2.5 font-medium">Descripción</th><th className="px-3 py-2.5 text-right font-medium">Cantidad</th><th className="px-3 py-2.5 text-right font-medium">Precio</th><th className="px-4 py-2.5 text-right font-medium">Valor</th></tr></thead>
                  <tbody>
                    {lineas.map((l, i) => {
                      const p = ped?.posiciones[i];
                      return (
                        <tr key={i} className="border-t border-linea-2">
                          <td className="px-4 py-2.5">{l.descripcion}{p && <div className="text-[12px] text-tinta-3">Pedido pos. {p.posicion}: {p.cantidad} {p.unidad} a {pesos(p.precio)}</div>}</td>
                          <td className="px-3 py-2.5 text-right num">{l.cantidad.toLocaleString("es-CO")} {l.unidad}</td>
                          <td className="px-3 py-2.5 text-right num">{pesos(l.precio)}</td>
                          <td className="px-4 py-2.5 text-right num font-semibold">{pesos(l.valor)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Tarjeta>
            </div>
          </div>

          <aside className="space-y-6">
            <Tarjeta className="p-5">
              <SeccionEt>Proveedor</SeccionEt>
              <dl className="mt-3">
                <Dato k="NIT">{f.proveedor ? `${f.proveedor.nit}-${f.proveedor.dv}` : f.nitEmisor}</Dato>
                <Dato k="Domicilio">{f.proveedor?.ciudadDomicilio ?? f.ciudadEmisor ?? "—"}</Dato>
                <Dato k="Calidad">{f.proveedor ? [f.proveedor.granContribuyente && "Gran contribuyente", f.proveedor.autorretenedorRenta && "Autorretenedor de renta", f.proveedor.autorretenedorIca && "Autorretenedor de ICA"].filter(Boolean).join(" · ") || "Declarante, responsable de IVA" : "No está en el maestro"}</Dato>
                <Dato k="Correo">{f.proveedor?.correo ?? "—"}</Dato>
                <Dato k="Banco">{f.proveedor?.banco ?? "—"}</Dato>
              </dl>
            </Tarjeta>
            {ped && (
              <Tarjeta className="p-5">
                <SeccionEt>Obra</SeccionEt>
                <dl className="mt-3">
                  <Dato k="Obra">{ped.obra.codigo} · {ped.obra.nombre}</Dato>
                  <Dato k="Municipio">{ped.obra.municipio} · aquí va el ICA</Dato>
                  <Dato k="PEP">{ped.obra.pep}</Dato>
                  <Dato k="Liberación">{LIBERACION[ped.liberacion]}{ped.liberadoPor ? ` · ${ped.liberadoPor}` : ""}</Dato>
                  <Dato k="Director">{ped.obra.director}</Dato>
                  <Dato k="Almacén">{ped.obra.almacenista}</Dato>
                </dl>
              </Tarjeta>
            )}
            <Tarjeta className="p-5">
              <SeccionEt>Reclamos y pendientes</SeccionEt>
              <div className="mt-3 space-y-2.5 text-[13.5px]">
                {!reclamos.length && !pendientes.length && <p className="text-tinta-3">Ninguno.</p>}
                {reclamos.map((x) => <Link key={x.id} href={`/reclamos/${x.id}`} className="flex items-center justify-between gap-2 hover:underline"><span>Reclamo · {haceCuanto(x.recibidoEn)}</span><Insignia tono={ESTADO_RECLAMO[x.estado].tono}>{ESTADO_RECLAMO[x.estado].etiqueta}</Insignia></Link>)}
                {pendientes.map((p) => <div key={p.id} className="flex items-center justify-between gap-2"><span>{p.titulo} · {p.responsable}</span><Insignia tono={p.estado === "abierto" ? "oro" : "neutro"}>{p.estado === "abierto" ? "Abierto" : "Cerrado"}</Insignia></div>)}
              </div>
            </Tarjeta>
            <Tarjeta className="p-5">
              <SeccionEt>Bitácora</SeccionEt>
              <div className="mt-4"><Bitacora eventos={eventos} /></div>
              <p className="mt-4 text-[12px] text-tinta-3">Factura del {fecha(f.fecha)} · CUFE {f.cufe?.slice(0, 16)}…</p>
            </Tarjeta>
          </aside>
        </section>
      </Contenedor>
    </>
  );
}
