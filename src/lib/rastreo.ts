// El rastreador: de una factura hacia atrás y hacia adelante por toda la cadena, y dónde se fue la diferencia.
//
//   pedido → liberación → entrada de mercancías o HES → aceptación de la HES → factura → causación → pago
//
// Código puro: recibe los documentos ya leídos y devuelve la cadena, el recálculo con el municipio correcto
// y el diagnóstico. Toda cifra que lee una persona o un proveedor sale de aquí, no del modelo.

import type { TipoCaso, Area } from "@prisma/client";
import { calcularRetenciones, clasificacionPorDefecto, tarifaDe, type CalidadTributaria, type ConceptoRenta, type Retencion, type TarifaIcaDato, type ResultadoRetenciones } from "./retenciones";
import { fechaLarga } from "./formato";
import { cruzar, bloqueantes, entradaValida, valorPedido, type Alerta, type FacturaCruce, type PedidoCruce } from "./cruce";

export type CausacionRastreo = {
  estado: "lista" | "detenida" | "revisar";
  origen: "sap" | "agente";
  conceptoRenta: string | null;
  actividadIca: string | null;
  municipioIca: string | null;
  retenciones: Retencion[];
  totalRetenido: number;
  neto: number;
  causadoPor?: string | null;
  causadoEn: Date | string;
  motivo?: string | null;
};

export type PagoRastreo = { fecha: Date | string; valorPagado: number; retenciones: Retencion[]; banco: string; referencia: string };

export type EntradaRastreo = {
  factura: FacturaCruce & { fecha: Date | string; vence: Date | string | null; estado: string };
  proveedor: (CalidadTributaria & { razonSocial: string; ciudadDomicilio: string; nit: string }) | null;
  pedido: PedidoCruce | null;
  causacion: CausacionRastreo | null;
  pagos: PagoRastreo[];
  tarifas: TarifaIcaDato[];
  hoy?: Date;
};

export type EstadoPaso = "ok" | "falta" | "error" | "espera" | "no_aplica";
export type Paso = { clave: "pedido" | "liberacion" | "entrada" | "aceptacion" | "factura" | "causacion" | "pago"; titulo: string; estado: EstadoPaso; detalle: string; documento?: string; fecha?: string; quien?: string };

export type Diferencia = { clave: "renta" | "iva" | "ica"; nombre: string; aplicado: number; correcto: number; diferencia: number; municipioAplicado?: string; municipioCorrecto?: string };

export type Responsable = { area: Area; nombre: string; correo: string };

export type Diagnostico = {
  tipo: TipoCaso;
  esError: boolean;
  titulo: string;
  explicacion: string; // interna, para Cuentas por pagar
  responsable: Responsable | null;
  pendiente: { titulo: string; detalle: string } | null;
  porValidar: boolean; // la tarifa de ICA del municipio correcto no está confirmada
};

export type Rastreo = {
  pasos: Paso[];
  alertas: Alerta[];
  municipioCorrecto: string | null;
  concepto: { concepto: ConceptoRenta; actividad: string } | null;
  recalculo: ResultadoRetenciones | null;
  aplicado: { retenciones: Retencion[]; totalRetenido: number; pagado: number; fecha: string; banco: string; referencia: string } | null;
  diferencias: Diferencia[];
  facturado: number;
  pagado: number;
  diferenciaTotal: number; // facturado − pagado
  porReintegrar: number; // lo que se le retuvo de más al proveedor (positivo) o de menos (negativo)
  diagnostico: Diagnostico;
};

