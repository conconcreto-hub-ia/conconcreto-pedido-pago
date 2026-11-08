// Los datos de la demostración. Todo es ficticio salvo el cliente (Constructora Conconcreto S.A., NIT real
// 890.901.110-8). Proveedores, obras, pedidos, personas y correos son inventados.
//
// Sale del skill conconcreto-causacion del programa (datos_demo.py y criterio-ejemplo.json) y le agrega lo que
// el skill no tenía: la liberación de cada pedido, el almacenista de cada obra, el correo y el banco de cada
// proveedor, y el REGISTRO DE PAGOS, para que exista el caso «¿por qué me pagaste 90 si eran 100?».
//
// Los casos que siembra el registro de pagos:
//   LAD-1008  pagada bien: servicio en Rionegro, ICA de Rionegro. El agente explica la diferencia.
//   LAD-1021  pagada con el ICA del DOMICILIO del proveedor (Rionegro) y el servicio fue en Medellín.
//   LAD-2210  material entregado en el Hotel Distrito Envigado sin entrada de mercancías: detenida.
//   TAS-6188  el pedido sigue sin liberar: detenida.
//   FEAD-18734, BES-4471, ATC-30218, SS-2290  el lote 1 del programa, causado y pagado bien.
//
// El proveedor que reclama en las pruebas, Suministros y Montajes La Ladera, tiene como correo registrado el
// buzón de pruebas prueba-jhon-cc@agentmail.to.

export const CLIENTE = { razon: "CONSTRUCTORA CONCONCRETO S.A.", nit: "890901110", dv: "8", ciudad: "Medellín", depto: "Antioquia", direccion: "Carrera 43A No. 18 Sur - 135, piso 4" };

export const CORREO_PRUEBAS = "prueba-jhon-cc@agentmail.to";

export type ProveedorDemo = {
  acreedor: string; razonSocial: string; nit: string; ciudadDomicilio: string; departamento: string; direccion: string; ciiu: string; actividad: string;
  granContribuyente: boolean; autorretenedorRenta: boolean; autorretenedorIca: boolean; resolucion?: string; correo: string; banco: string;
};

