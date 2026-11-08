import { describe, it, expect, beforeEach } from "vitest";
import { hechosDe, plantilla } from "../respuesta";
import { rastrear } from "../rastreo";
import { calcularRetenciones, type TarifaIcaDato } from "../retenciones";
import { cifrasDe, cifrasNoRespaldadas, puedeEnviarA } from "../envio";
import { fecha, fechaLarga, pesos, nombrePropio } from "../formato";
import type { PedidoCruce } from "../cruce";

const MED: TarifaIcaDato = { municipio: "Medellín", tarifas: { "*": 2 }, baseUvt: 15, cuenta: "236805", norma: "Acuerdo 066", estado: "verificada" };
const RIO: TarifaIcaDato = { municipio: "Rionegro", tarifas: { servicios: 8 }, baseUvt: 10, cuenta: "236810", norma: "Acuerdo 023", estado: "verificada" };
const prov = { razonSocial: "LA LADERA", ciudadDomicilio: "Rionegro", nit: "901377219", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false };
const obra = { codigo: "OB-2041", pep: "C-2041-01", nombre: "Torre Ciudad del Río", municipio: "Medellín", director: "D", correoDirector: "d@x.co", residente: "R", correoResidente: "r@x.co", almacenista: "Marta Lucía Giraldo", correoAlmacen: "a@x.co" };
const pedido: PedidoCruce = { numero: "4500128942", tipo: "servicio", liberacion: "liberado", obra, posiciones: [{ posicion: 10, texto: "Montaje", cantidad: 1, unidad: "SV", precio: 12_400_000 }], entradas: [{ documento: "1", tipo: "hes", posicion: 10, cantidad: 1, fecha: "2026-09-30", estado: "aceptada" }] };
const factura = { numero: "LAD-1021", subtotal: 12_400_000, iva: 2_356_000, total: 14_756_000, pedidoNumero: "4500128942", nota: null, ciudadEmisor: "Rionegro", fecha: "2026-10-02", vence: "2026-11-01", estado: "pagada", lineas: [{ descripcion: "Montaje", cantidad: 1, unidad: "SV", precio: 12_400_000, valor: 12_400_000 }] };

function pagadoCon(t: TarifaIcaDato) {
  const r = calcularRetenciones({ subtotal: 12_400_000, iva: 2_356_000, proveedor: prov, concepto: "servicios", actividadIca: "servicios", municipioIca: t.municipio, tarifaIca: t });
  if (!r.ok) throw new Error();
  return rastrear({ factura, proveedor: prov, pedido, tarifas: [MED, RIO],
    causacion: { estado: "lista", origen: "sap", conceptoRenta: "servicios", actividadIca: "servicios", municipioIca: t.municipio, retenciones: r.retenciones, totalRetenido: r.totalRetenido, neto: r.neto, causadoEn: "2026-10-06" },
    pagos: [{ fecha: "2026-10-30", valorPagado: r.neto, retenciones: r.retenciones, banco: "Bancolombia · corriente ****7710", referencia: "1500034471" }] });
}

describe("las fechas son de Colombia", () => {
  it("«2026-10-30» es el 30, no el 29 (medianoche UTC)", () => { expect(fechaLarga("2026-10-30")).toBe("30 de octubre de 2026"); expect(fecha("2026-10-30")).toMatch(/^30 /); });
  it("una fecha con hora se respeta", () => expect(fechaLarga(new Date("2026-10-30T17:00:00Z"))).toBe("30 de octubre de 2026"));
});

describe("los hechos de la respuesta", () => {
  it("el pago del ICA errado: fecha correcta, cifras exactas y lo que se reintegra", () => {
    const { hechos, cifras } = hechosDe(pagadoCon(RIO), factura, { numero: "4500128942", obra }, { mostrarBanco: true });
    expect(hechos.pago).toMatchObject({ fecha: "30 de octubre de 2026", valor: "$13.807.400", banco: "Bancolombia · corriente ****7710" });
    expect(hechos.porReintegrar).toBe("$74.400");
    expect(hechos.icaAplicado).toEqual({ municipio: "Rionegro", valor: "$99.200" });
    expect(hechos.icaCorrecto).toMatchObject({ municipio: "Medellín", valor: "$24.800" });
    for (const n of [13_807_400, 74_400, 99_200, 24_800, 948_600, 14_756_000]) expect(cifras).toContain(n);
  });
  it("sin el correo registrado no viajan datos bancarios", () => expect(hechosDe(pagadoCon(MED), factura, null, { mostrarBanco: false }).hechos.pago?.banco).toBeNull());
  it("sin pago no se habla de retenciones ni de neto", () => {
    const r = rastrear({ factura, proveedor: prov, pedido: { ...pedido, entradas: [] }, causacion: null, pagos: [], tarifas: [MED] });
    const { hechos } = hechosDe(r, factura, { numero: pedido.numero, obra }, { mostrarBanco: true });
    expect(hechos.retenciones).toEqual([]);
    expect(hechos.icaCorrecto).toBeNull();
    expect(hechos.nota).toMatch(/No hables de retenciones/);
    expect(hechos.queFalta).toMatch(/hoja de entrada/);
  });
});

