import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { leerFacturaXml, numeroLegible } from "../xml-dian";

const RAIZ = path.join(__dirname, "../../../datos/facturas");
const leer = (lote: string, archivo: string) => leerFacturaXml(fs.readFileSync(path.join(RAIZ, lote, archivo), "utf8"));

describe("factura electrónica UBL de la DIAN", () => {
  it("lee BES-4471: número, pedido, NIT, totales, nota y líneas", () => {
    const f = leer("lote-1", "BES-4471_Bombeos.xml");
    expect(f.idDian).toBe("BES4471");
    expect(f.pedido).toBe("4500128904");
    expect(f.nit).toBe("900917264");
    expect(f.ciudad).toBe("Bogotá D.C.");
    expect(f.subtotal).toBe(24_800_000);
    expect(f.iva).toBe(4_712_000); // el TaxTotal de la factura, no el de una línea
    expect(f.total).toBe(29_512_000);
    expect(f.nota).toMatch(/Bogotá/);
    expect(f.lineas).toHaveLength(2);
    expect(f.lineas[0]).toMatchObject({ cantidad: 620, unidad: "M3", precio: 38_000, valor: 23_560_000 });
    expect(f.fecha).toBe("2026-09-30");
  });
  it("las generadas para el histórico se leen igual", () => {
    expect(leer("historico", "LAD-1021.xml")).toMatchObject({ idDian: "LAD1021", pedido: "4500128942", nit: "901377219", subtotal: 12_400_000, iva: 2_356_000, total: 14_756_000 });
  });
  it("todas las facturas de datos/ se leen sin error", () => {
    for (const lote of ["lote-1", "lote-2", "historico"]) for (const a of fs.readdirSync(path.join(RAIZ, lote))) expect(() => leer(lote, a)).not.toThrow();
  });
  it("un archivo que no es factura se rechaza", () => expect(() => leerFacturaXml("<Hola/>")).toThrow(/UBL/));
  it("FEAD18734 → FEAD-18734", () => expect(numeroLegible("FEAD18734")).toBe("FEAD-18734"));
});