export const PROVEEDORES: ProveedorDemo[] = [
  { acreedor: "1004512", razonSocial: "ACEROS DISTRIBUIDOS DEL ABURRÁ S.A.S.", nit: "901482337", ciudadDomicilio: "Medellín", departamento: "Antioquia", direccion: "Calle 10 Sur No. 50FF - 28, Guayabal", ciiu: "4663", actividad: "Comercio al por mayor de materiales de construcción", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "facturacion@acerosaburra-demo.co", banco: "Bancolombia · corriente ****3318" },
  { acreedor: "1004588", razonSocial: "BOMBEOS Y EQUIPOS DE LA SABANA S.A.S.", nit: "900917264", ciudadDomicilio: "Bogotá D.C.", departamento: "Cundinamarca", direccion: "Avenida Calle 13 No. 68D - 51, bodega 7", ciiu: "4390", actividad: "Otras actividades especializadas para la construcción", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "facturaelectronica@bombeossabana-demo.co", banco: "Davivienda · corriente ****0912" },
  { acreedor: "1004603", razonSocial: "PREFABRICADOS DEL ORIENTE S.A.S.", nit: "901118450", ciudadDomicilio: "Marinilla", departamento: "Antioquia", direccion: "Kilómetro 3 vía Marinilla - El Peñol", ciiu: "2395", actividad: "Fabricación de artículos de hormigón, cemento y yeso", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "facturacion@prefabricadosoriente-demo.co", banco: "Bancolombia · ahorros ****5520" },
  { acreedor: "1004431", razonSocial: "ANDAMIOS TÉCNICOS DE COLOMBIA S.A.S.", nit: "811046725", ciudadDomicilio: "Itagüí", departamento: "Antioquia", direccion: "Carrera 50 No. 29 - 115, zona industrial", ciiu: "7730", actividad: "Alquiler y arrendamiento de otros tipos de maquinaria y equipo", granContribuyente: false, autorretenedorRenta: true, autorretenedorIca: false, resolucion: "Resolución DIAN 000417 del 14 de marzo de 2019", correo: "cartera@andamiostecnicos-demo.co", banco: "BBVA · corriente ****2047" },
  { acreedor: "1004652", razonSocial: "SEÑALIZACIÓN Y SEGURIDAD LA 33 S.A.S.", nit: "901603218", ciudadDomicilio: "Medellín", departamento: "Antioquia", direccion: "Calle 33 No. 66B - 12", ciiu: "4659", actividad: "Comercio al por mayor de otros tipos de maquinaria y equipo", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "ventas@senalizacion33-demo.co", banco: "Bancolombia · ahorros ****8804" },
  { acreedor: "1004619", razonSocial: "MANTENIMIENTOS HIDRÁULICOS DEL NORTE S.A.S.", nit: "900688145", ciudadDomicilio: "Bello", departamento: "Antioquia", direccion: "Diagonal 55 No. 37 - 41", ciiu: "3312", actividad: "Mantenimiento y reparación especializado de maquinaria y equipo", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "administracion@mhnorte-demo.co", banco: "Banco de Bogotá · corriente ****6631" },
  { acreedor: "1004701", razonSocial: "TUBOS Y ACCESORIOS DEL SUR S.A.S.", nit: "901255846", ciudadDomicilio: "Medellín", departamento: "Antioquia", direccion: "Carrera 52 No. 14 - 30, barrio Colombia", ciiu: "4663", actividad: "Comercio al por mayor de materiales de construcción", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "facturacion@tubosdelsur-demo.co", banco: "Bancolombia · corriente ****1179" },
  { acreedor: "1004718", razonSocial: "EQUIPOS Y MOVIMIENTOS DEL SUR S.A.S.", nit: "900734519", ciudadDomicilio: "Itagüí", departamento: "Antioquia", direccion: "Calle 31 No. 41 - 85, zona industrial", ciiu: "4312", actividad: "Preparación del terreno", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "contabilidad@equiposdelsur-demo.co", banco: "Davivienda · ahorros ****4450" },
  { acreedor: "1004733", razonSocial: "GRÚAS Y MONTAJES DE ANTIOQUIA S.A.S.", nit: "900412768", ciudadDomicilio: "Medellín", departamento: "Antioquia", direccion: "Carrera 65 No. 8B - 91", ciiu: "3312", actividad: "Mantenimiento y reparación especializado de maquinaria y equipo", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: "facturacion@gruasantioquia-demo.co", banco: "Bancolombia · corriente ****9025" },
  // El que reclama en las pruebas
  { acreedor: "1004766", razonSocial: "SUMINISTROS Y MONTAJES LA LADERA S.A.S.", nit: "901377219", ciudadDomicilio: "Rionegro", departamento: "Antioquia", direccion: "Carrera 55 No. 41 - 18, zona industrial El Tablazo", ciiu: "4322", actividad: "Instalaciones de fontanería, calefacción y aire acondicionado", granContribuyente: false, autorretenedorRenta: false, autorretenedorIca: false, correo: CORREO_PRUEBAS, banco: "Bancolombia · corriente ****7710" },
];

export type ObraDemo = { codigo: string; pep: string; nombre: string; municipio: string; departamento: string; director: string; correoDirector: string; residente: string; correoResidente: string; almacenista: string; correoAlmacen: string };

