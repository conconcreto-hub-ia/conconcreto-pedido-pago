import { describe, it, expect } from "vitest";
import { calcularRetenciones, asiento, clasificacionPorDefecto, tarifaDe, UVT, type TarifaIcaDato, type CalidadTributaria } from "../retenciones";
import { dv } from "../../../datos/demo";

const MED: TarifaIcaDato = { municipio: "Medellín", tarifas: { "*": 2 }, baseUvt: 15, cuenta: "236805", norma: "Acuerdo 066", estado: "verificada" };
const RIO: TarifaIcaDato = { municipio: "Rionegro", tarifas: { servicios: 8, comercial: 8, industrial: 4 }, baseUvt: 10, cuenta: "236810", norma: "Acuerdo 023", estado: "verificada" };
const BOG: TarifaIcaDato = { municipio: "Bogotá", tarifas: { construccion: 8.66 }, baseUvt: 4, cuenta: "236815", norma: "Acuerdo 65", estado: "por_validar" };
const normal: CalidadTributaria = { granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false };
const valor = (r: ReturnType<typeof calcularRetenciones>, clave: "renta" | "iva" | "ica") => (r.ok ? r.retenciones.find((x) => x.clave === clave)?.valor : NaN);

describe("retenciones 2026 · los casos del lote 1 del programa", () => {
  it("FEAD-18734 · compra de acero en Medellín: 2,5 % + 15 % del IVA + 2 ‰", () => {
    const r = calcularRetenciones({ subtotal: 34_560_000, iva: 6_566_400, proveedor: normal, concepto: "compras", actividadIca: "comercial", municipioIca: "Medellín", tarifaIca: MED });
    expect(r.ok).toBe(true);
    expect(valor(r, "renta")).toBe(864_000);
    expect(valor(r, "iva")).toBe(984_960);
    expect(valor(r, "ica")).toBe(69_120);
    if (r.ok) { expect(r.totalRetenido).toBe(1_918_080); expect(r.neto).toBe(39_208_320); }
  });
  it("BES-4471 · bombeo con operador en Rionegro: servicio 4 % + ICA de Rionegro 8 ‰", () => {
    const r = calcularRetenciones({ subtotal: 24_800_000, iva: 4_712_000, proveedor: normal, concepto: "servicios", actividadIca: "servicios", municipioIca: "Rionegro", tarifaIca: RIO });
    expect(valor(r, "renta")).toBe(992_000);
    expect(valor(r, "iva")).toBe(706_800);
    expect(valor(r, "ica")).toBe(198_400);
    if (r.ok) expect(r.neto).toBe(27_614_800);
  });
  it("ATC-30218 · autorretenedor de renta: no se le retiene renta, sí IVA e ICA", () => {
    const r = calcularRetenciones({ subtotal: 9_600_000, iva: 1_824_000, proveedor: { ...normal, autorretenedorRenta: true, resolucionAutorretencion: "Res. 000417" }, concepto: "arrendamiento_muebles", actividadIca: "*", municipioIca: "Medellín", tarifaIca: MED });
    expect(valor(r, "renta")).toBe(0);
    expect(valor(r, "iva")).toBe(273_600);
    expect(valor(r, "ica")).toBe(19_200);
    if (r.ok) expect(r.neto).toBe(11_131_200);
  });
  it("SS-2290 · $412.000 no alcanza ninguna base: neto = total", () => {
    const r = calcularRetenciones({ subtotal: 412_000, iva: 78_280, proveedor: normal, concepto: "compras", actividadIca: "comercial", municipioIca: "Medellín", tarifaIca: MED });
    if (!r.ok) throw new Error();
    expect(r.totalRetenido).toBe(0);
    expect(r.neto).toBe(490_280);
    expect(r.retenciones.find((x) => x.clave === "renta")!.nota).toMatch(/10 UVT/);
  });
});

