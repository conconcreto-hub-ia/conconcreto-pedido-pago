import type { Evento } from "@prisma/client";
import { IconoAgente, IconoPersona } from "./iconos";
import { haceCuanto } from "@/lib/formato";

/** La bitácora: cada paso del agente y de las personas. */
export function Bitacora({ eventos, vacio = "Todavía no hay movimientos." }: { eventos: Evento[]; vacio?: string }) {
  if (!eventos.length) return <p className="text-[14px] text-tinta-3">{vacio}</p>;
  return (
    <ol className="m-0 list-none space-y-0 p-0">
      {eventos.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < eventos.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-linea" />}
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${e.actor === "agente" ? "bg-noche-2 text-oro" : e.actor === "sistema" ? "bg-linea-2 text-tinta-2" : "bg-verde-suave text-verde-profundo"}`}>
            {e.actor === "persona" ? <IconoPersona className="size-4" /> : <IconoAgente className="size-4" />}
          </span>
          <div className="min-w-0 pt-1">
            <p className="m-0 text-[14px] leading-snug text-tinta">{e.descripcion}</p>
            <p className="m-0 mt-0.5 text-[12px] text-tinta-3">{e.actor === "agente" ? "Agente" : e.actor === "sistema" ? "Sistema" : "Persona"} · {haceCuanto(e.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
