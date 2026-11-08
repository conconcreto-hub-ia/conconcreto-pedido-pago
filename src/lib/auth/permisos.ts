// Qué puede hacer cada rol. Un solo lugar: las acciones lo exigen y las pantallas lo consultan.
import type { Rol } from "@prisma/client";

export const PERMISOS = {
  ver: ["admin", "cxp", "tesoreria", "consulta"],
  "reclamos.aprobar": ["admin", "cxp"], // aprobar, editar o descartar la respuesta a un proveedor
  "buzon.revisar": ["admin", "cxp"],
  "causacion.correr": ["admin", "cxp"],
  "ica.editar": ["admin", "cxp"],
  "pendientes.cerrar": ["admin", "cxp"],
  "envio.configurar": ["admin"], // prender el envío directo de un tipo de caso
  "usuarios.administrar": ["admin"],
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof PERMISOS;

export const puede = (rol: Rol | null | undefined, p: Permiso) => !!rol && (PERMISOS[p] as readonly Rol[]).includes(rol);

export const ROL: Record<Rol, { etiqueta: string; detalle: string }> = {
  admin: { etiqueta: "Administrador", detalle: "Todo, maneja los usuarios y las reglas de envío" },
  cxp: { etiqueta: "Cuentas por pagar", detalle: "Aprueba las respuestas a proveedores, causa lotes, edita el ICA y cierra pendientes" },
  tesoreria: { etiqueta: "Tesorería", detalle: "Ve los pagos y los pendientes" },
  consulta: { etiqueta: "Consulta", detalle: "Ve todo, no cambia nada" },
};
