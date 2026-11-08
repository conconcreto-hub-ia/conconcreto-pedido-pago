// El cruce de una factura contra el pedido, su liberación, las entradas (o HES) y el maestro de proveedores.
// Devuelve HECHOS (alertas verificables), no decisiones. Portado de preparar_lote.py, con dos hechos más
// que el skill no veía: el pedido sin liberar y la HES que espera su aceptación.

import { tolerancia } from "./retenciones";

export type LineaFactura = { descripcion: string; cantidad: number; unidad: string; precio: number; valor: number };

export type FacturaCruce = {
  numero: string;
  subtotal: number;
  iva: number;
  total: number;
  pedidoNumero: string | null;
  nota: string | null;
  ciudadEmisor: string | null;
  lineas: LineaFactura[];
};

export type ObraCruce = { codigo: string; pep: string; nombre: string; municipio: string; director: string; correoDirector: string; residente: string; correoResidente: string; almacenista: string; correoAlmacen: string };

export type EntradaCruce = { documento: string; tipo: "mercancia" | "hes"; posicion: number; cantidad: number; fecha: Date | string; estado: "contabilizada" | "aceptada" | "pendiente_aceptacion" | "anulada"; registradoPor?: string | null };

export type PedidoCruce = {
  numero: string;
  tipo: "material" | "servicio";
  liberacion: "liberado" | "pendiente" | "rechazado";
  liberadoPor?: string | null;
  liberadoEn?: Date | string | null;
  obra: ObraCruce;
  posiciones: { posicion: number; texto: string; cantidad: number; unidad: string; precio: number }[];
  entradas: EntradaCruce[];
};

export type ProveedorCruce = { razonSocial: string; ciudadDomicilio: string } | null;

export type TipoAlerta =
  | "proveedor_no_creado" | "sin_pedido" | "pedido_sin_liberar" | "sin_entrada" | "sin_hes" | "hes_sin_aceptar"
  | "valor_no_cuadra" | "cantidad" | "precio" | "factura_vs_recibido" | "municipio_distinto" | "nota_proveedor";

export type Alerta = { tipo: TipoAlerta; detalle: string };

/** Lo que impide causar sin importar el criterio: no hay contra qué pagar. */
export const BLOQUEANTES: TipoAlerta[] = ["proveedor_no_creado", "sin_pedido", "pedido_sin_liberar", "sin_entrada", "sin_hes", "hes_sin_aceptar", "valor_no_cuadra", "factura_vs_recibido"];

export const MOTIVO: Partial<Record<TipoAlerta, string>> = {
  proveedor_no_creado: "el proveedor no está creado en el maestro",
  sin_pedido: "no hay pedido en S/4HANA",
  pedido_sin_liberar: "el pedido no está liberado",
  sin_entrada: "el almacén no ha registrado la entrada de mercancías",
  sin_hes: "la obra no ha registrado la hoja de entrada de servicios",
  hes_sin_aceptar: "la hoja de entrada de servicios no está aceptada",
  valor_no_cuadra: "el valor no cuadra con el pedido",
  factura_vs_recibido: "facturan más de lo recibido",
};

const fmt = (n: number) => Math.round(n).toLocaleString("es-CO");
export const municipioBase = (c: string | null | undefined) => (c ?? "").replace(/\s*D\.?\s?C\.?$/i, "").trim();

/** Una entrada que cuenta como recibido: la mercancía contabilizada o la HES aceptada. */
export const entradaValida = (e: EntradaCruce) => e.estado === "contabilizada" || e.estado === "aceptada";

export function valorPedido(p: PedidoCruce) {
  return p.posiciones.reduce((s, x) => s + x.cantidad * x.precio, 0);
}

/** Lo recibido se valora al precio del pedido: es lo que la obra aceptó. */
export function valorRecibido(p: PedidoCruce) {
  return p.posiciones.reduce((s, pos) => {
    const cant = p.entradas.filter((e) => entradaValida(e) && e.posicion === pos.posicion).reduce((a, e) => a + e.cantidad, 0);
    return s + cant * pos.precio;
  }, 0);
}

