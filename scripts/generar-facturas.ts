// Genera los XML de la DIAN de las facturas que no vienen del programa (datos/demo.ts · FACTURAS_NUEVAS),
// en el mismo formato UBL 2.1 que los del skill de causación. Quedan en datos/facturas/historico/.
//
//   npx tsx scripts/generar-facturas.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CLIENTE, FACTURAS_NUEVAS, PROVEEDORES, dv } from "../datos/demo";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const m = (n: number) => n.toFixed(2);
const dir = path.join(__dirname, "..", "datos", "facturas", "historico");
fs.mkdirSync(dir, { recursive: true });

for (const f of FACTURAS_NUEVAS) {
  const p = PROVEEDORES.find((x) => x.acreedor === f.acreedor)!;
  const id = `${f.prefijo}${f.numero}`;
  const lineas = f.lineas.map(([d, c, u, pr]) => ({ d, c, u, pr, v: c * pr, iva: Math.round(c * pr * 0.19) }));
  const sub = lineas.reduce((s, l) => s + l.v, 0), iva = lineas.reduce((s, l) => s + l.iva, 0);
  const cufe = crypto.createHash("sha384").update(`${id}${f.fecha}${sub}${p.nit}${CLIENTE.nit}`).digest("hex");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Factura electrónica de DEMOSTRACIÓN · no es un documento tributario real -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ID>${id}</cbc:ID>
  <cbc:UUID schemeID="1" schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${f.fecha}</cbc:IssueDate>
  <cbc:IssueTime>10:00:00-05:00</cbc:IssueTime>
  <cbc:DueDate>${f.vence}</cbc:DueDate>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
${f.nota ? `  <cbc:Note>${esc(f.nota)}</cbc:Note>\n` : ""}  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${lineas.length}</cbc:LineCountNumeric>
  <cac:OrderReference><cbc:ID>${f.pedido}</cbc:ID></cac:OrderReference>
  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(p.razonSocial)}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${esc(p.razonSocial)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${dv(p.nit)}" schemeName="31">${p.nit}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">O-13</cbc:TaxLevelCode>
        <cac:RegistrationAddress>
          <cbc:CityName>${esc(p.ciudadDomicilio)}</cbc:CityName>
          <cbc:CountrySubentity>${esc(p.departamento)}</cbc:CountrySubentity>
          <cac:AddressLine><cbc:Line>${esc(p.direccion)}</cbc:Line></cac:AddressLine>
          <cac:Country><cbc:IdentificationCode>CO</cbc:IdentificationCode></cac:Country>
        </cac:RegistrationAddress>
        <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:IndustryClassificationCode>${p.ciiu}</cac:IndustryClassificationCode>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${CLIENTE.razon}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${CLIENTE.dv}" schemeName="31">${CLIENTE.nit}</cbc:CompanyID>
        <cac:RegistrationAddress>
          <cbc:CityName>${CLIENTE.ciudad}</cbc:CityName>
          <cbc:CountrySubentity>${CLIENTE.depto}</cbc:CountrySubentity>
          <cac:AddressLine><cbc:Line>${CLIENTE.direccion}</cbc:Line></cac:AddressLine>
        </cac:RegistrationAddress>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:ID>2</cbc:ID><cbc:PaymentMeansCode>42</cbc:PaymentMeansCode><cbc:PaymentDueDate>${f.vence}</cbc:PaymentDueDate></cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${m(iva)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${m(sub)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${m(iva)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:Percent>19.00</cbc:Percent><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${m(sub)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${m(sub)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${m(sub + iva)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${m(sub + iva)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineas.map((l, i) => `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${l.u}">${l.c}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${m(l.v)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">${m(l.iva)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="COP">${m(l.v)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="COP">${m(l.iva)}</cbc:TaxAmount>
        <cac:TaxCategory><cbc:Percent>19.00</cbc:Percent><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item><cbc:Description>${esc(l.d)}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="COP">${m(l.pr)}</cbc:PriceAmount><cbc:BaseQuantity unitCode="${l.u}">1</cbc:BaseQuantity></cac:Price>
  </cac:InvoiceLine>`).join("\n")}
</Invoice>
`;
  const archivo = path.join(dir, `${f.prefijo}-${f.numero}.xml`);
  fs.writeFileSync(archivo, xml, "utf8");
  console.log(`${path.basename(archivo)} · subtotal ${sub.toLocaleString("es-CO")} · IVA ${iva.toLocaleString("es-CO")}`);
}
