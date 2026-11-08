# De pedido a pago · Conconcreto

Del pedido al pago de cada factura de proveedor, con un agente que rastrea, recalcula y responde los reclamos.
Conconcreto x irrelevant · programa Think AI, 2026 · idea 3 del paquete S4.

> «¿Por qué me pagaste 90 si eran 100?» — el reproceso más citado en las reuniones de venta.

## El flujo

```
EL RECLAMO                                              LA CAUSACIÓN PREVENTIVA
Proveedor ──escribe──▶ proveedores-cc@agentmail.to      Lote de XML de la DIAN (o el lote de demostración)
         │                                               │
         ▼                                               ▼
Identifica (correo registrado; si no, el NIT del texto)  Cruce contra pedido, liberación, entrada/HES y maestro
         ▼                                               ▼
Encuentra la factura (número, pedido o valor)            El código decide: municipio del ICA (PEP → obra),
         ▼                                               bloqueos, retenciones, asiento. El modelo pone el
RASTREA  pedido → liberación → entrada o HES →           concepto (con operador = servicio) y redacta el
         aceptación → factura → causación → pago         correo de lo detenido.
         ▼                                               ▼
RECALCULA con el municipio de la obra (código, tests)   Listas · detenidas con su correo · para revisar
         ▼                                               + carga para SAP (FB60 simulada, en Excel)
Diagnóstico: pago correcto · ICA en otro municipio ·
entrada o HES sin registrar · pedido sin liberar · …
         ▼
Pendiente al responsable si hay un error real (almacén, obra, dirección, CxP)
         ▼
Respuesta redactada en lenguaje de proveedor → Cuentas por pagar la aprueba (o la edita)
         ▼
Sale en el mismo hilo, solo a quien escribió · el aviso del pendiente sale con la aprobación
```

El momento: llega el reclamo y en ~30 segundos aparece en `/reclamos` con la cadena completa, la explicación del
ICA, el cálculo lado a lado (lo que se aplicó contra el recálculo), la respuesta lista y, si faltaba la entrada, el
pendiente para el almacén. Se aprueba y el proveedor la recibe en su hilo.

## Las pantallas

| Ruta | Qué es |
|---|---|
| `/` | Rastrear por NIT, factura o pedido. Cifras del día. |
| `/facturas/[id]` | La cadena visual de pedido a pago, el diagnóstico, dónde se fue la diferencia, los hechos del cruce. |
| `/reclamos` · `/reclamos/[id]` | La bandeja: el correo (como dato), la cadena, el cálculo, la respuesta editable para aprobar o descartar. |
| `/reclamos/reglas` | Envío directo por tipo de caso. Todo apagado; los errores reales no se pueden prender. |
| `/causacion` · `/causacion/[id]` | Cruzar un lote de XML antes de pagar; resultado por factura y carga para SAP. |
| `/pagos` | Tesorería: pagos con las retenciones que se aplicaron de verdad, y lo que está sin pagar. |
| `/pendientes` | Por responsable. Se cierran con una nota. |
| `/ica` | La tabla de ReteICA por municipio, editable, con norma, fuente y estado. |
| `/bitacora` | Todo lo que hizo el agente y cada persona, firmado. |
| `/usuarios` · `/cuenta` · `/ingresar` · `/sistema` | Acceso y la referencia viva del diseño. |

## Correr

```bash
npm install
npx prisma db push && npx prisma generate
npx tsx scripts/sembrar.ts                                   # el extracto de demostración (no toca usuarios)
npx tsx scripts/crear-usuario.ts <correo> "<Nombre>" admin   # el primer administrador (imprime su clave temporal)
npm run dev                                                  # http://localhost:3012
```

`.env.local` (fuera de git): `DATABASE_URL` (Neon, `sslmode=verify-full`), `ANTHROPIC_API_KEY`, `AGENTMAIL_API_KEY`,
`AGENTMAIL_INBOX` (`proveedores-cc@agentmail.to`), `AGENTMAIL_WEBHOOK_TOKEN`, `ENVIO_DOMINIOS_PERMITIDOS`,
`SESION_SECRETO`, `CRON_SECRET`. Opcionales: `CORREO_CXP`, `CORREO_COMPRAS` (a quién van los pendientes de esas
áreas), `MODELO_AGENTE` (por defecto `claude-sonnet-5-5`, `effort: low`, sin `temperature`).

**Después de cambiar `prisma/schema.prisma`: `npx prisma generate` y reiniciar el servidor.**

Comandos de apoyo:

| Comando | Para qué |
|---|---|
| `npx tsx scripts/rastrear.ts LAD-1021` · `--todas` | La cadena y el diagnóstico de una factura en la consola |
| `npx tsx scripts/rutinas.ts` · `--ya` | El buzón en un computador (cada 2 min en horario hábil, solo si hay correo nuevo) |
| `npx tsx scripts/generar-facturas.ts` | Regenera los XML del histórico desde `datos/demo.ts` |
| `npx tsx scripts/usuarios-prueba.ts crear <clave>` · `borrar` | Un usuario por rol para probar (`@pedidopago.test`) |

## Los datos

No hay archivos reales de este proceso todavía. Todo es de **demostración** y ficticio salvo el nombre y el NIT de
Conconcreto (`datos/demo.ts`):

- Los maestros, pedidos, entradas y facturas del skill `conconcreto-causacion` del programa (lote 1 en
  `datos/facturas/lote-1`, lote 2 en `datos/facturas/lote-2`), con lo que les faltaba: la **liberación** de cada
  pedido, el **almacenista** de cada obra, el **correo y el banco** de cada proveedor.