export const OBRAS: ObraDemo[] = [
  { codigo: "OB-2041", pep: "C-2041-01", nombre: "Torre Ciudad del Río", municipio: "Medellín", departamento: "Antioquia", director: "Andrés Felipe Zuluaga", correoDirector: "azuluaga.ob2041@conconcreto-demo.co", residente: "Carolina Mesa Ruiz", correoResidente: "cmesa.ob2041@conconcreto-demo.co", almacenista: "Jorge Iván Restrepo", correoAlmacen: "jrestrepo.alm2041@conconcreto-demo.co" },
  { codigo: "OB-2057", pep: "C-2057-02", nombre: "Centro Logístico Llanogrande · Bodega B", municipio: "Rionegro", departamento: "Antioquia", director: "Mauricio Henao Gil", correoDirector: "mhenao.ob2057@conconcreto-demo.co", residente: "Juliana Ospina Vélez", correoResidente: "jospina.ob2057@conconcreto-demo.co", almacenista: "Luis Fernando Quintero", correoAlmacen: "lquintero.alm2057@conconcreto-demo.co" },
  { codigo: "OB-2063", pep: "C-2063-01", nombre: "Hotel Distrito Envigado", municipio: "Envigado", departamento: "Antioquia", director: "Sergio Arango Toro", correoDirector: "sarango.ob2063@conconcreto-demo.co", residente: "Natalia Cárdenas Ríos", correoResidente: "ncardenas.ob2063@conconcreto-demo.co", almacenista: "Marta Lucía Giraldo", correoAlmacen: "mgiraldo.alm2063@conconcreto-demo.co" },
  { codigo: "OB-2050", pep: "C-2050-03", nombre: "Torre Empresarial Calle 100", municipio: "Bogotá", departamento: "Cundinamarca", director: "Diego Alejandro Rojas", correoDirector: "drojas.ob2050@conconcreto-demo.co", residente: "Paula Andrea Niño", correoResidente: "pnino.ob2050@conconcreto-demo.co", almacenista: "Fabián Torres Becerra", correoAlmacen: "ftorres.alm2050@conconcreto-demo.co" },
  { codigo: "OB-2072", pep: "C-2072-01", nombre: "Parque Industrial Malambo", municipio: "Malambo", departamento: "Atlántico", director: "Ricardo Ahumada Peña", correoDirector: "rahumada.ob2072@conconcreto-demo.co", residente: "Laura Vanegas Díaz", correoResidente: "lvanegas.ob2072@conconcreto-demo.co", almacenista: "Kelly Johana Pérez", correoAlmacen: "kperez.alm2072@conconcreto-demo.co" },
  { codigo: "OB-1990", pep: "C-1990-04", nombre: "Doble Calzada Oriente · UF2", municipio: "Guarne", departamento: "Antioquia", director: "Hernán Darío Correa", correoDirector: "hcorrea.ob1990@conconcreto-demo.co", residente: "Tomás Restrepo Gaviria", correoResidente: "trestrepo.ob1990@conconcreto-demo.co", almacenista: "Wilmar Arboleda Cano", correoAlmacen: "warboleda.alm1990@conconcreto-demo.co" },
];

// Pedidos en S/4HANA · ME2N. [pedido, pos, acreedor, texto, cant, und, precio, pep, tipo, fecha]
type FilaPedido = [string, number, string, string, number, string, number, string, "material" | "servicio", string];
export const PEDIDOS: FilaPedido[] = [
  ["4500128811", 10, "1004512", 'Varilla corrugada 1/2" G60 x 6 m', 8, "TON", 3980000, "C-2041-01", "material", "2026-09-14"],
  ["4500128811", 20, "1004512", "Alambre negro calibre 18", 400, "KG", 6800, "C-2041-01", "material", "2026-09-14"],
  ["4500128904", 10, "1004588", "Bombeo de concreto con operador", 620, "M3", 38000, "C-2057-02", "servicio", "2026-09-16"],
  ["4500128904", 20, "1004588", "Movilización de equipo de bombeo", 1, "SV", 1240000, "C-2057-02", "servicio", "2026-09-16"],
  ["4500128955", 10, "1004603", "Bloque concreto estructural 15x20x40", 1200, "UN", 18500, "C-2063-01", "material", "2026-09-18"],
  ["4500128870", 10, "1004431", "Alquiler andamio multidireccional sept.", 1, "MES", 9600000, "C-2041-01", "servicio", "2026-08-29"],
  ["4500128990", 10, "1004652", "Cono señalización 90 cm", 6, "UN", 52000, "C-2041-01", "material", "2026-09-24"],
  ["4500128990", 20, "1004652", "Cinta demarcación peligro", 2, "RL", 50000, "C-2041-01", "material", "2026-09-24"],
  ["4500128931", 10, "1004619", "Mantenimiento bomba sumergible", 1, "SV", 3850000, "C-2041-01", "servicio", "2026-09-19"],
  // Lote 2 del programa (las facturas llegan por la causación preventiva)
  ["4500129052", 10, "1004701", 'Tubo PVC sanitario 4" x 6 m', 120, "UN", 96000, "C-2041-01", "material", "2026-09-28"],
  ["4500129052", 20, "1004701", 'Codo PVC sanitario 4" x 90', 200, "UN", 9500, "C-2041-01", "material", "2026-09-28"],
  ["4500129063", 10, "1004718", "Minicargador con operador", 96, "HR", 145000, "C-2057-02", "servicio", "2026-09-29"],
  ["4500129063", 20, "1004718", "Transporte de equipo", 1, "SV", 900000, "C-2057-02", "servicio", "2026-09-29"],
  ["4500129088", 10, "1004733", "Mantenimiento torre grúa TG-04", 1, "SV", 6400000, "C-1990-04", "servicio", "2026-09-30"],
  ["4500129077", 10, "1004603", "Adoquín concreto peatonal 10x20x6", 800, "UN", 2150, "C-2057-02", "material", "2026-09-30"],
  // 4500129140 · no existe: la factura FEAD-18802 cita un pedido que nadie creó
  // Pedidos abiertos, sin factura
  ["4500129101", 10, "1004603", "Bloque concreto estructural 15x20x40", 2400, "UN", 18500, "C-2063-01", "material", "2026-10-01"],
  ["4500129115", 10, "1004431", "Alquiler andamio multidireccional oct.", 1, "MES", 9600000, "C-2041-01", "servicio", "2026-10-01"],
  ["4500129120", 10, "1004588", "Bombeo de concreto con operador", 480, "M3", 38000, "C-2057-02", "servicio", "2026-10-02"],
  ["4500129126", 10, "1004512", 'Varilla corrugada 5/8" G60 x 6 m', 12, "TON", 4010000, "C-2050-03", "material", "2026-10-02"],
  ["4500129133", 10, "1004619", "Mantenimiento planta eléctrica 150 kVA", 1, "SV", 2950000, "C-2072-01", "servicio", "2026-10-03"],
  // La Ladera y Tubos del Sur · los casos del registro de pagos
  ["4500128880", 10, "1004766", "Instalación red hidrosanitaria bodega B · etapa 1", 1, "SV", 18600000, "C-2057-02", "servicio", "2026-09-02"],
  ["4500128942", 10, "1004766", "Montaje red contra incendio sótanos 1 y 2", 1, "SV", 12400000, "C-2041-01", "servicio", "2026-09-12"],
  ["4500129015", 10, "1004766", 'Tubería PVC presión 2" RDE 21 x 6 m', 300, "UN", 41500, "C-2063-01", "material", "2026-09-25"],
  ["4500129015", 20, "1004766", 'Válvula de compuerta 2" en bronce', 24, "UN", 168000, "C-2063-01", "material", "2026-09-25"],
  ["4500129170", 10, "1004701", 'Tubo conduit EMT 3/4" x 3 m', 400, "UN", 18900, "C-2041-01", "material", "2026-10-08"],
];

