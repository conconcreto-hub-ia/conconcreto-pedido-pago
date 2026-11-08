"use client";

import { useActionState, useState } from "react";
import { Boton } from "@/components/ui";
import { guardarTarifaIca } from "@/app/acciones";

type Fila = { id?: string; municipio: string; departamento: string; tarifas: Record<string, number>; baseUvt: number; cuenta: string; norma: string; fuente: string | null; estado: "verificada" | "por_validar"; notas: string | null };

const ACTIVIDADES = [["*", "Todas"], ["servicios", "Servicios"], ["comercial", "Comercial"], ["industrial", "Industrial"], ["construccion", "Construcción"]] as const;
const campo = "mt-1 h-9 w-full rounded-ctl border border-linea bg-papel px-2.5 text-[13.5px] outline-none focus:border-verde";

export function EditarTarifa({ fila, nueva }: { fila?: Fila; nueva?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState(async (a: unknown, f: FormData) => {
    const r = await guardarTarifaIca(a, f);
    if (r.ok) setAbierto(false);
    return r;
  }, {} as { error?: string; ok?: boolean });
  if (!abierto) return <Boton chico variante={nueva ? "primario" : "secundario"} onClick={() => setAbierto(true)}>{nueva ? "Agregar municipio" : "Editar"}</Boton>;
  const f = fila;
  return (
    <form action={accion} className="mt-3 w-full space-y-3 rounded-ctl border border-linea bg-fondo p-4 text-[13px]">
      {f?.id && <input type="hidden" name="id" value={f.id} />}
      {nueva && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-semibold">Municipio<input name="municipio" required className={campo} /></label>
          <label className="font-semibold">Departamento<input name="departamento" className={campo} /></label>
        </div>
      )}
      <div>
        <div className="font-semibold">Tarifa de retención por actividad, en por mil (vacío = no está cargada)</div>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ACTIVIDADES.map(([k, e]) => <label key={k} className="text-tinta-2">{e}<input name={`t_${k}`} inputMode="decimal" defaultValue={f?.tarifas[k] ?? ""} className={campo} /></label>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="font-semibold">Base mínima (UVT)<input name="baseUvt" inputMode="decimal" defaultValue={f?.baseUvt ?? 0} className={campo} /></label>
        <label className="font-semibold">Cuenta<input name="cuenta" defaultValue={f?.cuenta ?? "2368"} className={campo} /></label>
        <label className="font-semibold">Estado
          <select name="estado" defaultValue={f?.estado ?? "por_validar"} className={campo}><option value="por_validar">Por validar con Contabilidad</option><option value="verificada">Verificada contra el acuerdo</option></select>
        </label>
      </div>
      <label className="block font-semibold">Norma (acuerdo municipal y artículo)<input name="norma" defaultValue={f?.norma === "Sin cargar" ? "" : f?.norma ?? ""} className={campo} /></label>
      <label className="block font-semibold">Fuente (enlace al acuerdo)<input name="fuente" type="url" defaultValue={f?.fuente ?? ""} placeholder="https://" className={campo} /></label>
      <label className="block font-semibold">Notas<input name="notas" defaultValue={f?.notas ?? ""} className={campo} /></label>
      {estado.error && <p role="alert" className="text-rojo">{estado.error}</p>}
      <div className="flex gap-2"><Boton type="submit" chico variante="primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</Boton><Boton type="button" chico variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Boton></div>
    </form>
  );
}