export const CXP: Responsable = { area: "cxp", nombre: "Cuentas por pagar", correo: process.env.CORREO_CXP || "cuentasporpagar@conconcreto-demo.co" };
export const COMPRAS: Responsable = { area: "compras", nombre: "Compras", correo: process.env.CORREO_COMPRAS || "compras@conconcreto-demo.co" };

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
const p$ = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function rastrear(e: EntradaRastreo): Rastreo {
  const { factura: f, pedido, proveedor, causacion, pagos } = e;
  const hoy = e.hoy ?? new Date();
  const alertas = cruzar(f, pedido, proveedor ? { razonSocial: proveedor.razonSocial, ciudadDomicilio: proveedor.ciudadDomicilio } : null);
  const bloq = bloqueantes(alertas);
  const pasos: Paso[] = [];

  // 1 · Pedido
  if (!pedido) pasos.push({ clave: "pedido", titulo: "Pedido", estado: "error", detalle: `La factura cita el pedido ${f.pedidoNumero || "(ninguno)"} y no existe en S/4HANA` });
  else pasos.push({ clave: "pedido", titulo: "Pedido", estado: "ok", documento: pedido.numero, detalle: `${pedido.tipo === "material" ? "Material" : "Servicio"} · ${p$(valorPedido(pedido))} · ${pedido.obra.nombre} (${pedido.obra.municipio}) · PEP ${pedido.obra.pep}` });

  // 2 · Liberación
  if (pedido) {
    if (pedido.liberacion === "liberado") pasos.push({ clave: "liberacion", titulo: "Liberación", estado: "ok", quien: pedido.liberadoPor ?? undefined, fecha: iso(pedido.liberadoEn), detalle: `Liberado por ${pedido.liberadoPor ?? "el director"}` });
    else pasos.push({ clave: "liberacion", titulo: "Liberación", estado: "error", quien: pedido.obra.director, detalle: `${pedido.liberacion === "rechazado" ? "Rechazado" : "Pendiente"}: le falta la firma de ${pedido.obra.director}` });
  } else pasos.push({ clave: "liberacion", titulo: "Liberación", estado: "no_aplica", detalle: "Sin pedido no hay qué liberar" });

  // 3 · Entrada / HES y 4 · su aceptación
  const esServicio = pedido?.tipo === "servicio";
  const nombreEntrada = esServicio ? "Hoja de entrada (HES)" : "Entrada de mercancías";
  if (!pedido) {
    pasos.push({ clave: "entrada", titulo: "Entrada o HES", estado: "no_aplica", detalle: "Sin pedido" });
  } else {
    const registradas = pedido.entradas.filter((x) => x.estado !== "anulada");
    if (!registradas.length && pedido.liberacion !== "liberado") {
      pasos.push({ clave: "entrada", titulo: nombreEntrada, estado: "espera", detalle: "No se puede registrar hasta que se libere el pedido" });
    } else if (!registradas.length) {
      pasos.push({ clave: "entrada", titulo: nombreEntrada, estado: "error", quien: esServicio ? pedido.obra.residente : pedido.obra.almacenista, detalle: esServicio ? `La obra no ha registrado la HES (responsable: ${pedido.obra.residente})` : `El almacén no ha registrado el recibo (responsable: ${pedido.obra.almacenista})` });
    } else {
      const completo = recibidoCompleto(pedido);
      pasos.push({ clave: "entrada", titulo: nombreEntrada, estado: "ok", documento: registradas.map((x) => x.documento).join(", "), fecha: iso(registradas[0].fecha), quien: registradas[0].registradoPor ?? undefined, detalle: `${registradas.length === 1 ? "Un documento" : `${registradas.length} documentos`} · ${completo ? "recibido completo" : "recibo parcial"}${registradas[0].registradoPor ? ` · ${registradas[0].registradoPor}` : ""}` });
    }
    if (esServicio) {
      const acept = pedido.entradas.filter((x) => x.estado === "aceptada");
      const pend = pedido.entradas.filter((x) => x.estado === "pendiente_aceptacion");
      if (acept.length) pasos.push({ clave: "aceptacion", titulo: "Aceptación de la HES", estado: "ok", detalle: "Aceptada: el servicio se recibió a satisfacción" });
      else if (pend.length) pasos.push({ clave: "aceptacion", titulo: "Aceptación de la HES", estado: "error", quien: pedido.obra.director, detalle: `Falta la segunda liberación de ${pedido.obra.director}` });
      else pasos.push({ clave: "aceptacion", titulo: "Aceptación de la HES", estado: "espera", detalle: "Sin HES no hay qué aceptar" });
    }
  }

  // 5 · Factura
  pasos.push({ clave: "factura", titulo: "Factura", estado: "ok", documento: f.numero, fecha: iso(f.fecha), detalle: `${p$(f.total)} con IVA · subtotal ${p$(f.subtotal)}${f.vence ? ` · vence el ${fechaLarga(f.vence)}` : ""}` });

  // 6 · Causación
  if (causacion?.estado === "lista") pasos.push({ clave: "causacion", titulo: "Causación", estado: "ok", fecha: iso(causacion.causadoEn), quien: causacion.causadoPor ?? undefined, detalle: `Retenciones ${p$(causacion.totalRetenido)} · neto a pagar ${p$(causacion.neto)}` });
  else if (causacion) pasos.push({ clave: "causacion", titulo: "Causación", estado: "error", fecha: iso(causacion.causadoEn), detalle: `${causacion.estado === "detenida" ? "Detenida" : "En revisión"}${causacion.motivo ? `: ${causacion.motivo}` : ""}` });
  else pasos.push({ clave: "causacion", titulo: "Causación", estado: bloq.length ? "error" : "espera", detalle: bloq.length ? "No se puede causar todavía" : "Recibida, en turno para causar" });

  // 7 · Pago
  const pago = pagos[0] ?? null;
  if (pago) pasos.push({ clave: "pago", titulo: "Pago", estado: "ok", documento: pago.referencia, fecha: iso(pago.fecha), detalle: `${p$(pago.valorPagado)} · ${pago.banco}` });
  else pasos.push({ clave: "pago", titulo: "Pago", estado: causacion?.estado === "lista" ? "espera" : "falta", detalle: causacion?.estado === "lista" ? `Programado al vencimiento${f.vence ? ` (${fechaLarga(f.vence)})` : ""}` : "Sin pagar" });

  // El recálculo, con el municipio de la obra
  const municipioCorrecto = pedido?.obra.municipio ?? null;
  const descripcion = f.lineas.map((l) => l.descripcion).join(" · ");
  const porDefecto = pedido ? clasificacionPorDefecto(pedido.tipo, descripcion) : null;
  const concepto = (causacion?.conceptoRenta as ConceptoRenta | null) ?? porDefecto?.concepto ?? null;
  const actividad = causacion?.actividadIca ?? porDefecto?.actividad ?? null;
  const tarifaOk = municipioCorrecto ? e.tarifas.find((t) => t.municipio === municipioCorrecto) ?? null : null;
  const recalculo = proveedor && concepto && actividad && municipioCorrecto
    ? calcularRetenciones({ subtotal: f.subtotal, iva: f.iva, proveedor, concepto, actividadIca: actividad, municipioIca: municipioCorrecto, tarifaIca: tarifaOk })
    : null;

  const aplicado = pago ? { retenciones: pago.retenciones, totalRetenido: pago.retenciones.reduce((s, x) => s + x.valor, 0), pagado: pago.valorPagado, fecha: iso(pago.fecha)!, banco: pago.banco, referencia: pago.referencia } : null;
  const diferencias: Diferencia[] = [];
  if (aplicado && recalculo?.ok) {
    for (const clave of ["renta", "iva", "ica"] as const) {
      const a = aplicado.retenciones.find((x) => x.clave === clave);
      const c = recalculo.retenciones.find((x) => x.clave === clave);
      if (!a && !c) continue;
      const va = a?.valor ?? 0, vc = c?.valor ?? 0;
      const nombre = clave === "ica" ? "ReteICA" : c?.nombre ?? a!.nombre;
      diferencias.push({ clave, nombre, aplicado: va, correcto: vc, diferencia: va - vc, municipioAplicado: a?.municipio, municipioCorrecto: c?.municipio });
    }
  }
  const pagado = aplicado?.pagado ?? 0;
  const porReintegrar = diferencias.reduce((s, d) => s + d.diferencia, 0);

  const diagnostico = diagnosticar({ e, alertas, recalculo, aplicado, diferencias, municipioCorrecto, tarifaOk, hoy, porReintegrar });
  return {
    pasos, alertas, municipioCorrecto, concepto: concepto && actividad ? { concepto, actividad } : null, recalculo, aplicado, diferencias,
    facturado: f.total, pagado, diferenciaTotal: Math.round(f.total - pagado), porReintegrar, diagnostico,
  };
}