/** Los pedidos que siguen esperando la firma del director. */
export const PEDIDOS_SIN_LIBERAR = ["4500129170"];

// Entradas de mercancía (MIGO) y hojas de entrada de servicios (HES). [doc, tipo, pedido, pos, cant, fecha, estado]
type FilaEntrada = [string, "mercancia" | "hes", string, number, number, string, "contabilizada" | "aceptada" | "pendiente_aceptacion"];
export const ENTRADAS: FilaEntrada[] = [
  ["5000098701", "mercancia", "4500128811", 10, 8, "2026-09-26", "contabilizada"],
  ["5000098702", "mercancia", "4500128811", 20, 400, "2026-09-26", "contabilizada"],
  ["1000045521", "hes", "4500128904", 10, 620, "2026-09-29", "aceptada"],
  ["1000045522", "hes", "4500128904", 20, 1, "2026-09-29", "aceptada"],
  ["5000098744", "mercancia", "4500128955", 10, 1200, "2026-09-30", "contabilizada"],
  ["1000045530", "hes", "4500128870", 10, 1, "2026-09-30", "aceptada"],
  ["5000098812", "mercancia", "4500128990", 10, 6, "2026-10-01", "contabilizada"],
  ["5000098813", "mercancia", "4500128990", 20, 2, "2026-10-01", "contabilizada"],
  // 4500128931 · sin HES: la obra no ha aceptado el servicio
  ["5000098930", "mercancia", "4500129052", 10, 120, "2026-10-05", "contabilizada"],
  ["5000098931", "mercancia", "4500129052", 20, 200, "2026-10-05", "contabilizada"],
  ["1000045602", "hes", "4500129063", 10, 96, "2026-10-06", "aceptada"],
  ["1000045603", "hes", "4500129063", 20, 1, "2026-10-06", "aceptada"],
  ["1000045611", "hes", "4500129088", 10, 1, "2026-10-07", "aceptada"],
  ["5000098952", "mercancia", "4500129077", 10, 500, "2026-10-07", "contabilizada"], // pidieron 800
  ["5000098960", "mercancia", "4500129101", 10, 1200, "2026-10-08", "contabilizada"],
  ["5000098974", "mercancia", "4500129126", 10, 12, "2026-10-09", "contabilizada"],
  // La Ladera
  ["1000045541", "hes", "4500128880", 10, 1, "2026-09-19", "aceptada"],
  ["1000045548", "hes", "4500128942", 10, 1, "2026-09-30", "aceptada"],
  // 4500129015 · el material llegó al Hotel Distrito Envigado el 7 de octubre, pero el almacén no hizo la MIGO
  // 4500129170 · sin liberar: no se puede registrar entrada
];

