// Etiquetas y tonos de los enums. Un solo lugar: ninguna pantalla escribe su propia versión.
import type { TipoCaso, EstadoReclamo, Area, EstadoFactura, EstadoCausacion, EstadoTarifa, Identificacion, Liberacion, EstadoEntrada } from "@prisma/client";

export type Tono = "neutro" | "verde" | "oro" | "rojo" | "noche";

export const TIPO_CASO: Record<TipoCaso, { etiqueta: string; tono: Tono; detalle: string }> = {
  pago_correcto: { etiqueta: "El pago estuvo bien", tono: "verde", detalle: "Se explica de dónde sale la diferencia" },
  pendiente_de_pago: { etiqueta: "Causada, por pagar", tono: "neutro", detalle: "Está en plazo: se dice cuándo se paga" },
  ica_municipio_errado: { etiqueta: "ICA en otro municipio", tono: "rojo", detalle: "Se retuvo donde vive el proveedor y no donde se prestó el servicio" },
  retencion_mal_calculada: { etiqueta: "Retención mal calculada", tono: "rojo", detalle: "El valor retenido no coincide con el recálculo" },
  sin_pedido: { etiqueta: "Sin pedido", tono: "oro", detalle: "La factura cita un pedido que no existe" },
  pedido_sin_liberar: { etiqueta: "Pedido sin liberar", tono: "rojo", detalle: "El director de obra no ha liberado el pedido" },
  entrada_sin_registrar: { etiqueta: "Entrada sin registrar", tono: "rojo", detalle: "El almacén no registró la entrada de mercancías" },
  hes_sin_registrar: { etiqueta: "HES sin registrar", tono: "rojo", detalle: "La obra no registró la hoja de entrada de servicios" },
  hes_sin_aceptar: { etiqueta: "HES sin aceptar", tono: "rojo", detalle: "La HES espera la segunda liberación" },
  valor_no_cuadra: { etiqueta: "No cuadra con el pedido", tono: "oro", detalle: "Hace falta nota crédito o ajustar el pedido" },
  tarifa_por_validar: { etiqueta: "Tarifa por validar", tono: "oro", detalle: "La tarifa del municipio no está confirmada" },
  factura_no_encontrada: { etiqueta: "Factura no encontrada", tono: "oro", detalle: "No se encontró la factura que menciona" },
  no_identificado: { etiqueta: "No identificado", tono: "neutro", detalle: "No se sabe qué proveedor escribe" },
};

export const ESTADO_RECLAMO: Record<EstadoReclamo, { etiqueta: string; tono: Tono }> = {
  por_aprobar: { etiqueta: "Por aprobar", tono: "oro" },
  enviado: { etiqueta: "Respondido", tono: "verde" },
  bloqueado: { etiqueta: "Retenido · modo prueba", tono: "neutro" },
  descartado: { etiqueta: "Descartado", tono: "neutro" },
};

export const AREA: Record<Area, { etiqueta: string; detalle: string }> = {
  almacen: { etiqueta: "Almacén", detalle: "Registra las entradas de mercancías" },
  obra: { etiqueta: "Obra", detalle: "Registra las hojas de entrada de servicios" },
  direccion: { etiqueta: "Dirección de obra", detalle: "Libera pedidos y hojas de entrada" },
  cxp: { etiqueta: "Cuentas por pagar", detalle: "Causa y practica las retenciones" },
  compras: { etiqueta: "Compras", detalle: "Crea y modifica los pedidos" },
};

export const ESTADO_FACTURA: Record<EstadoFactura, { etiqueta: string; tono: Tono }> = {
  recibida: { etiqueta: "Recibida", tono: "neutro" },
  causada: { etiqueta: "Causada", tono: "verde" },
  detenida: { etiqueta: "Detenida", tono: "rojo" },
  revisar: { etiqueta: "Revisar", tono: "oro" },
  pagada: { etiqueta: "Pagada", tono: "verde" },
};

export const ESTADO_CAUSACION: Record<EstadoCausacion, { etiqueta: string; tono: Tono }> = {
  lista: { etiqueta: "Lista para causar", tono: "verde" },
  detenida: { etiqueta: "Detenida", tono: "rojo" },
  revisar: { etiqueta: "Revisar", tono: "oro" },
};

export const ESTADO_TARIFA: Record<EstadoTarifa, { etiqueta: string; tono: Tono }> = {
  verificada: { etiqueta: "Verificada", tono: "verde" },
  por_validar: { etiqueta: "Por validar con Contabilidad", tono: "oro" },
};

export const IDENTIFICACION: Record<Identificacion, string> = {
  correo_registrado: "Por el correo registrado en el maestro",
  nit_en_texto: "Por el NIT que escribió (el correo no está registrado)",
  no_identificado: "Sin identificar",
};

export const LIBERACION: Record<Liberacion, string> = { liberado: "Liberado", pendiente: "Pendiente de liberación", rechazado: "Rechazado" };
export const ESTADO_ENTRADA: Record<EstadoEntrada, string> = { contabilizada: "Contabilizada", aceptada: "Aceptada", pendiente_aceptacion: "Pendiente de aceptación", anulada: "Anulada" };