function diagnosticar(x: {
  e: EntradaRastreo; alertas: Alerta[]; recalculo: ResultadoRetenciones | null; aplicado: Rastreo["aplicado"]; diferencias: Diferencia[];
  municipioCorrecto: string | null; tarifaOk: TarifaIcaDato | null; hoy: Date; porReintegrar: number;
}): Diagnostico {
  const { e, alertas, aplicado, diferencias, municipioCorrecto } = x;
  const f = e.factura, pedido = e.pedido;
  const tiene = (t: Alerta["tipo"]) => alertas.some((a) => a.tipo === t);
  const porValidar = !!x.tarifaOk && x.tarifaOk.estado !== "verificada";
  const base = { porValidar };

  if (tiene("sin_pedido")) {
    return { ...base, tipo: "sin_pedido", esError: false, titulo: "La factura cita un pedido que no existe",
      explicacion: `La factura ${f.numero} cita el pedido ${f.pedidoNumero || "(vacío)"}, que no existe en S/4HANA. No se puede causar ni pagar sin pedido. Hay que pedirle al proveedor el número correcto o confirmar con Compras si el pedido se creó.`,
      responsable: COMPRAS, pendiente: null };
  }
  if (pedido && tiene("pedido_sin_liberar")) {
    return { ...base, tipo: "pedido_sin_liberar", esError: true, titulo: `El pedido ${pedido.numero} no está liberado`,
      explicacion: `El pedido ${pedido.numero} de ${pedido.obra.nombre} está pendiente de liberación. Sin liberación no se puede registrar la entrada ni causar la factura ${f.numero}. Le toca a ${pedido.obra.director}, director de la obra.`,
      responsable: { area: "direccion", nombre: pedido.obra.director, correo: pedido.obra.correoDirector },
      pendiente: { titulo: `Liberar el pedido ${pedido.numero}`, detalle: `El proveedor ${e.proveedor?.razonSocial ?? f.numero} reclama la factura ${f.numero} (${p$(f.total)}). El pedido ${pedido.numero} de ${pedido.obra.nombre} está pendiente de liberación: si la compra está aprobada, libéralo en S/4HANA para que el almacén registre la entrada y Cuentas por pagar pueda causar.` } };
  }
  if (pedido && tiene("sin_entrada")) {
    return { ...base, tipo: "entrada_sin_registrar", esError: true, titulo: `Falta la entrada de mercancías del pedido ${pedido.numero}`,
      explicacion: `El pedido ${pedido.numero} está liberado pero el almacén de ${pedido.obra.nombre} no ha registrado la entrada de mercancías. Sin entrada no hay contra qué pagar: la factura ${f.numero} está detenida. Le toca a ${pedido.obra.almacenista}.`,
      responsable: { area: "almacen", nombre: pedido.obra.almacenista, correo: pedido.obra.correoAlmacen },
      pendiente: { titulo: `Registrar la entrada del pedido ${pedido.numero}`, detalle: `El proveedor ${e.proveedor?.razonSocial ?? ""} reclama la factura ${f.numero} (${p$(f.total)}, vence ${f.vence ? fechaLarga(f.vence) : "sin fecha"}). El pedido ${pedido.numero} no tiene entrada de mercancías en S/4HANA. Si el material llegó a ${pedido.obra.nombre}, regístrala (MIGO) por lo recibido; si no llegó o llegó incompleto, avísale a Cuentas por pagar para responderle al proveedor.` } };
  }
  if (pedido && tiene("sin_hes")) {
    return { ...base, tipo: "hes_sin_registrar", esError: true, titulo: `Falta la HES del pedido ${pedido.numero}`,
      explicacion: `El pedido ${pedido.numero} no tiene hoja de entrada de servicios: la obra ${pedido.obra.nombre} no ha dicho que el servicio se prestó a satisfacción. La factura ${f.numero} está detenida. Le toca a ${pedido.obra.residente}.`,
      responsable: { area: "obra", nombre: pedido.obra.residente, correo: pedido.obra.correoResidente },
      pendiente: { titulo: `Registrar la HES del pedido ${pedido.numero}`, detalle: `El proveedor reclama la factura ${f.numero} (${p$(f.total)}). Si el servicio quedó bien, registra la HES en S/4HANA (ML81N) por ${p$(f.subtotal)}. Si hubo un problema, avísale a Cuentas por pagar.` } };
  }
  if (pedido && tiene("hes_sin_aceptar")) {
    return { ...base, tipo: "hes_sin_aceptar", esError: true, titulo: `La HES del pedido ${pedido.numero} espera aceptación`,
      explicacion: `La HES del pedido ${pedido.numero} está registrada pero le falta la segunda liberación de ${pedido.obra.director}. Sin aceptación no se causa la factura ${f.numero}.`,
      responsable: { area: "direccion", nombre: pedido.obra.director, correo: pedido.obra.correoDirector },
      pendiente: { titulo: `Aceptar la HES del pedido ${pedido.numero}`, detalle: `El proveedor reclama la factura ${f.numero} (${p$(f.total)}). La HES está registrada y espera tu aceptación en S/4HANA.` } };
  }
  if (tiene("valor_no_cuadra") || tiene("factura_vs_recibido") || tiene("proveedor_no_creado")) {
    const detalles = alertas.filter((a) => ["valor_no_cuadra", "factura_vs_recibido", "cantidad", "precio", "proveedor_no_creado"].includes(a.tipo)).map((a) => a.detalle);
    return { ...base, tipo: "valor_no_cuadra", esError: false, titulo: "La factura no cuadra con el pedido o con lo recibido",
      explicacion: `La factura ${f.numero} está detenida: ${detalles.join("; ")}. No se causa una parte: el proveedor tiene que emitir nota crédito o Compras ajustar el pedido si el cambio estaba negociado.`,
      responsable: COMPRAS, pendiente: null };
  }

  // Sin bloqueos: o está por pagar, o ya se pagó.
  if (!aplicado) {
    const causada = e.causacion?.estado === "lista";
    return { ...base, tipo: "pendiente_de_pago", esError: false, titulo: causada ? "Causada, se paga al vencimiento" : "Recibida, en turno para causar",
      explicacion: causada
        ? `La factura ${f.numero} está causada por ${p$(e.causacion!.neto)} neto y se paga al vencimiento${f.vence ? `, el ${fechaLarga(f.vence)}` : ""}.`
        : `La factura ${f.numero} no tiene bloqueos: pedido liberado y recibo registrado. Está en turno para causar.`,
      responsable: null, pendiente: null };
  }

  const ica = diferencias.find((d) => d.clave === "ica");
  if (ica && ica.municipioAplicado && municipioCorrecto && ica.municipioAplicado !== municipioCorrecto) {
    const sobra = ica.diferencia;
    return { ...base, tipo: "ica_municipio_errado", esError: true, titulo: `ICA retenido en ${ica.municipioAplicado}; el servicio se prestó en ${municipioCorrecto}`,
      explicacion: `En el pago de la factura ${f.numero} se retuvo ICA de ${ica.municipioAplicado} (${p$(ica.aplicado)}), que es el domicilio del proveedor. El pedido ${pedido?.numero} está imputado a ${pedido?.obra.nombre}, en ${municipioCorrecto}: el ICA va allá (Ley 1819 de 2016, art. 343), por ${p$(ica.correcto)}. ${sobra > 0 ? `Se le retuvieron ${p$(sobra)} de más al proveedor` : `Se le retuvieron ${p$(-sobra)} de menos`}, y la retención quedó declarada en el municipio equivocado.${porValidar ? ` La tarifa de ${municipioCorrecto} está por validar con Contabilidad.` : ""}`,
      responsable: CXP,
      pendiente: { titulo: `Corregir el ICA de la factura ${f.numero}`, detalle: `Se retuvo ICA de ${ica.municipioAplicado} por ${p$(ica.aplicado)} y correspondía ${municipioCorrecto} por ${p$(ica.correcto)}. ${sobra > 0 ? `Reintegrarle ${p$(sobra)} al proveedor` : `Cobrarle o asumir ${p$(-sobra)}`}, reversar la retención declarada en ${ica.municipioAplicado} y practicarla en ${municipioCorrecto}. Revisar con Impuestos si otras facturas de ${pedido?.obra.nombre} tienen el mismo error.` } };
  }
  const mal = diferencias.filter((d) => Math.abs(d.diferencia) > 1);
  if (mal.length) {
    return { ...base, tipo: "retencion_mal_calculada", esError: true, titulo: "Una retención no coincide con el recálculo",
      explicacion: `En el pago de la factura ${f.numero}: ${mal.map((d) => `${d.nombre} se aplicó por ${p$(d.aplicado)} y da ${p$(d.correcto)}`).join("; ")}. Diferencia neta ${p$(x.porReintegrar)}.`,
      responsable: CXP,
      pendiente: { titulo: `Revisar las retenciones de la factura ${f.numero}`, detalle: mal.map((d) => `${d.nombre}: aplicado ${p$(d.aplicado)}, recálculo ${p$(d.correcto)}`).join(". ") + "." } };
  }
  if (porValidar) {
    return { ...base, tipo: "tarifa_por_validar", esError: false, titulo: `El pago cuadra, pero la tarifa de ${municipioCorrecto} está por validar`,
      explicacion: `El pago de ${p$(aplicado.pagado)} coincide con el recálculo, pero la tarifa de ICA de ${municipioCorrecto} no está confirmada. Antes de explicársela al proveedor como cierta, Contabilidad tiene que validarla.`,
      responsable: CXP, pendiente: { titulo: `Validar la tarifa de ICA de ${municipioCorrecto}`, detalle: `Un proveedor pregunta por el ICA de la factura ${f.numero}. La tarifa cargada para ${municipioCorrecto} está «por validar»: confírmala contra el acuerdo municipal vigente y márcala en la tabla de ICA.` } };
  }
  return { ...base, tipo: "pago_correcto", esError: false, titulo: "El pago estuvo bien",
    explicacion: `Se pagaron ${p$(aplicado.pagado)} de una factura de ${p$(f.total)}. La diferencia de ${p$(f.total - aplicado.pagado)} son las retenciones de ley, y coinciden con el recálculo${municipioCorrecto ? ` (ICA de ${municipioCorrecto}, donde está la obra)` : ""}.`,
    responsable: null, pendiente: null };
}

/** ¿El pedido tiene una posición con lo pedido ya recibido? (para la pantalla) */
export const recibidoCompleto = (p: PedidoCruce) => p.posiciones.every((pos) => p.entradas.filter((x) => entradaValida(x) && x.posicion === pos.posicion).reduce((s, x) => s + x.cantidad, 0) >= pos.cantidad);

export { tarifaDe };
