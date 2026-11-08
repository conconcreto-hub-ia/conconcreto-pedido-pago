// La referencia viva del sistema de diseño. Si una pieza no está aquí, todavía no existe.

import { exigirSesion } from "@/lib/auth/sesion";
import { Barra } from "@/components/barra";
import { Aja, Boton, Chip, Cifra, Contenedor, Dato, Encabezado, Insignia, Marca, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { IconoCorreo, IconoPaquete, IconoProveedor, IconoAgente, IconoEscudo, IconoFlecha, IconoBuscar, IconoBanco, IconoFirma, IconoCalculo, IconoLista, IconoDocumento } from "@/components/iconos";
import { Cadena } from "@/components/cadena";
import { ESTADO_FACTURA, ESTADO_RECLAMO, TIPO_CASO, ESTADO_TARIFA } from "@/lib/etiquetas";

const COLORES = [
  ["noche", "#07130c"], ["noche-2", "#0d2216"], ["verde-profundo", "#07582b"], ["verde", "#3dae2b"], ["verde-suave", "#eaf6e7"],
  ["oro", "#efbf01"], ["naranja", "#d8800d"], ["tinta", "#141a16"], ["tinta-2", "#48514b"], ["tinta-3", "#7b847e"], ["linea", "#e2e7e3"], ["fondo", "#f6f8f5"],
];

export default async function Sistema() {
  const yo = await exigirSesion();
  return (
    <>
      <Barra />
      <Contenedor className="space-y-14 py-10">
        <Encabezado et="Sistema de diseño" titulo="Conconcreto x irrelevant" bajada="Sale del material de la sesión 1: noche y verde Conconcreto, con el degradado oro del logo para lo que importa. Borde antes que sombra, un solo radio, Montserrat para títulos y cifras." />

        <section className="space-y-4">
          <SeccionEt>Marca</SeccionEt>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="banda rounded-sup p-8"><Marca /></div>
            <Tarjeta className="p-8"><Marca fondo="claro" /></Tarjeta>
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Color</SeccionEt>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {COLORES.map(([n, h]) => (
              <div key={n}>
                <div className="h-14 rounded-ctl border border-linea" style={{ background: h }} />
                <div className="mt-1.5 font-display text-[12.5px] font-semibold">{n}</div>
                <div className="font-mono text-[11.5px] text-tinta-3">{h}</div>
              </div>
            ))}
          </div>
          <div className="h-3 rounded-full [background:var(--degradado)]" />
        </section>

        <section className="space-y-4">
          <SeccionEt>Tipografía</SeccionEt>
          <Tarjeta className="space-y-3 p-6">
            <h1 className="text-[44px] font-extrabold leading-none">Del pedido <span className="dorado">al pago</span></h1>
            <h2 className="text-[26px] font-extrabold">Título de sección · Montserrat 800</h2>
            <h3 className="text-[18px] font-bold">Título de tarjeta · Montserrat 700</h3>
            <p className="max-w-[640px] text-tinta-2">Texto corrido en Work Sans. El agente lee el reclamo, rastrea la cadena, recalcula y redacta; una persona aprueba antes de que algo salga.</p>
            <p className="font-mono text-[13px] text-tinta-2">LAD-1021 · 4500128942 · JetBrains Mono para códigos</p>
          </Tarjeta>
        </section>

        <section className="space-y-4">
          <SeccionEt>Botones</SeccionEt>
          <div className="flex flex-wrap gap-3">
            <Boton variante="primario">Aprobar y enviar <IconoFlecha /></Boton>
            <Boton>Secundario</Boton>
            <Boton variante="oscuro">Oscuro</Boton>
            <Boton variante="fantasma">Fantasma</Boton>
            <Boton variante="peligro">Descartar</Boton>
            <Boton variante="primario" chico>Chico</Boton>
            <Boton disabled>Deshabilitado</Boton>
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Estados</SeccionEt>
          <div className="flex flex-wrap gap-2">
            {Object.values(ESTADO_FACTURA).map((e) => <Insignia key={e.etiqueta} tono={e.tono} punto>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(TIPO_CASO).map((e) => <Insignia key={e.etiqueta} tono={e.tono} punto>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {[...Object.values(ESTADO_RECLAMO), ...Object.values(ESTADO_TARIFA)].map((e) => <Insignia key={e.etiqueta} tono={e.tono}>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2"><Chip>Rionegro</Chip><Chip>Servicios · 8 ‰</Chip><Chip>Base 10 UVT</Chip></div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Cifras y encaje</SeccionEt>
          <Tarjeta className="flex flex-wrap gap-10 p-6">
            <Cifra valor="3" rotulo="Respuestas por aprobar" nota="1 nueva hoy" />
            <Cifra valor="$74.400" rotulo="Retenidos de más" />
            <Cifra valor="2" rotulo="Pendientes abiertos" />
          </Tarjeta>
          <div className="banda flex flex-wrap gap-10 rounded-sup p-6">
            <Cifra oscuro valor="11" rotulo="Facturas cruzadas" />
            <Cifra oscuro valor="4" rotulo="Detenidas antes de pagar" />
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Bloques</SeccionEt>
          <div className="grid gap-4 md:grid-cols-2">
            <Aja>La factura dice Rionegro, el domicilio del proveedor. El pedido está imputado a la Torre Ciudad del Río, en Medellín: el ICA va allá, al 2 por mil.</Aja>
            <Tarjeta className="p-5">
              <dl className="m-0">
                <Dato k="Proveedor">Suministros y Montajes La Ladera</Dato>
                <Dato k="Pedido">4500128942</Dato>
                <Dato k="Pagado">$13.807.400</Dato>
              </dl>
            </Tarjeta>
          </div>
          <Vacio icono={<IconoCorreo className="size-5" />} titulo="La bandeja está al día" accion={<Boton variante="primario">Revisar el buzón ahora</Boton>}>
            Cuando un proveedor escriba, su caso aparece aquí con la cadena, la explicación y la respuesta lista.
          </Vacio>
          <Tarjeta className="p-5"><Cadena pasos={[
            { clave: "pedido", titulo: "Pedido", estado: "ok", documento: "4500129015", detalle: "Material · Hotel Distrito Envigado" },
            { clave: "liberacion", titulo: "Liberación", estado: "ok", detalle: "Liberado por el director" },
            { clave: "entrada", titulo: "Entrada de mercancías", estado: "error", detalle: "El almacén no ha registrado el recibo" },
            { clave: "factura", titulo: "Factura", estado: "ok", documento: "LAD-2210", detalle: "$19.613.580 con IVA" },
            { clave: "causacion", titulo: "Causación", estado: "error", detalle: "Detenida" },
            { clave: "pago", titulo: "Pago", estado: "espera", detalle: "Sin pagar" },
          ]} /></Tarjeta>
        </section>

        <section className="space-y-4">
          <SeccionEt>Íconos</SeccionEt>
          <div className="flex flex-wrap gap-4 text-tinta-2">
            {[IconoBuscar, IconoCorreo, IconoDocumento, IconoFirma, IconoPaquete, IconoCalculo, IconoBanco, IconoProveedor, IconoAgente, IconoEscudo, IconoLista].map((I, i) => (
              <div key={i} className="grid size-11 place-items-center rounded-ctl border border-linea bg-papel"><I className="size-5" /></div>
            ))}
          </div>
        </section>
      </Contenedor>
    </>
  );
}
