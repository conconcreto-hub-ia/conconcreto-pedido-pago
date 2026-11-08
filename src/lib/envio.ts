// A quién puede escribir el agente. Mientras se prueba, ENVIO_DOMINIOS_PERMITIDOS = "agentmail.to": cualquier
// dirección real (de Conconcreto, de un proveedor) queda retenida y no sale. Abrirlo es una decisión, no un ajuste.

export function puedeEnviarA(correo: string): boolean {
  const permitidos = (process.env.ENVIO_DOMINIOS_PERMITIDOS ?? "agentmail.to").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const dominio = correo.split("@")[1]?.toLowerCase().trim() ?? "";
  return permitidos.some((d) => dominio === d || dominio.endsWith(`.${d}`));
}

/** Las cifras en pesos que aparecen en un texto: "$1.422.900" → 1422900. */
export function cifrasDe(texto: string): number[] {
  return [...texto.matchAll(/\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?/g)].map((m) => Number(m[1].replace(/\./g, "")));
}

/** Las cifras de `texto` que no están en `permitidas`. Una respuesta al proveedor solo puede usar cifras que
 *  calculó el código: si el modelo escribe otra, la respuesta no se usa. */
export function cifrasNoRespaldadas(texto: string, permitidas: number[]): number[] {
  const set = new Set(permitidas.map((n) => Math.round(n)));
  return cifrasDe(texto).filter((n) => !set.has(n));
}
