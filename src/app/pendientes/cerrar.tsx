"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui";
import { cerrarPendiente } from "@/app/acciones";

export function CerrarPendiente({ id }: { id: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  if (!abierto) return <Boton chico variante="secundario" onClick={() => setAbierto(true)}>Cerrar</Boton>;
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué se hizo" className="h-8 min-w-[200px] flex-1 rounded-ctl border border-linea bg-papel px-2.5 text-[13px] outline-none focus:border-verde" />
      <Boton chico variante="primario" disabled={pendiente} onClick={() => empezar(async () => { setError(null); try { await cerrarPendiente(id, nota); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } })}>Cerrar pendiente</Boton>
      {error && <span className="text-[12px] text-rojo">{error}</span>}
    </div>
  );
}