/** Las facturas que no vienen del programa: se generan como XML de la DIAN (scripts/generar-facturas.ts). */
export type FacturaNueva = { prefijo: string; numero: string; acreedor: string; fecha: string; vence: string; pedido: string; nota?: string; lineas: [string, number, string, number][] };
export const FACTURAS_NUEVAS: FacturaNueva[] = [
  { prefijo: "LAD", numero: "1008", acreedor: "1004766", fecha: "2026-09-22", vence: "2026-10-22", pedido: "4500128880",
    lineas: [["Instalación red hidrosanitaria bodega B · etapa 1 · Centro Logístico Llanogrande", 1, "SV", 18600000]] },
  { prefijo: "LAD", numero: "1021", acreedor: "1004766", fecha: "2026-10-02", vence: "2026-11-01", pedido: "4500128942",
    nota: "Somos contribuyentes de industria y comercio en Rionegro, Antioquia.",
    lineas: [["Montaje de red contra incendio en sótanos 1 y 2 · Torre Ciudad del Río", 1, "SV", 12400000]] },
  { prefijo: "LAD", numero: "2210", acreedor: "1004766", fecha: "2026-10-09", vence: "2026-11-08", pedido: "4500129015",
    nota: "Material entregado en obra el 7 de octubre de 2026 · remisión 7731.",
    lineas: [['Tubería PVC presión 2" RDE 21 x 6 m', 300, "UN", 41500], ['Válvula de compuerta 2" en bronce', 24, "UN", 168000]] },
  { prefijo: "TAS", numero: "6188", acreedor: "1004701", fecha: "2026-10-20", vence: "2026-11-19", pedido: "4500129170",
    lineas: [['Tubo conduit EMT 3/4" x 3 m', 400, "UN", 18900]] },
];

/** Cómo se causó cada factura del histórico (lo que quedó en SAP). El municipio es lo que se APLICÓ: en
 *  LAD-1021 está mal a propósito. */
export type CausacionDemo = { factura: string; concepto: string; actividad: string; municipio: string; cuenta: "materiales" | "servicios_obra" | "arrendamientos"; fecha: string; criterio: string };
export const CAUSACIONES: CausacionDemo[] = [
  { factura: "FEAD18734", concepto: "compras", actividad: "comercial", municipio: "Medellín", cuenta: "materiales", fecha: "2026-10-05", criterio: "Acero para Torre Ciudad del Río. Pedido, entrada de mercancías y factura cuadran al peso. Compra gravada por encima de 10 UVT: retención por compras 2,5 %, ReteIVA 15 % y ReteICA de Medellín, donde está la obra." },
  { factura: "BES4471", concepto: "servicios", actividad: "servicios", municipio: "Rionegro", cuenta: "servicios_obra", fecha: "2026-10-05", criterio: "Bombeo con equipo y operador: es un servicio. El pedido está imputado al PEP C-2057-02, Centro Logístico Llanogrande, en Rionegro: el ICA se retiene en Rionegro aunque el proveedor esté en Bogotá y su nota pida lo contrario." },
  { factura: "ATC30218", concepto: "arrendamiento_muebles", actividad: "*", municipio: "Medellín", cuenta: "arrendamientos", fecha: "2026-10-05", criterio: "Alquiler de andamio sin operador: arrendamiento de bien mueble. El proveedor es autorretenedor de renta: no se le retiene renta, sí IVA e ICA en Medellín." },
  { factura: "SS2290", concepto: "compras", actividad: "comercial", municipio: "Medellín", cuenta: "materiales", fecha: "2026-10-05", criterio: "Compra menor de señalización: $412.000 no alcanza las bases de renta, IVA ni ICA. Se causa sin retenciones." },
  { factura: "LAD1008", concepto: "servicios", actividad: "servicios", municipio: "Rionegro", cuenta: "servicios_obra", fecha: "2026-09-26", criterio: "Instalación hidrosanitaria en la bodega B de Llanogrande (Rionegro). Servicio con HES aceptada: renta 4 %, ReteIVA 15 % y ReteICA de Rionegro al 8 ‰." },
  { factura: "LAD1021", concepto: "servicios", actividad: "servicios", municipio: "Rionegro", cuenta: "servicios_obra", fecha: "2026-10-06", criterio: "Montaje de red contra incendio. Servicio con HES aceptada: renta 4 %, ReteIVA 15 % y ReteICA de Rionegro, según el domicilio y la nota del proveedor." },
];

