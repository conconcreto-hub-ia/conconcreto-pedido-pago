// Las retenciones de una factura. Código puro, sin base ni modelo: la misma entrada da siempre el mismo
// resultado y se prueba con tests (src/lib/__tests__/retenciones.test.ts).
//
// Portado de conconcreto-causacion (scripts/causar.py y references/tarifas_2026.json). Los parámetros
// nacionales viven aquí con su norma; el ICA por municipio es un DATO de la tabla TarifaIca (editable en /ica).
//
//   · UVT 2026: $52.374 (Resolución DIAN 000238 de 2025).
//   · Decreto 572 de 2025, vigente desde el 1-jul-2026: compras 10 UVT, servicios 2 UVT.
//   · ReteIVA 15 % del IVA (art. 437-1 E.T.), con las mismas cuantías mínimas de renta. No entre grandes contribuyentes.
//   · ReteICA: en servicios, donde se ejecuta (Ley 1819 de 2016, art. 343, num. 3). El municipio sale del PEP
//     del pedido → maestro de obras. Nunca del domicilio del proveedor ni de una nota en la factura.

export const UVT = 52374;

export const RENTA = {
  compras: { nombre: "Compras generales (declarante)", baseUvt: 10, tarifa: 0.025, cuenta: "236540", norma: "Decreto 572 de 2025 · base 10 UVT · tarifa 2,5 %" },
  servicios: { nombre: "Servicios generales (declarante)", baseUvt: 2, tarifa: 0.04, cuenta: "236525", norma: "Decreto 572 de 2025 · base 2 UVT · tarifa 4 %" },
  arrendamiento_muebles: { nombre: "Arrendamiento de bienes muebles", baseUvt: 0, tarifa: 0.04, cuenta: "236530", norma: "Art. 1.2.4.4.10 DUR 1625 de 2016 · sin base mínima · 4 %" },
  construccion: { nombre: "Contratos de construcción", baseUvt: 10, tarifa: 0.02, cuenta: "236535", norma: "Decreto 572 de 2025 · base 10 UVT · tarifa 2 %" },
} as const;

export type ConceptoRenta = keyof typeof RENTA;
export const CONCEPTOS = Object.keys(RENTA) as ConceptoRenta[];
export const ACTIVIDADES_ICA = ["servicios", "comercial", "industrial", "construccion", "*"] as const;
export type ActividadIca = (typeof ACTIVIDADES_ICA)[number];

export const RETEIVA = { tarifa: 0.15, cuenta: "236705", norma: "Art. 437-1 E.T. · 15 % del IVA · mismas cuantías mínimas de renta" };

export const CUENTAS = {
  materiales: { cuenta: "710505", nombre: "Costo de obra · materiales" },
  servicios_obra: { cuenta: "740505", nombre: "Costo de obra · contratos de servicios" },
  arrendamientos: { cuenta: "732005", nombre: "Costo de obra · arrendamiento de equipos" },
  iva_descontable: { cuenta: "240810", nombre: "IVA descontable" },
  proveedores: { cuenta: "220505", nombre: "Proveedores nacionales" },
  costos_por_pagar: { cuenta: "233525", nombre: "Costos y gastos por pagar · servicios" },
} as const;
export type CuentaCosto = "materiales" | "servicios_obra" | "arrendamientos";

/** Diferencia que se tolera entre factura y pedido: 0,5 % o $50.000, lo que sea mayor. */
export const TOLERANCIA = { pct: 0.005, abs: 50000 };
export const tolerancia = (valor: number) => Math.max(TOLERANCIA.abs, Math.abs(valor) * TOLERANCIA.pct);

export type TarifaIcaDato = {
  municipio: string;
  tarifas: Record<string, number>; // por mil, por actividad; "*" = todas
  baseUvt: number;
  cuenta: string;
  norma: string;
  estado: "verificada" | "por_validar";
  fuente?: string | null;
};

