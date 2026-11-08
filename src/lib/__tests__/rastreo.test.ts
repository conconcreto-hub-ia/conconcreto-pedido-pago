import { describe, it, expect } from "vitest";
import { rastrear, type EntradaRastreo } from "../rastreo";
import { calcularRetenciones, type TarifaIcaDato } from "../retenciones";
import type { ObraCruce, PedidoCruce } from "../cruce";

const MED: TarifaIcaDato = { municipio: "Medellín", tarifas: { "*": 2 }, baseUvt: 15, cuenta: "236805", norma: "Acuerdo 066", estado: "verificada" };
const RIO: TarifaIcaDato = { municipio: "Rionegro", tarifas: { servicios: 8, comercial: 8, industrial: 4 }, baseUvt: 10, cuenta: "236810", norma: "Acuerdo 023", estado: "verificada" };
const ENV: TarifaIcaDato = { municipio: "Envigado", tarifas: {}, baseUvt: 0, cuenta: "236820", norma: "Sin cargar", estado: "por_validar" };
const tarifas = [MED, RIO, ENV];

const obra = (municipio: string, nombre: string): ObraCruce => ({ codigo: "OB", pep: "C-1", nombre, municipio, director: "Director", correoDirector: "dir@x.co", residente: "Residente", correoResidente: "res@x.co", almacenista: "Almacenista", correoAlmacen: "alm@x.co" });
const ladera = { razonSocial: "LA LADERA", ciudadDomicilio: "Rionegro", nit: "901377219", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false };

function servicio(municipio: string, subtotal: number, extra: Partial<PedidoCruce> = {}): PedidoCruce {
  return { numero: "4500128942", tipo: "servicio", liberacion: "liberado", liberadoPor: "Director", obra: obra(municipio, municipio === "Medellín" ? "Torre Ciudad del Río" : "Bodega B"),
    posiciones: [{ posicion: 10, texto: "Montaje", cantidad: 1, unidad: "SV", precio: subtotal }],
    entradas: [{ documento: "1000045548", tipo: "hes", posicion: 10, cantidad: 1, fecha: "2026-09-30", estado: "aceptada" }], ...extra };
}
const factura = (subtotal: number, iva: number) => ({ numero: "LAD-1021", subtotal, iva, total: subtotal + iva, pedidoNumero: "4500128942", nota: null as string | null, ciudadEmisor: "Rionegro" as string | null, fecha: "2026-10-02", vence: "2026-11-01", estado: "pagada",
  lineas: [{ descripcion: "Montaje de red contra incendio", cantidad: 1, unidad: "SV", precio: subtotal, valor: subtotal }] });

/** Un pago con las retenciones calculadas en el municipio `aplicado`. */
function pagoCon(aplicado: TarifaIcaDato, sub: number, iva: number) {
  const r = calcularRetenciones({ subtotal: sub, iva, proveedor: ladera, concepto: "servicios", actividadIca: "servicios", municipioIca: aplicado.municipio, tarifaIca: aplicado });
  if (!r.ok) throw new Error();
  return { causacion: { estado: "lista" as const, origen: "sap" as const, conceptoRenta: "servicios", actividadIca: "servicios", municipioIca: aplicado.municipio, retenciones: r.retenciones, totalRetenido: r.totalRetenido, neto: r.neto, causadoEn: "2026-10-06" },
    pagos: [{ fecha: "2026-10-30", valorPagado: r.neto, retenciones: r.retenciones, banco: "Bancolombia", referencia: "1500034471" }] };
}