describe("las bases mínimas y las excepciones", () => {
  it("servicios: 2 UVT es el umbral exacto", () => {
    const base = 2 * UVT;
    expect(valor(calcularRetenciones({ subtotal: base - 1, iva: 0, proveedor: normal, concepto: "servicios", actividadIca: "servicios", municipioIca: "Rionegro", tarifaIca: RIO }), "renta")).toBe(0);
    expect(valor(calcularRetenciones({ subtotal: base, iva: 0, proveedor: normal, concepto: "servicios", actividadIca: "servicios", municipioIca: "Rionegro", tarifaIca: RIO }), "renta")).toBe(Math.round(base * 0.04));
  });
  it("arrendamiento de muebles no tiene base mínima", () => expect(valor(calcularRetenciones({ subtotal: 100_000, iva: 0, proveedor: normal, concepto: "arrendamiento_muebles", actividadIca: "*", municipioIca: "Medellín", tarifaIca: MED }), "renta")).toBe(4_000));
  it("entre grandes contribuyentes no hay ReteIVA", () => expect(valor(calcularRetenciones({ subtotal: 10_000_000, iva: 1_900_000, proveedor: { ...normal, granContribuyente: true }, concepto: "compras", actividadIca: "comercial", municipioIca: "Medellín", tarifaIca: MED }), "iva")).toBe(0));
  it("autorretenedor de ICA: no se retiene ICA", () => expect(valor(calcularRetenciones({ subtotal: 10_000_000, iva: 0, proveedor: { ...normal, autorretenedorIca: true }, concepto: "compras", actividadIca: "comercial", municipioIca: "Medellín", tarifaIca: MED }), "ica")).toBe(0));
  it("ICA en Medellín: por debajo de 15 UVT no se practica", () => expect(valor(calcularRetenciones({ subtotal: 15 * UVT - 1, iva: 0, proveedor: normal, concepto: "compras", actividadIca: "comercial", municipioIca: "Medellín", tarifaIca: MED }), "ica")).toBe(0));
});

describe("el ICA se retiene donde se presta el servicio", () => {
  it("el mismo servicio da distinto según el municipio", () => {
    const en = (t: TarifaIcaDato, act: string) => valor(calcularRetenciones({ subtotal: 12_400_000, iva: 2_356_000, proveedor: normal, concepto: "servicios", actividadIca: act, municipioIca: t.municipio, tarifaIca: t }), "ica");
    expect(en(MED, "servicios")).toBe(24_800); // 2 ‰
    expect(en(RIO, "servicios")).toBe(99_200); // 8 ‰
  });
  it("un municipio sin tarifa sale «revisar», no se inventa", () => {
    const r = calcularRetenciones({ subtotal: 6_400_000, iva: 1_216_000, proveedor: normal, concepto: "servicios", actividadIca: "servicios", municipioIca: "Guarne", tarifaIca: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.revisar).toMatch(/Guarne/);
  });
  it("una actividad sin tarifa en el municipio también", () => expect(calcularRetenciones({ subtotal: 9_600_000, iva: 0, proveedor: normal, concepto: "arrendamiento_muebles", actividadIca: "*", municipioIca: "Rionegro", tarifaIca: RIO }).ok).toBe(false));
  it("una tarifa por validar se calcula pero queda marcada", () => {
    const r = calcularRetenciones({ subtotal: 10_000_000, iva: 0, proveedor: normal, concepto: "construccion", actividadIca: "construccion", municipioIca: "Bogotá", tarifaIca: BOG });
    expect(r.ok && r.porValidar).toBe(true);
    expect(valor(r, "ica")).toBe(86_600);
  });
  it("tarifaDe usa el «*» cuando la actividad no tiene propia", () => { expect(tarifaDe(MED, "industrial")).toBe(2); expect(tarifaDe(RIO, "construccion")).toBeNull(); });
});

describe("el asiento", () => {
  it("débitos = créditos", () => {
    const r = calcularRetenciones({ subtotal: 24_800_000, iva: 4_712_000, proveedor: normal, concepto: "servicios", actividadIca: "servicios", municipioIca: "Rionegro", tarifaIca: RIO });
    if (!r.ok) throw new Error();
    const a = asiento({ subtotal: 24_800_000, iva: 4_712_000, cuentaCosto: "servicios_obra", retenciones: r.retenciones, neto: r.neto, proveedor: "Bombeos" });
    expect(a.reduce((s, x) => s + x.debito, 0)).toBe(a.reduce((s, x) => s + x.credito, 0));
    expect(a.at(-1)!.cuenta).toBe("233525");
  });
});

describe("clasificación por defecto", () => {
  it("alquiler sin operador es arrendamiento", () => expect(clasificacionPorDefecto("servicio", "Alquiler andamio multidireccional").concepto).toBe("arrendamiento_muebles"));
  it("alquiler CON operador es servicio", () => expect(clasificacionPorDefecto("servicio", "Alquiler de minicargador con operador").concepto).toBe("servicios"));
  it("material es compra", () => expect(clasificacionPorDefecto("material", "Varilla").concepto).toBe("compras"));
});

describe("dígito de verificación", () => {
  it("Conconcreto 890.901.110-8", () => expect(dv("890901110")).toBe("8"));
});