export type CalidadTributaria = {
  granContribuyente: boolean;
  autorretenedorRenta: boolean;
  autorretenedorIca: boolean;
  resolucionAutorretencion?: string | null;
};

export type Retencion = {
  clave: "renta" | "iva" | "ica";
  nombre: string;
  concepto: string;
  base: number;
  tarifa: number | null; // null = no se practica
  porMil?: number;
  valor: number;
  cuenta: string;
  nota: string;
  municipio?: string;
  porValidar?: boolean; // la tarifa de ICA no está confirmada
};

export type ResultadoRetenciones =
  | { ok: true; retenciones: Retencion[]; totalRetenido: number; neto: number; porValidar: boolean }
  | { ok: false; revisar: string };

const r = (n: number) => Math.round(n);
export const pesosSimples = (n: number) => `$${r(n).toLocaleString("es-CO")}`;

/** La tarifa por mil de una actividad en un municipio, o null si no está cargada. */
export function tarifaDe(t: TarifaIcaDato | null | undefined, actividad: string): number | null {
  if (!t) return null;
  const v = t.tarifas[actividad] ?? t.tarifas["*"];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function calcularRetenciones(args: {
  subtotal: number;
  iva: number;
  proveedor: CalidadTributaria;
  concepto: ConceptoRenta;
  actividadIca: string;
  municipioIca: string;
  tarifaIca: TarifaIcaDato | null;
}): ResultadoRetenciones {
  const { subtotal: sub, iva, proveedor: p } = args;
  const concepto = RENTA[args.concepto];
  if (!concepto) return { ok: false, revisar: `El concepto de renta «${args.concepto}» no existe` };
  const baseRenta = concepto.baseUvt * UVT;
  const ret: Retencion[] = [];

  // Renta
  if (p.autorretenedorRenta) {
    ret.push({ clave: "renta", nombre: "Retención en la fuente · renta", concepto: concepto.nombre, base: sub, tarifa: null, valor: 0, cuenta: concepto.cuenta,
      nota: `No se practica: el proveedor es autorretenedor${p.resolucionAutorretencion ? ` (${p.resolucionAutorretencion})` : ""}` });
  } else if (sub < baseRenta) {
    ret.push({ clave: "renta", nombre: "Retención en la fuente · renta", concepto: concepto.nombre, base: sub, tarifa: null, valor: 0, cuenta: concepto.cuenta,
      nota: `No se practica: ${pesosSimples(sub)} no alcanza la base de ${concepto.baseUvt} UVT (${pesosSimples(baseRenta)})` });
  } else {
    ret.push({ clave: "renta", nombre: "Retención en la fuente · renta", concepto: concepto.nombre, base: sub, tarifa: concepto.tarifa, valor: r(sub * concepto.tarifa), cuenta: concepto.cuenta, nota: concepto.norma });
  }

  // IVA
  if (iva > 0) {
    if (p.granContribuyente) {
      ret.push({ clave: "iva", nombre: "Retención de IVA", concepto: "15 % del IVA", base: iva, tarifa: null, valor: 0, cuenta: RETEIVA.cuenta, nota: "No se practica: el proveedor también es gran contribuyente" });
    } else if (sub < baseRenta) {
      ret.push({ clave: "iva", nombre: "Retención de IVA", concepto: "15 % del IVA", base: iva, tarifa: null, valor: 0, cuenta: RETEIVA.cuenta, nota: `No se practica: la operación no alcanza la base de ${concepto.baseUvt} UVT` });
    } else {
      ret.push({ clave: "iva", nombre: "Retención de IVA", concepto: "15 % del IVA", base: iva, tarifa: RETEIVA.tarifa, valor: r(iva * RETEIVA.tarifa), cuenta: RETEIVA.cuenta, nota: RETEIVA.norma });
    }
  }

  // ICA · el municipio lo decide el pedido, no el domicilio
  const muni = args.municipioIca;
  const t = args.tarifaIca;
  const tar = tarifaDe(t, args.actividadIca);
  if (!t || tar === null) return { ok: false, revisar: `La tarifa de ICA de ${muni} para «${args.actividadIca}» no está cargada en la tabla de ICA` };
  const baseIca = t.baseUvt * UVT;
  const porValidar = t.estado !== "verificada";
  const nombreIca = `ReteICA ${muni}`;
  if (p.autorretenedorIca) {
    ret.push({ clave: "ica", nombre: nombreIca, concepto: args.actividadIca, base: sub, tarifa: null, valor: 0, cuenta: t.cuenta, municipio: muni, nota: "No se practica: el proveedor es autorretenedor de ICA" });
  } else if (sub < baseIca) {
    ret.push({ clave: "ica", nombre: nombreIca, concepto: args.actividadIca, base: sub, tarifa: null, valor: 0, cuenta: t.cuenta, municipio: muni, porValidar, nota: `No se practica: no alcanza la base de ${t.baseUvt} UVT (${pesosSimples(baseIca)})` });
  } else {
    ret.push({ clave: "ica", nombre: nombreIca, concepto: args.actividadIca, base: sub, tarifa: tar / 1000, porMil: tar, valor: r((sub * tar) / 1000), cuenta: t.cuenta, municipio: muni, porValidar, nota: t.norma });
  }

  const totalRetenido = ret.reduce((s, x) => s + x.valor, 0);
  return { ok: true, retenciones: ret, totalRetenido, neto: r(sub + iva - totalRetenido), porValidar };
}

export type LineaAsiento = { cuenta: string; nombre: string; debito: number; credito: number };

const NOMBRE_RET: Record<string, string> = {
  "236540": "Retención en la fuente · compras", "236525": "Retención en la fuente · servicios", "236530": "Retención en la fuente · arrendamientos",
  "236535": "Retención en la fuente · construcción", "236705": "Retención de IVA por pagar",
};

/** El asiento de causación. Débitos = créditos siempre (lo prueba el test). */
export function asiento(args: { subtotal: number; iva: number; cuentaCosto: CuentaCosto; retenciones: Retencion[]; neto: number; proveedor: string }): LineaAsiento[] {
  const cc = CUENTAS[args.cuentaCosto];
  const cxp = CUENTAS[args.cuentaCosto === "materiales" ? "proveedores" : "costos_por_pagar"];
  const a: LineaAsiento[] = [{ cuenta: cc.cuenta, nombre: cc.nombre, debito: r(args.subtotal), credito: 0 }];
  if (args.iva) a.push({ cuenta: CUENTAS.iva_descontable.cuenta, nombre: CUENTAS.iva_descontable.nombre, debito: r(args.iva), credito: 0 });
  for (const x of args.retenciones) if (x.valor) a.push({ cuenta: x.cuenta, nombre: NOMBRE_RET[x.cuenta] ?? x.nombre, debito: 0, credito: x.valor });
  a.push({ cuenta: cxp.cuenta, nombre: `${cxp.nombre} · ${args.proveedor}`, debito: 0, credito: args.neto });
  return a;
}

/** Clasificación por defecto cuando no hay criterio de una persona o del modelo. Equipo con operador es
 *  servicio; equipo sin operador es arrendamiento de bien mueble. */
export function clasificacionPorDefecto(tipo: "material" | "servicio", descripcion: string): { concepto: ConceptoRenta; actividad: ActividadIca; cuenta: CuentaCosto } {
  if (tipo === "material") return { concepto: "compras", actividad: "comercial", cuenta: "materiales" };
  const d = descripcion.toLowerCase();
  if (/(alquiler|arrendamiento)/.test(d) && !/operador/.test(d)) return { concepto: "arrendamiento_muebles", actividad: "*", cuenta: "arrendamientos" };
  return { concepto: "servicios", actividad: "servicios", cuenta: "servicios_obra" };
}
