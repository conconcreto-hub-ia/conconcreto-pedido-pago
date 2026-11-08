// La carga para SAP (FB60 simulada) de un lote. El proxy ya exige sesión; aquí se confirma contra la base.
import { usuarioActual } from "@/lib/auth/sesion";
import { cargaSap } from "@/lib/causacion";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await usuarioActual())) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  const archivo = await cargaSap(id);
  return new Response(new Uint8Array(archivo), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Carga_SAP_${id.slice(-6)}.xlsx"` },
  });
}