- El **registro de pagos**, que no existía. Los valores los calcula el sembrado con el mismo código de la app.
- Los casos que siembra, todos de Suministros y Montajes La Ladera (correo registrado: `prueba-jhon-cc@agentmail.to`):
  - **LAD-1008** · servicio en Rionegro, ICA de Rionegro: el pago estuvo bien ($20.711.100 de $22.134.000).
  - **LAD-1021** · servicio en Medellín (Torre Ciudad del Río) al que se le retuvo ICA de **Rionegro**, el domicilio
    del proveedor: 8 ‰ en vez de 2 ‰, **$74.400 de más**.
  - **LAD-2210** · tubería entregada en el Hotel Distrito Envigado **sin entrada de mercancías**: detenida.
  - Y **TAS-6188** (Tubos del Sur) con el **pedido sin liberar**, más las del lote 1 del programa.

## Verificar

```bash
npm run check   # typecheck + 66 tests (segundos): retenciones, cruce, rastreo, XML, respuestas, acceso
npm run e2e     # de punta a punta con correos reales (~1 minuto, gasta AgentMail y modelo)
```

`scripts/e2e.ts` manda tres reclamos reales desde `prueba-jhon-cc@agentmail.to` (uno con una instrucción
maliciosa), deja que el agente los procese, verifica diagnóstico, cifras, pendientes y que nada salió sin
aprobación; aprueba, y comprueba **en el buzón de pruebas** que cada respuesta llegó en su mismo hilo, que el aviso
del almacén llegó y que el agente no le escribió a nadie más. Después, una segunda revisión que no repite nada y la
causación preventiva del lote 2 (cada factura con su resultado esperado). Se puede volver a correr: limpia lo suyo.
Todo lo que envía lleva `[pedido-pago HH:MM:SS]` en el asunto (el buzón de pruebas es compartido).

Lo que se probó a mano (navegador, con Playwright): cada pantalla en escritorio y teléfono; sin sesión todo redirige
a `/ingresar`; consulta y tesorería no ven ningún botón de acción, y **el servidor rechaza** aprobar, descartar,
revisar el buzón, causar, cerrar pendientes y cambiar reglas llamando las acciones directamente; cuentas por pagar no
puede prender el envío directo; la tabla de ICA no deja marcar «verificada» una tarifa sin fuente.

## Las reglas que no se tocan

- **Modo prueba.** El agente solo envía a `ENVIO_DOMINIOS_PERMITIDOS` (hoy `agentmail.to`). A un proveedor real o
  a un correo de Conconcreto, la respuesta aprobada queda **retenida** y no sale. Abrirlo es una decisión.
- **Nada sale sin una persona.** Cuentas por pagar aprueba cada respuesta. El envío directo existe por tipo de caso,
  nace apagado, lo prende solo el administrador, exige el correo registrado y cero avisos, y nunca aplica a errores reales.
- **Lo que llega de afuera no manda.** El correo del proveedor y la nota de una factura son datos. Si piden algo al
  sistema, se avisa a quien aprueba y no se ejecuta (lo prueba la e2e).
- **Solo a quien escribió, en el mismo hilo.** Se responde con `to` explícito al remitente original.
- **Los números los hace el código.** El modelo interpreta y redacta; una redacción con una cifra que el código no
  calculó se descarta y sale la plantilla.
- **El ICA va donde se presta el servicio** (Ley 1819 de 2016, art. 343): el municipio sale del PEP del pedido.
- **El agente no carga nada en SAP ni ejecuta pagos.** Señala el error y deja el pendiente al responsable.
- **Neon puede dormir.** Nada sondea la base: la rutina le pregunta primero a AgentMail y solo toca la base si hay algo nuevo.

## El acceso

Copiado de licitaciones: todo cerrado salvo `/ingresar`, `/api/cron/*` (`CRON_SECRET`) y `/api/webhooks/*`
(token de AgentMail). Sesión de verdad en la base; 5 fallos en 15 minutos bloquean. **La cookie se llama
`pp_sesion`**: en `localhost` las cookies no distinguen puerto y las apps hermanas usan `cc_sesion`; con el mismo
nombre, ingresar en una cerraba la sesión de la otra.

Roles: **administrador** (todo, usuarios, reglas de envío) · **cuentas por pagar** (aprueba respuestas, causa,
edita el ICA, cierra pendientes) · **tesorería** (ve pagos y pendientes) · **consulta** (ve todo, no cambia nada).

## Las rutinas

| Qué | Desplegado | En un computador |
|---|---|---|
| Buzón | webhook de AgentMail → `POST /api/webhooks/agentmail?token=…`, y `GET /api/cron/buzon` de respaldo (vercel.json) | `npx tsx scripts/rutinas.ts` |

## Lo que falta

1. **Datos reales.** Exportes de S/4HANA (pedidos con su estrategia de liberación, MIGO, HES, compensaciones de
   pago) a OneDrive como primer paso; la API si TI la abre. Y la plataforma donde se cargan las facturas.
2. **Validar la tabla de ICA con Contabilidad e Impuestos.** Medellín y Rionegro están verificadas contra el acuerdo
   (4-oct-2026); Bogotá está por validar; Envigado, Guarne y Malambo no tienen tarifa. Validar también el supuesto de
   que Conconcreto es gran contribuyente y agente de retención de ICA en sus obras.
3. **Reclamos con varias facturas.** Hoy la respuesta es sobre la primera que menciona y avisa de las otras.
4. **Jurídica y TI:** los datos del proveedor viven en AgentMail (un tercero) y la app no está desplegada. Dónde
   vive lo decide TI de Conconcreto. Antes de desplegar: el primer administrador con `crear-usuario.ts`, un
   `SESION_SECRETO` nuevo, el webhook de AgentMail y, a propósito, abrir los dominios de envío.
5. **Inicio con Microsoft 365** (Entra ID) si TI lo habilita.
