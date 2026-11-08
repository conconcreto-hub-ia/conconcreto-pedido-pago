// De la base a los tipos puros del rastreador. Las pantallas, el buzón y los scripts leen por aquí.
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { rastrear, type EntradaRastreo, type Rastreo } from "./rastreo";
import type { TarifaIcaDato, Retencion } from "./retenciones";
import type { LineaFactura } from "./cruce";

export const INCLUIR_FACTURA = {
  proveedor: true,
  pedido: { include: { obra: true, posiciones: { orderBy: { posicion: "asc" } }, entradas: { orderBy: { fecha: "asc" } } } },
  causacion: true,
  pagos: { orderBy: { fecha: "desc" } },
} satisfies Prisma.FacturaInclude;

export type FacturaCompleta = Prisma.FacturaGetPayload<{ include: typeof INCLUIR_FACTURA }>;

export async function tarifasIca(): Promise<TarifaIcaDato[]> {
  const t = await db.tarifaIca.findMany();
  return t.map((x) => ({ municipio: x.municipio, tarifas: x.tarifas as Record<string, number>, baseUvt: x.baseUvt, cuenta: x.cuenta, norma: x.norma, estado: x.estado, fuente: x.fuente }));
}

export function entradaDeRastreo(f: FacturaCompleta, tarifas: TarifaIcaDato[]): EntradaRastreo {
  const p = f.pedido;
  return {
    factura: { numero: f.numero, subtotal: f.subtotal, iva: f.iva, total: f.total, pedidoNumero: f.pedidoNumero, nota: f.nota, ciudadEmisor: f.ciudadEmisor, lineas: f.lineas as LineaFactura[], fecha: f.fecha, vence: f.vence, estado: f.estado },
    proveedor: f.proveedor ? { razonSocial: f.proveedor.razonSocial, ciudadDomicilio: f.proveedor.ciudadDomicilio, nit: f.proveedor.nit, granContribuyente: f.proveedor.granContribuyente, autorretenedorRenta: f.proveedor.autorretenedorRenta, autorretenedorIca: f.proveedor.autorretenedorIca, resolucionAutorretencion: f.proveedor.resolucionAutorretencion } : null,
    pedido: p ? {
      numero: p.numero, tipo: p.tipo, liberacion: p.liberacion, liberadoPor: p.liberadoPor, liberadoEn: p.liberadoEn,
      obra: p.obra, posiciones: p.posiciones.map((x) => ({ posicion: x.posicion, texto: x.texto, cantidad: x.cantidad, unidad: x.unidad, precio: x.precio })),
      entradas: p.entradas.map((x) => ({ documento: x.documento, tipo: x.tipo, posicion: x.posicion, cantidad: x.cantidad, fecha: x.fecha, estado: x.estado, registradoPor: x.registradoPor })),
    } : null,
    causacion: f.causacion ? { estado: f.causacion.estado, origen: f.causacion.origen, conceptoRenta: f.causacion.conceptoRenta, actividadIca: f.causacion.actividadIca, municipioIca: f.causacion.municipioIca, retenciones: f.causacion.retenciones as Retencion[], totalRetenido: f.causacion.totalRetenido, neto: f.causacion.neto, causadoPor: f.causacion.causadoPor, causadoEn: f.causacion.causadoEn, motivo: f.causacion.motivo } : null,
    pagos: f.pagos.map((x) => ({ fecha: x.fecha, valorPagado: x.valorPagado, retenciones: x.retenciones as Retencion[], banco: x.banco, referencia: x.referencia })),
    tarifas,
  };
}

export async function rastrearFactura(id: string): Promise<{ factura: FacturaCompleta; rastreo: Rastreo } | null> {
  const [f, tarifas] = await Promise.all([db.factura.findUnique({ where: { id }, include: INCLUIR_FACTURA }), tarifasIca()]);
  if (!f) return null;
  return { factura: f, rastreo: rastrear(entradaDeRastreo(f, tarifas)) };
}

/** Busca por NIT, número de factura (con o sin guion) o número de pedido. */
export async function buscar(q: string) {
  const t = q.trim();
  if (!t) return [];
  const limpio = t.replace(/[\s.]/g, "").replace(/-\d$/, "");
  const sinGuion = t.replace(/[\s-]/g, "").toUpperCase();
  return db.factura.findMany({
    where: {
      OR: [
        { nitEmisor: { startsWith: limpio.replace(/\D/g, "") || "x" } },
        { idDian: { contains: sinGuion } },
        { pedidoNumero: { contains: t.replace(/\D/g, "") || "x" } },
        { razonEmisor: { contains: t, mode: "insensitive" } },
      ],
    },
    include: { proveedor: true, pedido: { include: { obra: true } }, pagos: true },
    orderBy: { fecha: "desc" },
    take: 40,
  });
}
