// Siembra el extracto de DEMOSTRACIÓN: maestros, pedidos con su liberación, entradas y HES, facturas
// (los XML de datos/facturas/lote-1 e historico), causaciones, pagos y la tabla de ICA.
//
//   npx tsx scripts/sembrar.ts
//
// Borra y vuelve a crear todo lo del proceso. NO toca usuarios, sesiones ni el registro de correos vistos. Las cifras de causaciones y
// pagos las calcula el mismo código de la app (src/lib/retenciones.ts), no están escritas a mano.
import "./_env";
import fs from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { leerFacturaXml, numeroLegible } from "../src/lib/xml-dian";
import { calcularRetenciones, asiento, type TarifaIcaDato, type ConceptoRenta } from "../src/lib/retenciones";
import { cruzar, bloqueantes, MOTIVO } from "../src/lib/cruce";
import { CAUSACIONES, ENTRADAS, OBRAS, PAGOS, PEDIDOS, PEDIDOS_SIN_LIBERAR, PROVEEDORES, TARIFAS_ICA, dv } from "../datos/demo";
import type { TipoCaso } from "@prisma/client";

const d = (s: string) => new Date(`${s}T12:00:00-05:00`);
const TIPOS: TipoCaso[] = ["pago_correcto", "pendiente_de_pago", "ica_municipio_errado", "retencion_mal_calculada", "sin_pedido", "pedido_sin_liberar", "entrada_sin_registrar", "hes_sin_registrar", "hes_sin_aceptar", "valor_no_cuadra", "tarifa_por_validar", "factura_no_encontrada", "no_identificado"];

