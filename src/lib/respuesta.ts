// Los hechos que puede contar una respuesta al proveedor, y la plantilla que se usa si el modelo falla o
// escribe una cifra que el código no calculó. Código puro: se prueba en __tests__/respuesta.test.ts.

import type { Rastreo } from "./rastreo";
import { pesos, porMil, porciento, fechaLarga } from "./formato";

export const FIRMA = "Cuentas por pagar · Constructora Conconcreto S.A.";

export type Hechos = {
  factura: string;
  totalFactura: string;
  subtotal: string;
  pedido: string | null;
  obra: string | null;
  municipioObra: string | null;
  tipo: string;
  esError: boolean;
  pago: { fecha: string; valor: string; banco: string | null; comprobante: string } | null;
  retenciones: { nombre: string; base: string; tarifa: string | null; valor: string; nota: string }[];
  diferencia: string; // facturado − pagado
  porReintegrar: string | null;
  icaAplicado: { municipio: string; valor: string } | null;
  icaCorrecto: { municipio: string; valor: string; tarifa: string | null; porValidar: boolean } | null;
  queFalta: string | null; // lo que se le dice al proveedor que está pendiente (sin nombres internos)
  nota: string | null; // lo que el redactor tiene que tener presente
  vence: string | null;
};


const QUE_FALTA: Record<string, string> = {
  entrada_sin_registrar: "el registro de la entrada del material en nuestro almacén de obra",
  hes_sin_registrar: "el registro de la hoja de entrada del servicio por parte de la obra",
  hes_sin_aceptar: "la aceptación de la hoja de entrada del servicio por parte de la dirección de la obra",
  pedido_sin_liberar: "la liberación del pedido por parte de la dirección de la obra",
};

/** Los hechos, ya formateados, y la lista de cifras que la respuesta puede usar. */
export function hechosDe(r: Rastreo, f: { numero: string; total: number; subtotal: number; vence: Date | string | null }, pedido: { numero: string; obra: { nombre: string; municipio: string } } | null, opciones: { mostrarBanco: boolean }): { hechos: Hechos; cifras: number[] } {
  const cifras: number[] = [f.total, f.subtotal, r.pagado, r.diferenciaTotal, Math.abs(r.porReintegrar)];
  // Sin pago no se habla de retenciones: se practican al causar, y contarlas antes confunde («el neto es…»).
  const fuente = r.aplicado?.retenciones ?? [];
  const retenciones = fuente.filter((x) => x.valor > 0).map((x) => {
    cifras.push(x.valor, x.base);
    return { nombre: x.nombre, base: pesos(x.base), tarifa: x.porMil ? porMil(x.porMil) : x.tarifa ? porciento(x.tarifa) : null, valor: pesos(x.valor), nota: x.nota };
  });
  const icaA = r.diferencias.find((d) => d.clave === "ica");
  const icaC = r.recalculo?.ok ? r.recalculo.retenciones.find((x) => x.clave === "ica") : undefined;
  if (icaA) cifras.push(icaA.aplicado, icaA.correcto);
  if (icaC) cifras.push(icaC.valor, icaC.base);
  if (r.recalculo?.ok) cifras.push(r.recalculo.neto, r.recalculo.totalRetenido);
  if (r.aplicado) cifras.push(r.aplicado.totalRetenido);

  const hechos: Hechos = {
    factura: f.numero,
    totalFactura: pesos(f.total),
    subtotal: pesos(f.subtotal),
    pedido: pedido?.numero ?? null,
    obra: pedido?.obra.nombre ?? null,
    municipioObra: pedido?.obra.municipio ?? null,
    tipo: r.diagnostico.tipo,
    esError: r.diagnostico.esError,
    pago: r.aplicado ? { fecha: fechaLarga(r.aplicado.fecha), valor: pesos(r.aplicado.pagado), banco: opciones.mostrarBanco ? r.aplicado.banco : null, comprobante: r.aplicado.referencia } : null,
    retenciones,
    diferencia: pesos(r.diferenciaTotal),
    porReintegrar: r.porReintegrar ? pesos(Math.abs(r.porReintegrar)) : null,
    icaAplicado: icaA?.municipioAplicado ? { municipio: icaA.municipioAplicado, valor: pesos(icaA.aplicado) } : null,
    icaCorrecto: r.aplicado && icaC?.municipio ? { municipio: icaC.municipio, valor: pesos(icaC.valor), tarifa: icaC.porMil ? porMil(icaC.porMil) : null, porValidar: !!icaC.porValidar } : null,
    queFalta: QUE_FALTA[r.diagnostico.tipo] ?? null,
    nota: r.aplicado ? null : "La factura no se ha pagado. No hables de retenciones ni de cuánto se le va a pagar: las retenciones de ley se practican al causarla y el valor neto se informa con el pago.",
    vence: f.vence ? fechaLarga(f.vence) : null,
  };
  return { hechos, cifras: cifras.filter((n) => Number.isFinite(n) && n > 0) };
}

