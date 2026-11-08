// La cadena de pedido a pago, paso por paso, y el cálculo de las retenciones. Lo que se ve aquí sale del
// rastreador (src/lib/rastreo.ts): ninguna cifra la escribe la pantalla ni el modelo.
import type { ReactNode } from "react";
import type { Paso, Rastreo, EstadoPaso } from "@/lib/rastreo";
import type { Retencion } from "@/lib/retenciones";
import { IconoAlerta, IconoBanco, IconoCalculo, IconoCheck, IconoDocumento, IconoFirma, IconoPaquete, IconoReloj, IconoX, IconoEscudo } from "./iconos";
import { pesos, porMil, porciento, fecha } from "@/lib/formato";
import { Tarjeta } from "./ui";

const ICONO: Record<Paso["clave"], (p: { className?: string }) => ReactNode> = {
  pedido: IconoDocumento, liberacion: IconoFirma, entrada: IconoPaquete, aceptacion: IconoEscudo, factura: IconoDocumento, causacion: IconoCalculo, pago: IconoBanco,
};

const TONO: Record<EstadoPaso, { anillo: string; texto: string; etiqueta: string }> = {
  ok: { anillo: "bg-verde-suave text-verde-profundo border-verde/30", texto: "text-verde-profundo", etiqueta: "Listo" },
  error: { anillo: "bg-rojo-suave text-rojo border-rojo/40", texto: "text-rojo", etiqueta: "Bloquea" },
  espera: { anillo: "bg-oro-suave text-[#8a5a00] border-oro/50", texto: "text-[#8a5a00]", etiqueta: "En espera" },
  falta: { anillo: "bg-linea-2 text-tinta-3 border-linea", texto: "text-tinta-3", etiqueta: "Sin hacer" },
  no_aplica: { anillo: "bg-linea-2 text-tinta-3 border-linea", texto: "text-tinta-3", etiqueta: "No aplica" },
};

function Marca({ estado }: { estado: EstadoPaso }) {
  if (estado === "ok") return <IconoCheck className="size-3" />;
  if (estado === "error") return <IconoX className="size-3" />;
  if (estado === "espera") return <IconoReloj className="size-3" />;
  return null;
}

