// Usuarios de prueba, uno por rol, con una clave que pasas tú (no queda escrita en ningún archivo).
// Sirven para recorrer las pantallas y probar el acceso. Se borran al terminar.
//
//   npx tsx scripts/usuarios-prueba.ts crear <clave>
//   npx tsx scripts/usuarios-prueba.ts borrar
//
// Todos tienen correo @pedidopago.test: un dominio que no existe, así que nunca reciben nada.
import "./_env";
import { db } from "../src/lib/db";
import { cifrarClave, problemaDeClave } from "../src/lib/auth/clave";
import type { Rol } from "@prisma/client";

const DOMINIO = "@pedidopago.test";
const USUARIOS: { correo: string; nombre: string; rol: Rol }[] = [
  { correo: `admin${DOMINIO}`, nombre: "Administración (prueba)", rol: "admin" },
  { correo: `cxp${DOMINIO}`, nombre: "Cuentas por pagar (prueba)", rol: "cxp" },
  { correo: `tesoreria${DOMINIO}`, nombre: "Tesorería (prueba)", rol: "tesoreria" },
  { correo: `consulta${DOMINIO}`, nombre: "Consulta (prueba)", rol: "consulta" },
];

(async () => {
  const [accion, clave] = process.argv.slice(2);
  if (accion === "borrar") {
    const r = await db.usuario.deleteMany({ where: { correo: { endsWith: DOMINIO } } });
    console.log(`Borrados ${r.count} usuarios de prueba (${DOMINIO}).`);
    return;
  }
  if (accion !== "crear" || !clave) { console.log("Uso: npx tsx scripts/usuarios-prueba.ts crear <clave> | borrar"); process.exit(1); }
  const problema = problemaDeClave(clave);
  if (problema) { console.log(problema); process.exit(1); }
  const hash = await cifrarClave(clave);
  for (const u of USUARIOS) {
    await db.usuario.upsert({ where: { correo: u.correo }, update: { ...u, hash, debeCambiarClave: false, activo: true }, create: { ...u, hash, debeCambiarClave: false } });
    console.log(`${u.rol.padEnd(10)} ${u.correo}`);
  }
})().finally(() => db.$disconnect());
