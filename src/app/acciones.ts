"use server";
// Cada acción exige su permiso con la sesión de la base: no basta con que la pantalla esconda el botón,
// porque una acción de servidor se puede llamar directamente. Y firma con el nombre de quien la hizo.

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import type { TipoCaso } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/auth/sesion";

export async function revisarBuzonAhora() {
  await exigir("buzon.revisar");
  const { revisarBuzon } = await import("@/lib/buzon");
  const r = await revisarBuzon();
  revalidatePath("/reclamos");
  return r;
}

export async function aprobarReclamo(id: string, texto: string) {
  const yo = await exigir("reclamos.aprobar");
  const { enviarRespuesta } = await import("@/lib/buzon");
  const r = await enviarRespuesta(id, yo.nombre, { texto });
  revalidatePath("/reclamos");
  revalidatePath(`/reclamos/${id}`);
  revalidatePath("/pendientes");
  return { estado: r.estado };
}

export async function descartarReclamo(id: string, nota: string) {
  const yo = await exigir("reclamos.aprobar");
  const { descartarReclamo: descartar } = await import("@/lib/buzon");
  await descartar(id, yo.nombre, nota.slice(0, 500));
  revalidatePath("/reclamos");
  revalidatePath(`/reclamos/${id}`);
}

export async function causarLoteAhora(_: unknown, f: FormData): Promise<{ error?: string; loteId?: string }> {
  const yo = await exigir("causacion.correr");
  const archivos = f.getAll("xml").filter((x): x is File => x instanceof File && x.size > 0);
  if (!archivos.length) return { error: "Elige al menos un XML de factura electrónica." };
  if (archivos.length > 40) return { error: "Máximo 40 facturas por lote." };
  if (archivos.some((a) => a.size > 512_000)) return { error: "Un XML de factura no debería pasar de 500 KB." };
  const { causarLote } = await import("@/lib/causacion");
  const r = await causarLote(await Promise.all(archivos.map(async (a) => ({ nombre: a.name, xml: await a.text() }))), yo.nombre, String(f.get("nombre") ?? "").trim() || undefined);
  revalidatePath("/causacion");
  return { loteId: r.loteId };
}

/** El lote de la semana siguiente del programa (datos/facturas/lote-2), para la demostración. */
export async function causarLoteDemo(): Promise<{ error?: string; loteId?: string }> {
  const yo = await exigir("causacion.correr");
  const dir = path.join(process.cwd(), "datos", "facturas", "lote-2");
  const archivos = fs.readdirSync(dir).filter((a) => a.endsWith(".xml")).map((a) => ({ nombre: a, xml: fs.readFileSync(path.join(dir, a), "utf8") }));
  const { causarLote } = await import("@/lib/causacion");
  const r = await causarLote(archivos, yo.nombre, "Lote 2 · semana del 5 de octubre (demostración)");
  revalidatePath("/causacion");
  if (!r.leidas && r.repetidas.length) return { error: `Ese lote ya se causó (${r.repetidas.join(", ")}).`, loteId: r.loteId };
  return { loteId: r.loteId };
}