describe("la plantilla (la red cuando el modelo falla)", () => {
  it("ICA errado: dice el error, cuánto se reintegra y que está en revisión", () => {
    const { hechos, cifras } = hechosDe(pagadoCon(RIO), factura, { numero: "4500128942", obra }, { mostrarBanco: true });
    const t = plantilla(hechos, "Marta");
    expect(t).toMatch(/Rionegro/); expect(t).toMatch(/Medellín/); expect(t).toMatch(/\$74\.400/); expect(t).toMatch(/revisión/);
    expect(cifrasNoRespaldadas(t, cifras)).toEqual([]);
    expect(t).toMatch(/Cuentas por pagar · Constructora Conconcreto S\.A\.$/);
  });
  it("pago correcto: la lista de retenciones y el municipio de la obra", () => {
    const { hechos, cifras } = hechosDe(pagadoCon(MED), factura, { numero: "4500128942", obra }, { mostrarBanco: true });
    const t = plantilla(hechos, "Marta");
    expect(t).toMatch(/El ICA se retiene en Medellín/);
    expect(cifrasNoRespaldadas(t, cifras)).toEqual([]);
  });
  it("entrada sin registrar: sin nombres internos", () => {
    const r = rastrear({ factura, proveedor: prov, pedido: { ...pedido, tipo: "material", entradas: [] }, causacion: null, pagos: [], tarifas: [MED] });
    const t = plantilla(hechosDe(r, factura, { numero: pedido.numero, obra }, { mostrarBanco: true }).hechos, "Marta");
    expect(t).toMatch(/almacén de obra/);
    expect(t).not.toMatch(/Marta Lucía|Giraldo/);
  });
  it("ninguna plantilla usa voseo", () => {
    for (const tipo of ["pago_correcto", "ica_municipio_errado", "entrada_sin_registrar", "valor_no_cuadra", "sin_pedido", "pendiente_de_pago", "factura_no_encontrada"]) {
      const { hechos } = hechosDe(pagadoCon(RIO), factura, { numero: "4500128942", obra }, { mostrarBanco: true });
      expect(plantilla({ ...hechos, tipo }, "Marta")).not.toMatch(/\bvos\b|ten[eé]s\b|pod[eé]s\b|quer[eé]s\b|necesit[aá]s\b|\bJP\b/);
    }
  });
});

describe("solo cifras del cálculo", () => {
  it("lee las cifras en pesos de un texto", () => expect(cifrasDe("te pagamos $20.711.100 y se retuvo $148.800, más $ 500")).toEqual([20_711_100, 148_800, 500]));
  it("señala la que el código no calculó", () => expect(cifrasNoRespaldadas("se reintegran $74.400 y $1.000.000", [74_400])).toEqual([1_000_000]));
});

describe("modo prueba: a quién puede escribir el agente", () => {
  beforeEach(() => { process.env.ENVIO_DOMINIOS_PERMITIDOS = "agentmail.to"; });
  it("deja los buzones de prueba", () => expect(puedeEnviarA("prueba-jhon-cc@agentmail.to")).toBe(true));
  it("bloquea un proveedor real y a Conconcreto", () => { expect(puedeEnviarA("facturacion@acerosaburra.co")).toBe(false); expect(puedeEnviarA("cuentasporpagar@conconcreto.com")).toBe(false); });
  it("no se engaña con un dominio que termina parecido", () => expect(puedeEnviarA("x@notagentmail.to")).toBe(false));
  it("sin variable, solo agentmail.to", () => { delete process.env.ENVIO_DOMINIOS_PERMITIDOS; expect(puedeEnviarA("compras@conconcreto.com")).toBe(false); });
});

describe("formato", () => {
  it("pesos exactos", () => { expect(pesos(20_711_100)).toBe("$20.711.100"); expect(pesos(-74_400)).toBe("−$74.400"); });
  it("razón social a nombre propio", () => expect(nombrePropio("SUMINISTROS Y MONTAJES LA LADERA S.A.S.")).toBe("Suministros y Montajes La Ladera"));
});