/** Los pagos de Tesorería. El valor lo calcula el seed con las retenciones de la causación. */
export const PAGOS: { factura: string; fecha: string; referencia: string }[] = [
  { factura: "SS2290", fecha: "2026-10-09", referencia: "1500034207" },
  { factura: "LAD1008", fecha: "2026-10-22", referencia: "1500034381" },
  { factura: "FEAD18734", fecha: "2026-10-28", referencia: "1500034412" },
  { factura: "BES4471", fecha: "2026-10-30", referencia: "1500034466" },
  { factura: "ATC30218", fecha: "2026-10-30", referencia: "1500034467" },
  { factura: "LAD1021", fecha: "2026-10-30", referencia: "1500034471" },
];

/** La tabla de ICA con la que arranca la app. Medellín y Rionegro están verificadas contra el acuerdo
 *  municipal (references/normas.md del skill, 4-oct-2026). El resto queda por validar con Contabilidad. */
export const TARIFAS_ICA = [
  { municipio: "Medellín", departamento: "Antioquia", tarifas: { "*": 2 }, baseUvt: 15, cuenta: "236805", estado: "verificada" as const, verificadaEn: "2026-10-04",
    norma: "Acuerdo 066 de 2017 de Medellín, art. 78 · tarifa única de retención 2 ‰ para toda actividad · base 15 UVT",
    fuente: "https://www.ceta.org.co/html/estatutos_municipales/Acuerdo%20066%20de%202017%20compilado.pdf", notas: null },
  { municipio: "Rionegro", departamento: "Antioquia", tarifas: { servicios: 8, comercial: 8, industrial: 4 }, baseUvt: 10, cuenta: "236810", estado: "verificada" as const, verificadaEn: "2026-10-04",
    norma: "Acuerdo 023 de 2018 de Rionegro, arts. 77 y 90-1, modificado por el Acuerdo 030 de 2020 · tarifa de la actividad · base 10 UVT",
    fuente: "https://www.ceta.org.co/html/archivos/CETAEnlaces/Rionegro-Antioquia/ACUERDO%20030%20DE%202020.pdf", notas: null },
  { municipio: "Bogotá", departamento: "Cundinamarca", tarifas: { construccion: 8.66, servicios: 9.66, comercial: 11.04 }, baseUvt: 4, cuenta: "236815", estado: "por_validar" as const, verificadaEn: null,
    norma: "Acuerdo 65 de 2002 modificado por el Acuerdo 780 de 2020 · contratistas de construcción 8,66 ‰ · la base es un supuesto",
    fuente: "https://compilacionjuridica.shd.gov.co/compilacion/docs/a_conbog_0065_2002.htm", notas: "No validada para 2026: hubo un proyecto de cambio en 2025." },
  { municipio: "Envigado", departamento: "Antioquia", tarifas: {}, baseUvt: 0, cuenta: "236820", estado: "por_validar" as const, verificadaEn: null,
    norma: "Sin cargar", fuente: null, notas: "Falta la tarifa: hay que buscar el acuerdo municipal vigente. Mientras tanto, lo que caiga aquí sale «Revisar»." },
  { municipio: "Guarne", departamento: "Antioquia", tarifas: {}, baseUvt: 0, cuenta: "236825", estado: "por_validar" as const, verificadaEn: null,
    norma: "Sin cargar", fuente: null, notas: "Sin tarifa a propósito: una factura del lote 2 cae aquí y debe salir «Revisar»." },
  { municipio: "Malambo", departamento: "Atlántico", tarifas: {}, baseUvt: 0, cuenta: "236830", estado: "por_validar" as const, verificadaEn: null,
    norma: "Sin cargar", fuente: null, notas: "Falta la tarifa." },
];

/** Dígito de verificación de un NIT (algoritmo de la DIAN). */
export function dv(nit: string): string {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const d = nit.replace(/\D/g, "").split("").reverse();
  const s = d.reduce((a, x, i) => a + Number(x) * pesos[i], 0) % 11;
  return String(s > 1 ? 11 - s : s);
}
