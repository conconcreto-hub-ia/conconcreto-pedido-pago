// El buzón corriendo en un computador, mientras la app no esté desplegada.
//
//   npx tsx scripts/rutinas.ts
//
// Cada 2 minutos, de 7:00 a 19:00 de lunes a viernes, le pregunta a AgentMail cuál es el último correo
// (eso NO toca la base). Solo si llegó algo nuevo revisa el buzón. Así Neon puede dormir.
// Con --ya lo revisa una vez y termina (sirve para probar sin esperar).
import "./_env";
import { agentmail } from "../src/lib/agentmail";
import { rutinaBuzon } from "../src/lib/rutinas";

const hora = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
const habil = (d: Date) => d.getDay() >= 1 && d.getDay() <= 5 && d.getHours() >= 7 && d.getHours() < 19;
const log = (...x: unknown[]) => console.log(`[${hora().toLocaleString("es-CO")}]`, ...x);

let ultimo: string | null = null;

async function ciclo(forzar = false) {
  if (!forzar && !habil(hora())) return;
  try {
    const { messages } = await agentmail.listar(1);
    const tope = messages[0]?.message_id ?? null;
    if (forzar || (tope && tope !== ultimo)) { ultimo = tope; log("buzón", await rutinaBuzon()); }
  } catch (e) { log("falló:", e instanceof Error ? e.message : e); }
}

if (process.argv.includes("--ya")) {
  ciclo(true).then(() => process.exit(0));
} else {
  log("Buzón encendido. Ctrl+C para apagarlo.");
  ciclo();
  setInterval(ciclo, 2 * 60_000);
}