export async function guardarTarifaIca(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const yo = await exigir("ica.editar");
  const id = String(f.get("id") ?? "");
  const municipio = String(f.get("municipio") ?? "").trim();
  const tarifas: Record<string, number> = {};
  for (const act of ["*", "servicios", "comercial", "industrial", "construccion"]) {
    const v = String(f.get(`t_${act}`) ?? "").trim().replace(",", ".");
    if (!v) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 20) return { error: `La tarifa de «${act}» tiene que ser un número entre 0 y 20 por mil.` };
    tarifas[act] = n;
  }
  const baseUvt = Number(String(f.get("baseUvt") ?? "0").replace(",", "."));
  if (!Number.isFinite(baseUvt) || baseUvt < 0 || baseUvt > 1000) return { error: "La base en UVT no es válida." };
  const estado = f.get("estado") === "verificada" ? "verificada" : "por_validar";
  const fuente = String(f.get("fuente") ?? "").trim() || null;
  const norma = String(f.get("norma") ?? "").trim();
  if (estado === "verificada" && (!fuente || !norma || !Object.keys(tarifas).length)) return { error: "Para marcarla verificada hacen falta la tarifa, la norma y el enlace a la fuente." };
  if (fuente && !/^https?:\/\//.test(fuente)) return { error: "La fuente tiene que ser un enlace (https://…)." };
  const data = { tarifas, baseUvt, estado: estado as "verificada" | "por_validar", fuente, norma: norma || "Sin cargar", notas: String(f.get("notas") ?? "").trim() || null, cuenta: String(f.get("cuenta") ?? "").trim() || "2368", actualizadoPor: yo.nombre, verificadaEn: estado === "verificada" ? new Date() : null };
  let nombre = municipio;
  if (id) {
    const antes = await db.tarifaIca.findUniqueOrThrow({ where: { id } });
    nombre = antes.municipio;
    await db.tarifaIca.update({ where: { id }, data });
    await db.evento.create({ data: { actor: "persona", tipo: "ica.editada", descripcion: `${yo.nombre} cambió la tarifa de ICA de ${nombre}${estado !== antes.estado ? ` y la dejó ${estado === "verificada" ? "verificada" : "por validar"}` : ""}`, datos: { antes: { tarifas: antes.tarifas, baseUvt: antes.baseUvt, estado: antes.estado }, despues: { tarifas, baseUvt, estado } } } });
  } else {
    if (!municipio) return { error: "Falta el municipio." };
    if (await db.tarifaIca.findUnique({ where: { municipio } })) return { error: `Ya hay una fila para ${municipio}.` };
    await db.tarifaIca.create({ data: { ...data, municipio, departamento: String(f.get("departamento") ?? "").trim() || "—" } });
    await db.evento.create({ data: { actor: "persona", tipo: "ica.creada", descripcion: `${yo.nombre} agregó ${municipio} a la tabla de ICA (${estado === "verificada" ? "verificada" : "por validar"})` } });
  }
  revalidatePath("/ica");
  return { ok: true };
}

export async function cerrarPendiente(id: string, nota: string) {
  const yo = await exigir("pendientes.cerrar");
  const p = await db.pendiente.update({ where: { id }, data: { estado: "cerrado", cerradoPor: yo.nombre, cerradoEn: new Date(), nota: nota.slice(0, 500) || null } });
  await db.evento.create({ data: { actor: "persona", tipo: "pendiente.cerrado", reclamoId: p.reclamoId, facturaId: p.facturaId, descripcion: `${yo.nombre} cerró el pendiente «${p.titulo}»${nota ? `: ${nota.slice(0, 200)}` : ""}` } });
  revalidatePath("/pendientes");
}

export async function cambiarEnvioDirecto(tipo: TipoCaso, prender: boolean) {
  const yo = await exigir("envio.configurar");
  // Un error real nunca sale solo: siempre lo mira una persona.
  const NUNCA: TipoCaso[] = ["ica_municipio_errado", "retencion_mal_calculada", "pedido_sin_liberar", "entrada_sin_registrar", "hes_sin_registrar", "hes_sin_aceptar", "no_identificado", "tarifa_por_validar"];
  if (prender && NUNCA.includes(tipo)) throw new Error("Este tipo de caso siempre lo aprueba una persona.");
  await db.reglaEnvio.upsert({ where: { tipo }, update: { envioDirecto: prender, actualizadoPor: yo.nombre }, create: { tipo, envioDirecto: prender, actualizadoPor: yo.nombre } });
  await db.evento.create({ data: { actor: "persona", tipo: "envio.regla", descripcion: `${yo.nombre} ${prender ? "prendió" : "apagó"} el envío directo para «${tipo}»` } });
  revalidatePath("/reclamos/reglas");
}