export async function sembrar() {
  // Lo del proceso, en orden de dependencias
  await db.evento.deleteMany();
  await db.pendiente.deleteMany();
  await db.reclamo.deleteMany();
  // Los correos NO se borran: son el registro de qué mensajes del buzón ya se vieron. Si se borraran, la
  // próxima revisión del buzón volvería a procesar (y a gastar modelo en) todo lo que hay en AgentMail.
  await db.correo.updateMany({ data: { reclamoId: null } });
  await db.pago.deleteMany();
  await db.causacion.deleteMany();
  await db.factura.deleteMany();
  await db.lote.deleteMany();
  await db.entrada.deleteMany();
  await db.posicionPedido.deleteMany();
  await db.pedido.deleteMany();
  await db.obra.deleteMany();
  await db.proveedor.deleteMany();
  await db.tarifaIca.deleteMany();
  await db.reglaEnvio.deleteMany();

  await db.tarifaIca.createMany({ data: TARIFAS_ICA.map((t) => ({ ...t, verificadaEn: t.verificadaEn ? d(t.verificadaEn) : null, actualizadoPor: "Extracto inicial" })) });
  await db.reglaEnvio.createMany({ data: TIPOS.map((tipo) => ({ tipo, envioDirecto: false })) });

  for (const p of PROVEEDORES) {
    await db.proveedor.create({
      data: {
        acreedor: p.acreedor, razonSocial: p.razonSocial, nit: p.nit, dv: dv(p.nit), ciudadDomicilio: p.ciudadDomicilio, departamento: p.departamento,
        responsabilidadIva: "Responsable de IVA", granContribuyente: p.granContribuyente, autorretenedorRenta: p.autorretenedorRenta,
        resolucionAutorretencion: p.resolucion ?? null, autorretenedorIca: p.autorretenedorIca, ciiu: p.ciiu, actividad: p.actividad, correo: p.correo, banco: p.banco,
      },
    });
  }
  for (const o of OBRAS) await db.obra.create({ data: o });

  const proveedores = new Map((await db.proveedor.findMany()).map((p) => [p.acreedor, p]));
  const obras = new Map((await db.obra.findMany()).map((o) => [o.pep, o]));
  const numeros = [...new Set(PEDIDOS.map((x) => x[0]))];
  for (const n of numeros) {
    const filas = PEDIDOS.filter((x) => x[0] === n);
    const [, , acreedor, , , , , pep, tipo, fecha] = filas[0];
    const obra = obras.get(pep)!;
    const libre = !PEDIDOS_SIN_LIBERAR.includes(n);
    const f = d(fecha);
    await db.pedido.create({
      data: {
        numero: n, proveedorId: proveedores.get(acreedor)!.id, obraId: obra.id, tipo, fecha: f,
        liberacion: libre ? "liberado" : "pendiente", liberadoPor: libre ? obra.director : null, liberadoEn: libre ? new Date(f.getTime() + 86_400_000) : null,
        posiciones: { create: filas.map(([, posicion, , texto, cantidad, unidad, precio]) => ({ posicion, texto, cantidad, unidad, precio })) },
      },
    });
  }
  const pedidos = new Map((await db.pedido.findMany({ include: { obra: true } })).map((p) => [p.numero, p]));
  for (const [documento, tipo, pedido, posicion, cantidad, fecha, estado] of ENTRADAS) {
    const p = pedidos.get(pedido)!;
    await db.entrada.create({ data: { documento, tipo, pedidoId: p.id, posicion, cantidad, fecha: d(fecha), estado, registradoPor: tipo === "hes" ? p.obra.residente : p.obra.almacenista } });
  }

  // Las facturas del histórico: el lote 1 del programa y las generadas (La Ladera, Tubos del Sur)
  const tarifas: TarifaIcaDato[] = TARIFAS_ICA.map((t) => ({ municipio: t.municipio, tarifas: t.tarifas as Record<string, number>, baseUvt: t.baseUvt, cuenta: t.cuenta, norma: t.norma, estado: t.estado }));
  const lote1 = await db.lote.create({ data: { nombre: "Lote 1 · semana del 28 de septiembre", creadoPor: "Cuentas por pagar", createdAt: d("2026-10-05") } });
  const raiz = path.join(__dirname, "..", "datos", "facturas");
  for (const carpeta of ["lote-1", "historico"]) {
    for (const archivo of fs.readdirSync(path.join(raiz, carpeta)).sort()) {
      const xml = fs.readFileSync(path.join(raiz, carpeta, archivo), "utf8");
      const x = leerFacturaXml(xml);
      const prov = [...proveedores.values()].find((p) => p.nit === x.nit) ?? null;
      const ped = x.pedido ? pedidos.get(x.pedido) ?? null : null;
      const f = await db.factura.create({
        data: {
          numero: numeroLegible(x.idDian), idDian: x.idDian, cufe: x.cufe, proveedorId: prov?.id, nitEmisor: x.nit, razonEmisor: x.razon, ciudadEmisor: x.ciudad,
          pedidoNumero: x.pedido, pedidoId: ped?.id, fecha: d(x.fecha), vence: x.vence ? d(x.vence) : null, nota: x.nota, subtotal: x.subtotal, iva: x.iva, total: x.total,
          lineas: x.lineas, xml, loteId: carpeta === "lote-1" ? lote1.id : null, createdAt: d(x.fecha),
        },
      });

      const crit = CAUSACIONES.find((c) => c.factura === x.idDian);
      const pago = PAGOS.find((p) => p.factura === x.idDian);
      if (crit && prov) {
        const r = calcularRetenciones({ subtotal: x.subtotal, iva: x.iva, proveedor: prov, concepto: crit.concepto as ConceptoRenta, actividadIca: crit.actividad, municipioIca: crit.municipio, tarifaIca: tarifas.find((t) => t.municipio === crit.municipio) ?? null });
        if (!r.ok) throw new Error(`${x.idDian}: ${r.revisar}`);
        await db.causacion.create({
          data: {
            facturaId: f.id, origen: carpeta === "lote-1" ? "agente" : "sap", estado: "lista", conceptoRenta: crit.concepto, actividadIca: crit.actividad, municipioIca: crit.municipio, cuentaCosto: crit.cuenta,
            retenciones: r.retenciones, totalRetenido: r.totalRetenido, neto: r.neto, criterio: crit.criterio, causadoPor: "Cuentas por pagar", causadoEn: d(crit.fecha),
            asiento: asiento({ subtotal: x.subtotal, iva: x.iva, cuentaCosto: crit.cuenta, retenciones: r.retenciones, neto: r.neto, proveedor: prov.razonSocial }),
          },
        });
        if (pago) {
          await db.pago.create({ data: { facturaId: f.id, fecha: d(pago.fecha), valorPagado: r.neto, retenciones: r.retenciones, banco: prov.banco ?? "Bancolombia", referencia: pago.referencia } });
          await db.factura.update({ where: { id: f.id }, data: { estado: "pagada" } });
        } else await db.factura.update({ where: { id: f.id }, data: { estado: "causada" } });
      } else {
        // Detenida: los hechos del cruce lo dicen
        const pedidoCruce = ped ? await db.pedido.findUnique({ where: { id: ped.id }, include: { obra: true, posiciones: { orderBy: { posicion: "asc" } }, entradas: true } }) : null;
        const alertas = cruzar({ numero: f.numero, subtotal: x.subtotal, iva: x.iva, total: x.total, pedidoNumero: x.pedido, nota: x.nota, ciudadEmisor: x.ciudad, lineas: x.lineas },
          pedidoCruce ? { ...pedidoCruce, posiciones: pedidoCruce.posiciones, entradas: pedidoCruce.entradas } : null, prov);
        const b = bloqueantes(alertas);
        if (!b.length) throw new Error(`${x.idDian} no tiene criterio ni bloqueo: revisa datos/demo.ts`);
        await db.causacion.create({ data: { facturaId: f.id, origen: "agente", estado: "detenida", retenciones: [], alertas, motivo: MOTIVO[b[0].tipo] ?? b[0].detalle, causadoPor: "Causación preventiva", causadoEn: new Date(f.fecha.getTime() + 3 * 86_400_000) } });
        await db.factura.update({ where: { id: f.id }, data: { estado: "detenida" } });
      }
    }
  }

  await db.evento.create({ data: { actor: "sistema", tipo: "extracto.cargado", descripcion: "Se cargó el extracto de demostración de S/4HANA: maestros, pedidos, entradas, facturas, causaciones y pagos" } });
  const n = { proveedores: await db.proveedor.count(), obras: await db.obra.count(), pedidos: await db.pedido.count(), entradas: await db.entrada.count(), facturas: await db.factura.count(), pagos: await db.pago.count(), tarifas: await db.tarifaIca.count() };
  return n;
}

if (require.main === module) {
  sembrar().then((n) => console.log("Listo ·", n)).catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
}
