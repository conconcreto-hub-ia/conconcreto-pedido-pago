import { Barra } from "@/components/barra";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { Contenedor, Encabezado, Insignia, Tarjeta, Aja } from "@/components/ui";
import { IconoExterno } from "@/components/iconos";
import { db } from "@/lib/db";
import { ESTADO_TARIFA } from "@/lib/etiquetas";
import { fecha, porMil, pesos } from "@/lib/formato";
import { UVT } from "@/lib/retenciones";
import { EditarTarifa } from "./formulario";

export const dynamic = "force-dynamic";

const NOMBRE: Record<string, string> = { "*": "Todas las actividades", servicios: "Servicios", comercial: "Comercial", industrial: "Industrial", construccion: "Construcción" };

export default async function Ica() {
  const yo = await exigirSesion();
  const filas = await db.tarifaIca.findMany({ orderBy: [{ estado: "asc" }, { municipio: "asc" }] });
  const obras = await db.obra.findMany({ select: { municipio: true, nombre: true } });
  const editar = puede(yo.rol, "ica.editar");
  return (
    <>
      <Barra />
      <Contenedor className="space-y-6 py-10">
        <Encabezado et="ReteICA por municipio" titulo="Donde se presta el servicio, no donde vive el proveedor" bajada="Es un dato, no una regla escondida en el código: Cuentas por pagar lo edita aquí con su fuente. Lo que está por validar se calcula, pero nunca se le presenta a un proveedor como cierto; un municipio sin tarifa sale «Revisar»."
          acciones={editar ? <EditarTarifa nueva /> : undefined} />
        <Aja etiqueta="La regla">Ley 1819 de 2016, art. 343, num. 3: en servicios, el ingreso se entiende percibido en el municipio donde se ejecuta la prestación. El municipio sale del elemento PEP del pedido y del maestro de obras. Una nota en la factura que pida otro municipio es información, no una instrucción. UVT 2026: {pesos(UVT)}.</Aja>
        <div className="space-y-3">
          {filas.map((t) => {
            const tar = t.tarifas as Record<string, number>;
            const e = ESTADO_TARIFA[t.estado];
            const sinTarifa = !Object.keys(tar).length;
            const conObras = obras.filter((o) => o.municipio === t.municipio);
            return (
              <Tarjeta key={t.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-[18px] font-bold">{t.municipio}</h3><span className="text-[13px] text-tinta-3">{t.departamento}</span><Insignia tono={sinTarifa ? "rojo" : e.tono} punto>{sinTarifa ? "Sin tarifa cargada" : e.etiqueta}</Insignia></div>
                    <div className="flex flex-wrap gap-2">{sinTarifa ? <span className="text-[13.5px] text-tinta-2">Lo que caiga aquí sale «Revisar» hasta que alguien cargue la tarifa.</span> : Object.entries(tar).map(([k, v]) => <span key={k} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-linea bg-fondo px-3 text-[13px]"><span className="text-tinta-3">{NOMBRE[k] ?? k}</span><span className="num font-bold">{porMil(v)}</span></span>)}</div>
                    <p className="m-0 text-[13px] text-tinta-2">{t.norma}{t.baseUvt ? ` · base ${t.baseUvt} UVT (${pesos(t.baseUvt * UVT)})` : ""} · cuenta {t.cuenta}</p>
                    {t.notas && <p className="m-0 text-[13px] text-[#8a5a00]">{t.notas}</p>}
                    <p className="m-0 text-[12px] text-tinta-3">
                      {t.fuente ? <a href={t.fuente} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-verde-profundo hover:underline">Fuente<IconoExterno className="size-3" /></a> : "Sin fuente"}
                      {t.verificadaEn ? ` · verificada el ${fecha(t.verificadaEn)}` : ""}{t.actualizadoPor ? ` · ${t.actualizadoPor}` : ""}{conObras.length ? ` · obras: ${conObras.map((o) => o.nombre).join(", ")}` : ""}
                    </p>
                  </div>
                  {editar && <EditarTarifa fila={{ id: t.id, municipio: t.municipio, departamento: t.departamento, tarifas: tar, baseUvt: t.baseUvt, cuenta: t.cuenta, norma: t.norma, fuente: t.fuente, estado: t.estado, notas: t.notas }} />}
                </div>
              </Tarjeta>
            );
          })}
        </div>
      </Contenedor>
    </>
  );
}
