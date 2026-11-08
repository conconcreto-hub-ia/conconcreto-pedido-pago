// El menú de esta app: vive aquí y en ningún otro sitio. La barra lateral (barra-cliente.tsx) es la misma
// en las cuatro apps; lo que cambia es esto.
import type { IconoMenu } from "./iconos-menu";
export const APP = { nombre: "Pedido a pago", descripcion: "Del pedido al pago de cada factura de proveedor" };

export type ItemNav = { href: string; etiqueta: string; icono: IconoMenu; soloAdmin?: boolean; tambien?: string[] };

export const NAV: ItemNav[] = [
  { href: "/", etiqueta: "Rastrear", icono: "rastrear", tambien: ["/facturas"] },
  { href: "/reclamos", etiqueta: "Reclamos", icono: "reclamos" },
  { href: "/causacion", etiqueta: "Causación", icono: "causacion" },
  { href: "/pagos", etiqueta: "Pagos", icono: "pagos" },
  { href: "/pendientes", etiqueta: "Pendientes", icono: "pendientes" },
  { href: "/ica", etiqueta: "ICA por municipio", icono: "mapa" },
  { href: "/bitacora", etiqueta: "Bitácora", icono: "bitacora" },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "usuarios", soloAdmin: true },
];