describe("el rastreador", () => {
  it("pagó bien: la diferencia son las retenciones de ley (LAD-1008)", () => {
    const e: EntradaRastreo = { factura: { ...factura(18_600_000, 3_534_000), numero: "LAD-1008" }, proveedor: ladera, pedido: servicio("Rionegro", 18_600_000), ...pagoCon(RIO, 18_600_000, 3_534_000), tarifas };
    const r = rastrear(e);
    expect(r.diagnostico.tipo).toBe("pago_correcto");
    expect(r.diagnostico.esError).toBe(false);
    expect(r.pagado).toBe(20_711_100);
    expect(r.diferenciaTotal).toBe(1_422_900); // 744.000 + 530.100 + 148.800
    expect(r.porReintegrar).toBe(0);
    expect(r.pasos.map((p) => p.estado)).toEqual(["ok", "ok", "ok", "ok", "ok", "ok", "ok"]);
  });

  it("ICA del domicilio (Rionegro) en un servicio de Medellín: se retuvieron $74.400 de más (LAD-1021)", () => {
    const e: EntradaRastreo = { factura: factura(12_400_000, 2_356_000), proveedor: ladera, pedido: servicio("Medellín", 12_400_000), ...pagoCon(RIO, 12_400_000, 2_356_000), tarifas };
    const r = rastrear(e);
    expect(r.diagnostico.tipo).toBe("ica_municipio_errado");
    expect(r.diagnostico.esError).toBe(true);
    expect(r.diagnostico.responsable?.area).toBe("cxp");
    const ica = r.diferencias.find((d) => d.clave === "ica")!;
    expect(ica).toMatchObject({ aplicado: 99_200, correcto: 24_800, diferencia: 74_400, municipioAplicado: "Rionegro", municipioCorrecto: "Medellín" });
    expect(r.porReintegrar).toBe(74_400);
    expect(r.pagado).toBe(13_807_400);
    expect(r.diagnostico.pendiente?.detalle).toMatch(/\$74\.400/);
  });

  it("material sin entrada de mercancías: pendiente para el almacén (LAD-2210)", () => {
    const pedido: PedidoCruce = { numero: "4500129015", tipo: "material", liberacion: "liberado", obra: obra("Envigado", "Hotel Distrito Envigado"), entradas: [],
      posiciones: [{ posicion: 10, texto: "Tubería", cantidad: 300, unidad: "UN", precio: 41_500 }, { posicion: 20, texto: "Válvula", cantidad: 24, unidad: "UN", precio: 168_000 }] };
    const r = rastrear({ factura: { ...factura(16_482_000, 3_131_580), numero: "LAD-2210", pedidoNumero: "4500129015", lineas: [{ descripcion: "Tubería", cantidad: 300, unidad: "UN", precio: 41_500, valor: 12_450_000 }, { descripcion: "Válvula", cantidad: 24, unidad: "UN", precio: 168_000, valor: 4_032_000 }] },
      proveedor: ladera, pedido, causacion: null, pagos: [], tarifas });
    expect(r.diagnostico.tipo).toBe("entrada_sin_registrar");
    expect(r.diagnostico.responsable).toMatchObject({ area: "almacen", nombre: "Almacenista", correo: "alm@x.co" });
    expect(r.pasos.find((p) => p.clave === "entrada")!.estado).toBe("error");
    expect(r.pagado).toBe(0);
  });

  it("pedido sin liberar va antes que la entrada que falta: la causa es la liberación", () => {
    const pedido: PedidoCruce = { numero: "4500129170", tipo: "material", liberacion: "pendiente", obra: obra("Medellín", "Torre"), entradas: [], posiciones: [{ posicion: 10, texto: "Conduit", cantidad: 400, unidad: "UN", precio: 18_900 }] };
    const r = rastrear({ factura: { ...factura(7_560_000, 1_436_400), numero: "TAS-6188", pedidoNumero: "4500129170", lineas: [{ descripcion: "Conduit", cantidad: 400, unidad: "UN", precio: 18_900, valor: 7_560_000 }] }, proveedor: ladera, pedido, causacion: null, pagos: [], tarifas });
    expect(r.diagnostico.tipo).toBe("pedido_sin_liberar");
    expect(r.diagnostico.responsable?.area).toBe("direccion");
  });

  it("HES registrada sin aceptar: pendiente para el director", () => {
    const r = rastrear({ factura: factura(12_400_000, 2_356_000), proveedor: ladera, tarifas, causacion: null, pagos: [],
      pedido: servicio("Medellín", 12_400_000, { entradas: [{ documento: "1000045999", tipo: "hes", posicion: 10, cantidad: 1, fecha: "2026-10-01", estado: "pendiente_aceptacion" }] }) });
    expect(r.diagnostico.tipo).toBe("hes_sin_aceptar");
    expect(r.pasos.find((p) => p.clave === "aceptacion")!.estado).toBe("error");
  });

  it("la factura cita un pedido que no existe", () => {
    const r = rastrear({ factura: { ...factura(20_250_000, 3_847_500), pedidoNumero: "4500129140" }, proveedor: ladera, pedido: null, causacion: null, pagos: [], tarifas });
    expect(r.diagnostico.tipo).toBe("sin_pedido");
    expect(r.pasos[0].estado).toBe("error");
  });

  it("facturan más de lo que se pidió: no cuadra, nota crédito", () => {
    const r = rastrear({ factura: factura(14_000_000, 2_660_000), proveedor: ladera, pedido: servicio("Medellín", 12_400_000), causacion: null, pagos: [], tarifas });
    expect(r.diagnostico.tipo).toBe("valor_no_cuadra");
    expect(r.diagnostico.esError).toBe(false);
  });

  it("sin bloqueos y sin pago: está por pagar", () => {
    const { causacion } = pagoCon(MED, 12_400_000, 2_356_000);
    const r = rastrear({ factura: factura(12_400_000, 2_356_000), proveedor: ladera, pedido: servicio("Medellín", 12_400_000), causacion, pagos: [], tarifas });
    expect(r.diagnostico.tipo).toBe("pendiente_de_pago");
    expect(r.pasos.at(-1)!.estado).toBe("espera");
  });

  it("el municipio sale del pedido aunque la factura diga otra ciudad", () => {
    const r = rastrear({ factura: { ...factura(12_400_000, 2_356_000), nota: "Retener ICA en Rionegro, por favor", ciudadEmisor: "Rionegro" }, proveedor: ladera, pedido: servicio("Medellín", 12_400_000), causacion: null, pagos: [], tarifas });
    expect(r.municipioCorrecto).toBe("Medellín");
    expect(r.recalculo?.ok && r.recalculo.retenciones.find((x) => x.clave === "ica")!.valor).toBe(24_800);
    expect(r.alertas.some((a) => a.tipo === "municipio_distinto")).toBe(true);
  });
});
