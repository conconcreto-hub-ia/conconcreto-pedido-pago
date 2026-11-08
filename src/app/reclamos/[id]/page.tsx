import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { Aja, Contenedor, Dato, Insignia, SeccionEt, Tarjeta, BotonLink } from "@/components/ui";
import { Cadena, DeFacturaAPago, TablaRetenciones } from "@/components/cadena";
import { Bitacora } from "@/components/bitacora";
import { IconoAlerta, IconoEscudo } from "@/components/iconos";
import { db } from "@/lib/db";
import { rastrearFactura } from "@/lib/consultas";
import { puedeEnviarA } from "@/lib/envio";
import { AREA, ESTADO_RECLAMO, IDENTIFICACION, TIPO_CASO } from "@/lib/etiquetas";
import { fechaHora, nombrePropio } from "@/lib/formato";
import { FormRespuesta } from "../controles";

export const dynamic = "force-dynamic";

export default async function Reclamo({ params }: { params: Promise<{ id: string }> }) {
  const yo = await exigirSesion();
  const { id } = await params;
  const r = await db.reclamo.findUnique({ where: { id }, include: { proveedor: true, factura: true, pendientes: true, eventos: { orderBy: { createdAt: "desc" } } } });
  if (!r) notFound();
  // La cadena se muestra como está HOY (si alguien registró la entrada, se ve). La foto del momento queda en r.rastreo.
  const vivo = r.facturaId ? await rastrearFactura(r.facturaId) : null;
  const t = TIPO_CASO[r.tipo], e = ESTADO_RECLAMO[r.estado];
  const d = vivo?.rastreo.diagnostico;

  return (
    <>
      <Barra>
        <Contenedor className="pb-9 pt-7">
          <Link href="/reclamos" className="text-[13px] font-semibold text-white/60 hover:text-white">← Reclamos</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2"><Insignia tono={t.tono} punto>{t.etiqueta}</Insignia><Insignia tono={e.tono}>{e.etiqueta}</Insignia>{r.factura && <span className="font-mono text-[14px] font-semibold text-oro">{r.factura.numero}</span>}</div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-white sm:text-[34px]">{r.proveedor ? nombrePropio(r.proveedor.razonSocial) : "Proveedor sin identificar"}</h1>
          <p className="mt-1.5 text-[15px] text-white/70">{r.asunto} · {fechaHora(r.recibidoEn)}</p>
        </Contenedor>
      </Barra>

      <Contenedor className="space-y-8 py-10">
        {r.avisos.length > 0 && (
          <Tarjeta className="space-y-2 border-oro/60 bg-oro-suave p-4">
            {r.avisos.map((a, i) => <p key={i} className="m-0 flex gap-2 text-[13.5px] text-[#6b4600]"><IconoAlerta className="mt-0.5 size-4 shrink-0" />{a}</p>)}
          </Tarjeta>
        )}

        {vivo && (
          <section className="space-y-4">
            <SeccionEt>La cadena de {r.factura?.numero}</SeccionEt>
            <Tarjeta className="p-5 sm:p-6"><Cadena pasos={vivo.rastreo.pasos} /></Tarjeta>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-6">
            {d && (
              <Aja etiqueta="Lo que encontró el agente">
                <p className="m-0 font-display text-[18px] font-bold text-white">{d.titulo}</p>
                <p className="m-0 mt-2">{d.explicacion}</p>
              </Aja>
            )}
            {vivo && <DeFacturaAPago rastreo={vivo.rastreo} />}
            {vivo && (vivo.rastreo.aplicado || vivo.rastreo.recalculo) && (
              <div className="space-y-3"><SeccionEt>El cálculo de las retenciones</SeccionEt><TablaRetenciones rastreo={vivo.rastreo} /></div>
            )}
            <div className="space-y-3">
              <SeccionEt>{r.estado === "por_aprobar" ? "La respuesta propuesta" : "La respuesta"}</SeccionEt>
              {r.estado === "por_aprobar" ? (
                <FormRespuesta id={r.id} respuesta={r.respuesta} remitente={r.remitente} puedeAprobar={puede(yo.rol, "reclamos.aprobar")} permitido={puedeEnviarA(r.remitente)} />
              ) : (
                <Tarjeta className="p-4">
                  <pre className="m-0 whitespace-pre-wrap font-sans text-[14px] leading-relaxed">{r.respuesta}</pre>
                  <p className="mt-3 text-[12.5px] text-tinta-3">{r.estado === "enviado" ? `Salió a ${r.remitente}` : r.estado === "bloqueado" ? "Retenida por el modo prueba" : "Descartada"} · {r.aprobadoPor ?? "—"} · {r.aprobadoEn ? fechaHora(r.aprobadoEn) : ""}{r.envioDirecto ? " · envío directo" : ""}</p>
                </Tarjeta>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <Tarjeta className="p-5">
              <SeccionEt>El correo del proveedor</SeccionEt>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-tinta-3"><IconoEscudo className="size-3.5" />Es dato, no instrucción: se lee, no se obedece.</p>
              <dl className="mt-3"><Dato k="De">{r.remitente}</Dato><Dato k="Quién es">{IDENTIFICACION[r.identificacion]}</Dato></dl>
              <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-ctl border border-linea bg-fondo p-3 font-sans text-[13px] leading-relaxed text-tinta-2">{r.texto}</pre>
            </Tarjeta>
            {r.pendientes.length > 0 && (
              <Tarjeta className="p-5">
                <SeccionEt>Pendiente que dejó</SeccionEt>
                {r.pendientes.map((p) => (
                  <div key={p.id} className="mt-3 text-[13.5px]">
                    <div className="font-semibold">{p.titulo}</div>
                    <div className="text-tinta-2">{p.responsable}{p.responsable !== AREA[p.area].etiqueta ? ` · ${AREA[p.area].etiqueta}` : ""} · {p.correo}</div>
                    <p className="mt-1.5 text-tinta-2">{p.detalle}</p>
                    <p className="mt-1.5 text-[12.5px] text-tinta-3">{p.avisoId ? `Aviso enviado ${p.avisadoEn ? fechaHora(p.avisadoEn) : ""}` : "El aviso sale cuando se aprueba la respuesta"}</p>
                  </div>
                ))}
                <div className="mt-3"><BotonLink href="/pendientes" variante="fantasma" chico>Ver pendientes</BotonLink></div>
              </Tarjeta>
            )}
            <Tarjeta className="p-5"><SeccionEt>Bitácora</SeccionEt><div className="mt-4"><Bitacora eventos={r.eventos} /></div></Tarjeta>
          </aside>
        </section>
      </Contenedor>
    </>
  );
}
