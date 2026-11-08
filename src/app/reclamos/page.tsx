import Link from "next/link";
import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta, Vacio, BotonLink } from "@/components/ui";
import { IconoAlerta, IconoCorreo, IconoFlecha } from "@/components/iconos";
import { db } from "@/lib/db";
import { ESTADO_RECLAMO, TIPO_CASO } from "@/lib/etiquetas";
import { haceCuanto, nombrePropio } from "@/lib/formato";
import { BotonRevisar } from "./controles";

export const dynamic = "force-dynamic";

export default async function Reclamos() {
  const yo = await exigirSesion();
  const reclamos = await db.reclamo.findMany({ include: { proveedor: true, factura: true, pendientes: true }, orderBy: { recibidoEn: "desc" }, take: 100 });
  const porAprobar = reclamos.filter((r) => r.estado === "por_aprobar");
  const resto = reclamos.filter((r) => r.estado !== "por_aprobar");
  const buzon = process.env.AGENTMAIL_INBOX ?? "proveedores-cc@agentmail.to";

  const Fila = ({ r }: { r: (typeof reclamos)[number] }) => {
    const t = TIPO_CASO[r.tipo], e = ESTADO_RECLAMO[r.estado];
    return (
      <Link href={`/reclamos/${r.id}`} className="block">
        <Tarjeta viva className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_190px_150px] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-tinta-3"><span>{r.remitente}</span><span>·</span><span>{haceCuanto(r.recibidoEn)}</span>{r.factura && <><span>·</span><span className="font-mono font-semibold text-tinta">{r.factura.numero}</span></>}</div>
            <div className="mt-1 truncate font-semibold">{r.proveedor ? nombrePropio(r.proveedor.razonSocial) : "Proveedor sin identificar"}</div>
            <div className="truncate text-[13.5px] text-tinta-2">{r.asunto}</div>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <Insignia tono={t.tono} punto>{t.etiqueta}</Insignia>
            {(r.avisos.length > 0 || r.pendientes.length > 0) && <span className="inline-flex items-center gap-1 text-[12px] text-tinta-3">{r.avisos.length > 0 && <><IconoAlerta className="size-3.5 text-[#8a5a00]" />{r.avisos.length} {r.avisos.length === 1 ? "aviso" : "avisos"}</>}{r.pendientes.length > 0 && <span className={r.avisos.length ? "ml-1" : ""}>{r.avisos.length ? "· " : ""}{r.pendientes.length} pendiente</span>}</span>}
          </div>
          <div className="flex items-center justify-between gap-2 md:justify-end"><Insignia tono={e.tono}>{e.etiqueta}</Insignia><IconoFlecha className="size-4 text-tinta-3" /></div>
        </Tarjeta>
      </Link>
    );
  };

  return (
    <>
      <Barra>
        <Contenedor className="flex flex-wrap items-end justify-between gap-6 pb-9 pt-7">
          <div>
            <div className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[.08em] text-white/75"><span className="punto-vivo" />Buzón {buzon}</div>
            <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-white sm:text-[38px]">Reclamos de proveedores</h1>
            <p className="mt-2 max-w-[640px] text-[15px] text-white/70">El agente lee cada correo, encuentra la factura, rastrea la cadena, recalcula y deja la respuesta redactada. Sale cuando alguien de Cuentas por pagar la aprueba.</p>
          </div>
          {puede(yo.rol, "buzon.revisar") && <BotonRevisar />}
        </Contenedor>
      </Barra>
      <Contenedor className="space-y-10 py-10">
        <section className="space-y-4">
          <Encabezado et="Bandeja" titulo={porAprobar.length ? `${porAprobar.length} por aprobar` : "Nada por aprobar"} bajada="Los primeros casos siempre los aprueba una persona. Un tipo de caso repetitivo puede pasar a envío directo cuando el área confíe; hoy todos están apagados."
            acciones={<BotonLink href="/reclamos/reglas" variante="secundario" chico>Reglas de envío</BotonLink>} />
          {porAprobar.length ? <div className="space-y-2.5">{porAprobar.map((r) => <Fila key={r.id} r={r} />)}</div> : (
            <Vacio icono={<IconoCorreo className="size-5" />} titulo="La bandeja está al día">Cuando un proveedor escriba a {buzon}, su caso aparece aquí con la cadena, la explicación y la respuesta lista.</Vacio>
          )}
        </section>
        {resto.length > 0 && (
          <section className="space-y-4">
            <SeccionEt>Respondidos y descartados</SeccionEt>
            <div className="space-y-2.5">{resto.map((r) => <Fila key={r.id} r={r} />)}</div>
          </section>
        )}
      </Contenedor>
    </>
  );
}
