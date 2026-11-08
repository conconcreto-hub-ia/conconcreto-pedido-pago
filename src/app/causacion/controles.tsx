"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui";
import { causarLoteAhora, causarLoteDemo } from "@/app/acciones";

export function FormLote() {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState(async (a: unknown, f: FormData) => {
    const r = await causarLoteAhora(a, f);
    if (r.loteId) router.push(`/causacion/${r.loteId}`);
    return r;
  }, {} as { error?: string; loteId?: string });
  const [demo, empezar] = useTransition();
  const [errorDemo, setErrorDemo] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <form action={accion} className="space-y-3">
        <label className="block text-[13px] font-semibold">Facturas electrónicas (XML de la DIAN)
          <input type="file" name="xml" accept=".xml,text/xml,application/xml" multiple required className="mt-1.5 block w-full rounded-ctl border border-dashed border-linea bg-fondo p-3 text-[13.5px] file:mr-3 file:rounded-ctl file:border-0 file:bg-noche-2 file:px-3 file:py-1.5 file:font-display file:text-[13px] file:font-semibold file:text-white" />
        </label>
        <label className="block text-[13px] font-semibold">Nombre del lote (opcional)
          <input name="nombre" placeholder="Semana del 9 de noviembre" className="mt-1 h-10 w-full rounded-ctl border border-linea bg-fondo px-3 text-[14px] outline-none focus:border-verde" />
        </label>
        {estado.error && <p role="alert" className="text-[13px] text-rojo">{estado.error}</p>}
        <Boton type="submit" variante="primario" disabled={pendiente || demo} className="w-full">{pendiente ? "Cruzando el lote…" : "Cruzar antes de pagar"}</Boton>
      </form>
      <div className="border-t border-linea pt-4">
        <p className="text-[13px] text-tinta-2">¿Sin XML a la mano? El lote de la semana siguiente del programa trae cinco facturas con un caso cada una.</p>
        <Boton variante="secundario" className="mt-2 w-full" disabled={pendiente || demo} onClick={() => empezar(async () => {
          setErrorDemo(null);
          const r = await causarLoteDemo();
          if (r.error) setErrorDemo(r.error);
          if (r.loteId) router.push(`/causacion/${r.loteId}`);
        })}>{demo ? "Cruzando el lote de demostración…" : "Cargar el lote de demostración"}</Boton>
        {errorDemo && <p className="mt-2 text-[13px] text-rojo">{errorDemo}</p>}
      </div>
    </div>
  );
}