/** La respuesta de plantilla. Es la red: si el modelo no está o se sale de los hechos, sale esta. */
export function plantilla(h: Hechos, saludo: string): string {
  const L: string[] = [`Hola, ${saludo}:`, ""];
  const lista = h.retenciones.map((x) => `• ${x.nombre}${x.tarifa ? ` (${x.tarifa} sobre ${x.base})` : ""}: ${x.valor}`);
  switch (h.tipo) {
    case "pago_correcto":
    case "tarifa_por_validar":
      L.push(`Revisamos tu factura ${h.factura} por ${h.totalFactura}. El ${h.pago!.fecha} te pagamos ${h.pago!.valor}${h.pago!.banco ? ` en tu cuenta ${h.pago!.banco}` : ""} (comprobante ${h.pago!.comprobante}).`, "",
        `La diferencia de ${h.diferencia} corresponde a las retenciones de ley que Conconcreto practica y declara a tu nombre:`, ...lista, "");
      if (h.icaCorrecto && h.municipioObra) L.push(`El ICA se retiene en ${h.municipioObra} porque ahí se prestó el servicio: el pedido ${h.pedido} es de la obra ${h.obra}.`, "");
      if (h.tipo === "tarifa_por_validar") L.push("Estamos confirmando con Contabilidad la tarifa vigente del municipio; si cambia algo, te escribimos.", "");
      L.push("El pago está completo. Puedes descontar estas retenciones en tus declaraciones con los certificados que expedimos.");
      break;
    case "ica_municipio_errado":
      L.push(`Revisamos tu factura ${h.factura} por ${h.totalFactura}. El ${h.pago!.fecha} te pagamos ${h.pago!.valor} (comprobante ${h.pago!.comprobante}).`, "",
        `Encontramos un error de nuestra parte: la retención de ICA se practicó en ${h.icaAplicado!.municipio} por ${h.icaAplicado!.valor}, y el servicio se prestó en ${h.municipioObra}, en la obra ${h.obra}. Allá corresponde ${h.icaCorrecto!.valor}${h.icaCorrecto!.tarifa ? ` (${h.icaCorrecto!.tarifa} sobre ${h.subtotal})` : ""}.`, "",
        `El caso quedó en revisión en Cuentas por pagar. Si se confirma, te reintegramos ${h.porReintegrar} y corregimos la retención para que quede declarada en ${h.municipioObra}. Te escribimos por este mismo hilo cuando esté listo.`);
      break;
    case "retencion_mal_calculada":
      L.push(`Revisamos tu factura ${h.factura} por ${h.totalFactura} y encontramos una diferencia en las retenciones que estamos revisando en Cuentas por pagar.`, "", "Te escribimos por este mismo hilo con el resultado.");
      break;
    case "entrada_sin_registrar":
    case "hes_sin_registrar":
    case "hes_sin_aceptar":
    case "pedido_sin_liberar":
      L.push(`Revisamos tu factura ${h.factura} por ${h.totalFactura}${h.pedido ? `, del pedido ${h.pedido}` : ""}. Todavía no la hemos podido pagar porque falta ${h.queFalta}.`, "",
        "No es algo que tengas que hacer tú: ya le dejamos el pendiente al responsable en la obra. El caso está en revisión y, apenas quede registrado, la factura sigue su curso de pago. Te escribimos por este mismo hilo.");
      break;
    case "valor_no_cuadra":
      L.push(`Revisamos tu factura ${h.factura} por ${h.totalFactura}. No la hemos podido causar porque no coincide con lo pactado en el pedido ${h.pedido ?? ""} o con lo que recibió la obra.`, "",
        "Te pedimos emitir una nota crédito por la diferencia, o anular la factura y reexpedirla por lo pedido. Si el cambio de precio o de cantidad lo acordaste con Compras, cuéntanos con quién para que ajusten el pedido.");
      break;
    case "sin_pedido":
      L.push(`Revisamos tu factura ${h.factura}. El número de pedido que trae no aparece en nuestro sistema, y sin pedido no la podemos causar.`, "", "¿Nos confirmas el número del pedido de compra que te envió Conconcreto? Con eso la revisamos de nuevo.");
      break;
    case "pendiente_de_pago":
      L.push(`Revisamos tu factura ${h.factura} por ${h.totalFactura}. No tiene ningún bloqueo: está causada y se paga al vencimiento${h.vence ? `, el ${h.vence}` : ""}.`);
      break;
    default:
      L.push("Recibimos tu correo. Para revisar tu caso necesitamos el número de la factura o del pedido de compra. ¿Nos lo compartes?");
  }
  L.push("", FIRMA);
  return L.join("\n");
}
