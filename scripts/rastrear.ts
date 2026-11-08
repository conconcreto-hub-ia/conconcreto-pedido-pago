// Rastrea una factura desde la consola: la cadena, el recálculo y el diagnóstico.
//
//   npx tsx scripts/rastrear.ts LAD-1021
//   npx tsx scripts/rastrear.ts --todas
import "./_env";
import { db } from "../src/lib/db";
import { rastrearFactura } from "../src/lib/consultas";
import { pesos } from "../src/lib/formato";

const SIMBOLO = { ok: "✓", falta: "·", error: "✗", espera: "…", no_aplica: "-" } as const;

async function una(numero: string) {
  const f = await db.factura.findFirst({ where: { OR: [{ numero }, { idDian: numero.replace(/-/g, "") }] } });
  if (!f) return console.log(`No encuentro la factura ${numero}`);
  const { rastreo: r } = (await rastrearFactura(f.id))!;
  console.log(`\n■ ${f.numero} · ${f.razonEmisor}`);
  for (const p of r.pasos) console.log(`  ${SIMBOLO[p.estado]} ${p.titulo.padEnd(24)} ${p.detalle}`);
  console.log(`  facturado ${pesos(r.facturado)} · pagado ${pesos(r.pagado)} · diferencia ${pesos(r.diferenciaTotal)} · por reintegrar ${pesos(r.porReintegrar)}`);
  for (const d of r.diferencias) console.log(`    ${d.nombre.padEnd(34)} aplicado ${pesos(d.aplicado).padStart(12)}  correcto ${pesos(d.correcto).padStart(12)}`);
  console.log(`  → ${r.diagnostico.tipo}${r.diagnostico.esError ? " (ERROR)" : ""} · ${r.diagnostico.titulo}`);
  if (r.diagnostico.responsable) console.log(`    responsable: ${r.diagnostico.responsable.nombre} <${r.diagnostico.responsable.correo}>`);
}

(async () => {
  const arg = process.argv[2];
  if (!arg) { console.log("Uso: npx tsx scripts/rastrear.ts <factura> | --todas"); return; }
  if (arg === "--todas") for (const f of await db.factura.findMany({ orderBy: { fecha: "asc" } })) await una(f.numero);
  else await una(arg);
})().finally(() => db.$disconnect());
