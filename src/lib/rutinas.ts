// Lo que corre solo. La llaman la ruta de cron, el webhook de AgentMail y scripts/rutinas.ts (un computador).
import { revisarBuzon } from "./buzon";

export const rutinaBuzon = () => revisarBuzon();

/** Las rutas de cron solo responden con el secreto (Vercel lo manda como Bearer). */
export function autorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  return !!secreto && req.headers.get("authorization") === `Bearer ${secreto}`;
}
