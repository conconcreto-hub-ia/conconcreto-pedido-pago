"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TipoCaso } from "@prisma/client";
import { Boton } from "@/components/ui";
import { IconoCorreo, IconoCheck } from "@/components/iconos";
import { aprobarReclamo, descartarReclamo, revisarBuzonAhora, cambiarEnvioDirecto } from "@/app/acciones";

const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function BotonRevisar() {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [nota, setNota] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Boton variante="primario" disabled={pendiente} onClick={() => empezar(async () => {
        setNota(null);
        try { const r = await revisarBuzonAhora(); setNota(r.nuevos ? `${r.nuevos} ${r.nuevos === 1 ? "correo nuevo" : "correos nuevos"} · ${r.reclamos} ${r.reclamos === 1 ? "reclamo" : "reclamos"}` : "No llegó nada nuevo"); router.refresh(); }
        catch (e) { setNota(mensaje(e)); }
      })}><IconoCorreo />{pendiente ? "Revisando el buzón…" : "Revisar el buzón ahora"}</Boton>
      {nota && <span className="text-[12.5px] text-white/70">{nota}</span>}
    </div>
  );
}

/** La respuesta propuesta: se puede editar antes de aprobar. Lo que se aprueba es lo que sale. */
export function FormRespuesta({ id, respuesta, remitente, puedeAprobar, permitido }: { id: string; respuesta: string; remitente: string; puedeAprobar: boolean; permitido: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState(respuesta);
  const [nota, setNota] = useState("");
  const [descartando, setDescartando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const correr = (fn: () => Promise<unknown>) => empezar(async () => { setError(null); try { await fn(); router.refresh(); } catch (e) { setError(mensaje(e)); } });

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[13px] font-semibold">Respuesta para {remitente} · en el mismo hilo</span>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} readOnly={!puedeAprobar} rows={16} className="mt-1.5 w-full rounded-ctl border border-linea bg-papel p-3.5 text-[14px] leading-relaxed outline-none focus:border-verde read-only:bg-fondo" />
      </label>
      {texto.trim() !== respuesta.trim() && <p className="text-[12.5px] text-[#8a5a00]">Editaste la respuesta del agente: sale tu versión y la original queda guardada.</p>}
      {!permitido && <p className="rounded-ctl bg-oro-suave px-3 py-2 text-[13px] text-[#8a5a00]">Modo prueba: {remitente} no está en los dominios permitidos. Si apruebas, la respuesta queda retenida y no sale.</p>}
      {error && <p role="alert" className="rounded-ctl bg-rojo-suave px-3 py-2 text-[13px] text-rojo">{error}</p>}
      {puedeAprobar ? (
        <div className="flex flex-wrap items-center gap-2">
          <Boton variante="primario" disabled={pendiente || !texto.trim()} onClick={() => correr(() => aprobarReclamo(id, texto))}><IconoCheck />{pendiente ? "Enviando…" : "Aprobar y enviar"}</Boton>
          {!descartando ? <Boton variante="secundario" disabled={pendiente} onClick={() => setDescartando(true)}>Descartar</Boton> : (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por qué no se responde (opcional)" className="h-10 min-w-[220px] flex-1 rounded-ctl border border-linea bg-papel px-3 text-[14px] outline-none focus:border-verde" />
              <Boton variante="peligro" disabled={pendiente} onClick={() => correr(() => descartarReclamo(id, nota))}>Descartar sin responder</Boton>
            </div>
          )}
        </div>
      ) : <p className="text-[13px] text-tinta-3">Tu rol puede ver la respuesta pero no aprobarla.</p>}
    </div>
  );
}

export function InterruptorEnvio({ tipo, prendido, bloqueado }: { tipo: TipoCaso; prendido: boolean; bloqueado: boolean }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" role="switch" aria-checked={prendido} disabled={pendiente || bloqueado} title={bloqueado ? "Siempre lo aprueba una persona" : ""}
        onClick={() => empezar(async () => { setError(null); try { await cambiarEnvioDirecto(tipo, !prendido); router.refresh(); } catch (e) { setError(mensaje(e)); } })}
        className={`relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50 ${prendido ? "border-verde bg-verde" : "border-linea bg-linea-2"}`}>
        <span className={`absolute top-0.5 size-[18px] rounded-full bg-papel transition-[left] ${prendido ? "left-[22px]" : "left-0.5"}`} />
      </button>
      {error && <span className="text-[12px] text-rojo">{error}</span>}
    </div>
  );
}
