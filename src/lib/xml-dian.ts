// Lee una factura electrónica UBL 2.1 de la DIAN. Solo los campos que usa la causación, sin dependencias:
// los nombres de las etiquetas UBL son fijos y el XML de la DIAN no anida dos facturas en un archivo.

import type { LineaFactura } from "./cruce";

export type FacturaXml = {
  idDian: string;
  cufe: string | null;
  fecha: string;
  vence: string | null;
  nota: string | null;
  pedido: string | null;
  nit: string;
  razon: string;
  ciudad: string | null;
  subtotal: number;
  iva: number;
  total: number;
  lineas: LineaFactura[];
};

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodificar = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => (e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(e[1] === "x" ? 2 : 1), e[1] === "x" ? 16 : 10)) : ENT[e] ?? m));

const abre = (nombre: string) => `<${nombre}(?:\\s[^>]*)?>`;

/** El texto de la primera etiqueta `nombre` dentro de `xml`, o null. */
function tag(xml: string, nombre: string): string | null {
  const m = xml.match(new RegExp(`${abre(nombre)}([\\s\\S]*?)</${nombre}>`));
  return m ? decodificar(m[1].trim()) : null;
}
function bloque(xml: string, nombre: string): string | null {
  const m = xml.match(new RegExp(`${abre(nombre)}[\\s\\S]*?</${nombre}>`));
  return m ? m[0] : null;
}
function bloques(xml: string, nombre: string): string[] {
  return xml.match(new RegExp(`${abre(nombre)}[\\s\\S]*?</${nombre}>`, "g")) ?? [];
}
const num = (s: string | null) => (s ? Number(s) : 0);

export function leerFacturaXml(xml: string): FacturaXml {
  if (!/<Invoice[\s>]/.test(xml)) throw new Error("No es una factura electrónica UBL (no tiene <Invoice>).");
  // Los campos de primer nivel están antes del primer bloque cac:
  const corte = xml.search(/<cac:/);
  const cabecera = corte === -1 ? xml : xml.slice(0, corte);
  const proveedor = bloque(xml, "cac:AccountingSupplierParty") ?? "";
  const totales = bloque(xml, "cac:LegalMonetaryTotal") ?? "";
  // El IVA total es el TaxTotal de primer nivel, no el de cada línea.
  const sinLineas = xml.replace(/<cac:InvoiceLine[\s>][\s\S]*?<\/cac:InvoiceLine>/g, "");
  const impuesto = bloque(sinLineas, "cac:TaxTotal") ?? "";
  const idDian = tag(cabecera, "cbc:ID");
  const nit = tag(proveedor, "cbc:CompanyID");
  if (!idDian || !nit) throw new Error("La factura no trae número o NIT del emisor.");

  const lineas = bloques(xml, "cac:InvoiceLine").map((l) => {
    const q = l.match(/<cbc:InvoicedQuantity(?:\s+unitCode="([^"]*)")?[^>]*>([^<]*)</);
    return {
      descripcion: tag(l, "cbc:Description") ?? "",
      cantidad: q ? Number(q[2]) : 0,
      unidad: q?.[1] ?? "",
      precio: num(tag(bloque(l, "cac:Price") ?? "", "cbc:PriceAmount")),
      valor: num(tag(l, "cbc:LineExtensionAmount")),
    };
  });

  return {
    idDian, nit,
    cufe: tag(cabecera, "cbc:UUID"),
    fecha: tag(cabecera, "cbc:IssueDate") ?? "",
    vence: tag(cabecera, "cbc:DueDate"),
    nota: tag(cabecera, "cbc:Note"),
    pedido: tag(bloque(xml, "cac:OrderReference") ?? "", "cbc:ID"),
    razon: tag(proveedor, "cbc:RegistrationName") ?? tag(proveedor, "cbc:Name") ?? "",
    ciudad: tag(proveedor, "cbc:CityName"),
    subtotal: num(tag(totales, "cbc:TaxExclusiveAmount")),
    iva: num(tag(impuesto, "cbc:TaxAmount")),
    total: num(tag(totales, "cbc:PayableAmount")),
    lineas,
  };
}

/** «BES4471» → «BES-4471»: como lo escribe el proveedor. */
export const numeroLegible = (idDian: string) => idDian.replace(/^([A-Z]+)(\d+)$/, "$1-$2");