export function cruzar(f: FacturaCruce, pedido: PedidoCruce | null, proveedor: ProveedorCruce): Alerta[] {
  const alertas: Alerta[] = [];
  if (!proveedor) alertas.push({ tipo: "proveedor_no_creado", detalle: "El NIT de la factura no está en el maestro de proveedores" });
  if (!pedido) {
    alertas.push({ tipo: "sin_pedido", detalle: `El pedido ${f.pedidoNumero || "(vacío)"} no existe en S/4HANA` });
  } else {
    if (pedido.liberacion !== "liberado") {
      alertas.push({ tipo: "pedido_sin_liberar", detalle: `El pedido ${pedido.numero} está ${pedido.liberacion === "rechazado" ? "rechazado" : "pendiente de liberación"}: le falta la firma de ${pedido.obra.director}` });
    }
    const validas = pedido.entradas.filter(entradaValida);
    if (pedido.tipo === "material" && !validas.length) {
      alertas.push({ tipo: "sin_entrada", detalle: `El pedido ${pedido.numero} no tiene entrada de mercancías: el almacén de ${pedido.obra.nombre} no ha registrado el recibo` });
    }
    if (pedido.tipo === "servicio" && !validas.length) {
      const pendientes = pedido.entradas.filter((e) => e.estado === "pendiente_aceptacion");
      if (pendientes.length) alertas.push({ tipo: "hes_sin_aceptar", detalle: `La HES ${pendientes.map((e) => e.documento).join(", ")} está registrada pero falta que ${pedido.obra.director} la acepte` });
      else alertas.push({ tipo: "sin_hes", detalle: `El pedido ${pedido.numero} no tiene hoja de entrada de servicios: la obra no ha dicho que el servicio se prestó a satisfacción` });
    }
    const vp = valorPedido(pedido);
    const dif = f.subtotal - vp;
    if (Math.abs(dif) > tolerancia(vp)) alertas.push({ tipo: "valor_no_cuadra", detalle: `Factura ${fmt(f.subtotal)} vs pedido ${fmt(vp)} (diferencia ${fmt(dif)})` });
    // Cantidades y precios por línea, emparejadas por orden
    f.lineas.forEach((ln, i) => {
      const p = pedido.posiciones[i];
      if (!p) return;
      if (Math.abs(ln.cantidad - p.cantidad) > 1e-9) alertas.push({ tipo: "cantidad", detalle: `«${ln.descripcion}»: facturan ${ln.cantidad} ${ln.unidad}, el pedido dice ${p.cantidad} ${p.unidad}` });
      if (Math.abs(ln.precio - p.precio) > 0.5) alertas.push({ tipo: "precio", detalle: `«${ln.descripcion}»: precio facturado ${fmt(ln.precio)}, pactado ${fmt(p.precio)}` });
    });
    if (validas.length) {
      const rec = valorRecibido(pedido);
      if (Math.abs(f.subtotal - rec) > tolerancia(rec)) alertas.push({ tipo: "factura_vs_recibido", detalle: `Facturan ${fmt(f.subtotal)} y la obra recibió ${fmt(rec)} a precio de pedido` });
    }
    const dom = municipioBase(proveedor?.ciudadDomicilio ?? f.ciudadEmisor);
    if (dom && dom !== pedido.obra.municipio) alertas.push({ tipo: "municipio_distinto", detalle: `Proveedor domiciliado en ${dom}; la obra del pedido está en ${pedido.obra.municipio}` });
  }
  if (f.nota) alertas.push({ tipo: "nota_proveedor", detalle: f.nota });
  return alertas;
}

export const bloqueantes = (a: Alerta[]) => a.filter((x) => BLOQUEANTES.includes(x.tipo));