/** La cadena: una fila en pantalla ancha, una columna en el teléfono. */
export function Cadena({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="m-0 grid list-none gap-0 p-0 md:grid-flow-col md:auto-cols-fr">
      {pasos.map((p, i) => {
        const t = TONO[p.estado];
        const Icono = ICONO[p.clave];
        return (
          <li key={p.clave} className="relative flex gap-3 pb-5 md:block md:pb-0 md:pr-3">
            {i < pasos.length - 1 && <span aria-hidden className={`absolute left-[19px] top-10 bottom-0 w-px md:left-10 md:right-0 md:top-[19px] md:h-px md:w-auto ${p.estado === "ok" ? "bg-verde/40" : "bg-linea"}`} />}
            <div className={`relative grid size-10 shrink-0 place-items-center rounded-full border ${t.anillo}`}>
              <Icono className="size-[18px]" />
              <span className={`absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border border-papel ${p.estado === "ok" ? "bg-verde text-white" : p.estado === "error" ? "bg-rojo text-white" : p.estado === "espera" ? "bg-oro text-[#1a1300]" : "hidden"}`}><Marca estado={p.estado} /></span>
            </div>
            <div className="min-w-0 md:mt-3">
              <div className="font-display text-[13.5px] font-bold leading-tight">{p.titulo}</div>
              <div className={`mt-0.5 font-display text-[11px] font-bold uppercase tracking-[.08em] ${t.texto}`}>{t.etiqueta}</div>
              {p.documento && <div className="mt-1 font-mono text-[12px] text-tinta-2">{p.documento}</div>}
              <p className="m-0 mt-1 text-[12.5px] leading-snug text-tinta-2">{p.detalle}</p>
              {p.fecha && <div className="mt-0.5 text-[12px] text-tinta-3">{fecha(p.fecha)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const tarifaDe = (x: Retencion) => (x.porMil ? porMil(x.porMil) : x.tarifa ? porciento(x.tarifa) : "No aplica");

/** Lo que se retuvo en el pago al lado de lo que da el recálculo con el municipio de la obra. */
export function TablaRetenciones({ rastreo }: { rastreo: Rastreo }) {
  const correcto = rastreo.recalculo?.ok ? rastreo.recalculo.retenciones : [];
  const aplicado = rastreo.aplicado?.retenciones ?? null;
  const claves = ["renta", "iva", "ica"] as const;
  const filas = claves.map((k) => ({ k, a: aplicado?.find((x) => x.clave === k), c: correcto.find((x) => x.clave === k) })).filter((f) => f.a || f.c);
  if (!filas.length) return <p className="text-[14px] text-tinta-3">{rastreo.recalculo && !rastreo.recalculo.ok ? rastreo.recalculo.revisar : "Sin datos para recalcular."}</p>;
  return (
    <Tarjeta className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-[13.5px]">
        <thead>
          <tr className="text-left text-[12px] text-tinta-3">
            <th className="px-4 py-2.5 font-medium">Retención</th>
            {aplicado && <th className="px-3 py-2.5 text-right font-medium">Se aplicó en el pago</th>}
            <th className="px-3 py-2.5 text-right font-medium">Recálculo · obra en {rastreo.municipioCorrecto ?? "—"}</th>
            {aplicado && <th className="px-4 py-2.5 text-right font-medium">Diferencia</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map(({ k, a, c }) => {
            const dif = (a?.valor ?? 0) - (c?.valor ?? 0);
            return (
              <tr key={k} className="border-t border-linea-2 align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold">{k === "ica" ? "ReteICA" : c?.nombre ?? a?.nombre}</div>
                  <div className="text-[12px] text-tinta-3">{c?.nota ?? a?.nota}</div>
                  {c?.porValidar && <div className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#8a5a00]"><IconoAlerta className="size-3.5" />Tarifa por validar con Contabilidad</div>}
                </td>
                {aplicado && (
                  <td className="px-3 py-3 text-right">
                    <div className="num font-bold">{pesos(a?.valor ?? 0)}</div>
                    <div className="text-[12px] text-tinta-3">{a ? `${tarifaDe(a)}${a.municipio ? ` · ${a.municipio}` : ""}` : "—"}</div>
                  </td>
                )}
                <td className="px-3 py-3 text-right">
                  <div className="num font-bold">{pesos(c?.valor ?? 0)}</div>
                  <div className="text-[12px] text-tinta-3">{c ? `${tarifaDe(c)}${c.municipio ? ` · ${c.municipio}` : ""} sobre ${pesos(c.base)}` : "—"}</div>
                </td>
                {aplicado && <td className={`px-4 py-3 text-right num font-bold ${Math.abs(dif) > 1 ? "text-rojo" : "text-tinta-3"}`}>{Math.abs(dif) > 1 ? pesos(dif) : "—"}</td>}
              </tr>
            );
          })}
          <tr className="border-t border-linea bg-fondo">
            <td className="px-4 py-3 font-semibold">Total retenido</td>
            {aplicado && <td className="px-3 py-3 text-right num font-extrabold">{pesos(rastreo.aplicado!.totalRetenido)}</td>}
            <td className="px-3 py-3 text-right num font-extrabold">{pesos(rastreo.recalculo?.ok ? rastreo.recalculo.totalRetenido : 0)}</td>
            {aplicado && <td className={`px-4 py-3 text-right num font-extrabold ${Math.abs(rastreo.porReintegrar) > 1 ? "text-rojo" : "text-tinta-3"}`}>{Math.abs(rastreo.porReintegrar) > 1 ? pesos(rastreo.porReintegrar) : "—"}</td>}
          </tr>
        </tbody>
      </table>
    </Tarjeta>
  );
}

/** De la factura al pago, en tres cifras. */
export function DeFacturaAPago({ rastreo }: { rastreo: Rastreo }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tarjeta className="p-4"><div className="text-[12.5px] text-tinta-3">Factura con IVA</div><div className="num mt-1 text-[22px] font-extrabold">{pesos(rastreo.facturado)}</div></Tarjeta>
      <Tarjeta className="p-4"><div className="text-[12.5px] text-tinta-3">Pagado</div><div className="num mt-1 text-[22px] font-extrabold">{rastreo.aplicado ? pesos(rastreo.pagado) : "Sin pagar"}</div>{rastreo.aplicado && <div className="text-[12px] text-tinta-3">{fecha(rastreo.aplicado.fecha)} · {rastreo.aplicado.referencia}</div>}</Tarjeta>
      <Tarjeta className="p-4"><div className="text-[12.5px] text-tinta-3">{rastreo.aplicado ? "Diferencia (retenciones)" : "Por pagar"}</div><div className="num mt-1 text-[22px] font-extrabold">{pesos(rastreo.diferenciaTotal)}</div>{Math.abs(rastreo.porReintegrar) > 1 && <div className="text-[12px] font-semibold text-rojo">{pesos(rastreo.porReintegrar)} de más</div>}</Tarjeta>
    </div>
  );
}
