import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocumentShell } from '@/components/legal/legal-document-shell';
import { getArgentinaAlternates, getSiteCanonicalUrl } from '@/lib/site-canonical';

const base = getSiteCanonicalUrl();
const url = `${base}/ayuda/importar-datos-taller`;

const TITLE = 'Importar clientes y órdenes desde Excel | Guía JC ONE FIX (Jconefix)';
const DESCRIPTION =
  'Migración desde planilla: clientes y boletos históricos a Jconefix (.xlsx). Dos accesos (Ajustes y pantalla Clientes), mapeo sugerido, filas vacías, deduplicación por correo/documento/teléfono, resumen de contactos distintos y validación antes de confirmar. Talleres Argentina.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  /** URL absoluta vía getSiteCanonicalUrl() (p. ej. https://jconefix.com.ar/ayuda/importar-datos-taller). */
  alternates: getArgentinaAlternates(url),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  keywords: [
    'importar datos taller',
    'importar excel taller',
    'importar clientes excel Argentina',
    'migrar boletos servicio técnico',
    'deduplicar clientes importación',
    'smart import',
    'Jconefix',
    'JC ONE FIX',
    'gestión taller Argentina',
    'órdenes de reparación excel',
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url,
    siteName: 'JC ONE FIX',
    locale: 'es_AR',
    type: 'article',
  },
};

/** JSON-LD HowTo: orientado a rich results (pasos en SERP). */
const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Cómo importar clientes y órdenes desde Excel en JC ONE FIX (Jconefix)',
  description: DESCRIPTION,
  inLanguage: 'es-AR',
  url,
  /** Tiempo orientativo de la tarea humana (preparar archivo + mapeo + validar). */
  totalTime: 'PT25M',
  tool: [{ '@type': 'HowToTool', name: 'Archivo Microsoft Excel (.xlsx o .xls)' }],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Abrir el importador y elegir el modo',
      text:
        'Iniciá sesión en el panel. Andá a Ajustes → Importar desde Excel. Elegí «Clientes y órdenes» para migrar contactos y boletos históricos en una sola planilla, o «Solo clientes» si solo necesitás la base de contactos. Opcional: desde Clientes → CSV / Excel podés subir un archivo .xlsx o .xls para importar solo clientes con el mismo motor inteligente.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Preparar el archivo Excel',
      text:
        'Usá la primera hoja del libro, con la fila 1 como cabeceras. Una fila por cliente u orden. Evitá celdas combinadas en el bloque de datos. Las filas totalmente vacías se ignoran. Podés incluir hasta 1000 filas con datos. Incluí columnas claras: nombre, teléfono, correo; si migrás órdenes, también número de orden, descripción del trabajo, marca, modelo, IMEI, estado y costos cuando corresponda.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Subir el archivo y revisar el mapeo de columnas',
      text:
        'Subí el archivo .xlsx o .xls. El sistema sugiere qué columna del Excel corresponde a cada campo (cliente, documento, orden, IMEI, etc.). Corregí manualmente cualquier cabecera que no haya emparejado bien.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Validar con vista previa',
      text:
        'Pulsá «Validar (vista previa)». Revisá fila por fila: el asistente marca errores (por ejemplo, datos de orden sin descripción del problema). Corregí el Excel o el mapeo hasta que no queden errores bloqueantes.',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'Importar y revisar el resumen',
      text:
        'Pulsá «Importar ahora». El sistema deduplica por correo, documento o teléfono con nombre compatible, y muestra cuántos clientes nuevos hubo, cuántas filas reutilizaron un contacto y cuántos contactos distintos intervinieron. Si hubo incidencias en alguna fila, aparecen en el resumen y como advertencia: revisalas antes de dar por cerrada la migración.',
    },
  ],
};

export default function ImportarDatosTallerAyudaPage() {
  const jsonLdString = JSON.stringify(howToJsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <LegalDocumentShell title="Importar datos de tu taller desde Excel" updated="12 de abril de 2026">
        <section>
          <h2 className="text-base font-semibold text-white">¿Para qué sirve?</h2>
        <p className="mt-2">
          Si venís de planillas, otro programa o backups en Excel, podés traer <strong className="text-slate-300">la base de
          clientes y el historial de órdenes</strong> sin reescribir todo a mano. <strong className="text-slate-300">Jconefix</strong>{' '}
          (JC ONE FIX) lee la primera hoja y <strong className="text-slate-300">sugiere</strong> el mapeo de columnas hacia
          los campos del sistema: datos de contacto, empresa, dirección, documento, notas, y por cada fila el trabajo
          (número de orden histórico, equipo, IMEI, descripción del problema, estado, prioridad, costos, notas técnicas). Si
          una cabecera no coincide, la corregís en pantalla. Siempre hay{' '}
          <strong className="text-slate-300">validación fila por fila</strong> antes de guardar.
        </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Dónde está en el panel (dos accesos)</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-slate-300">Ajustes → Importar desde Excel</strong>: elegís el modo (solo clientes o
            clientes + órdenes), subís <strong className="text-slate-300">.xlsx</strong> o{' '}
            <strong className="text-slate-300">.xls</strong>, revisás mapeo, validás e importás.
          </li>
          <li>
            <strong className="text-slate-300">Clientes → CSV / Excel</strong> con archivo Excel: mismo motor de lectura y
            deduplicación, pero <strong className="text-slate-300">solo importa clientes</strong> (no crea boletos desde ahí).
            El CSV por ese menú sigue el flujo clásico por separado.
          </li>
        </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Modo «clientes y órdenes» (migración completa)</h2>
        <p className="mt-2">
          Es la opción recomendada cuando venís de otro taller: <strong className="text-slate-300">una fila del Excel = un
          cliente + una orden de reparación</strong> cuando la fila trae datos de trabajo. Si en una fila solo hay datos de
          contacto, se crea o actualiza el cliente y no se genera boleto. Si hay datos de la orden (marca, IMEI, número de
          trabajo, etc.), tenés que mapear también una columna con la{' '}
          <strong className="text-slate-300">descripción del problema o del trabajo</strong>; sin eso el sistema marca la fila
          para que lo revises antes de importar.
        </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Filas vacías y conteos</h2>
        <p className="mt-2">
          Bajo la cabecera, las filas <strong className="text-slate-300">totalmente vacías</strong> se omiten: si tu planilla
          «tiene» 25 filas pero el panel muestra 22 con datos, casi seguro hay filas en blanco o solo con formato. El resumen
          de importación indica cuántos <strong className="text-slate-300">contactos distintos</strong> intervinieron: puede
          ser menor que el número de filas si varias filas comparten el mismo correo, documento o teléfono con nombre
          compatible; en ese caso el total de fichas en la lista no sube una por cada fila, y es el comportamiento esperado.
        </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Formato recomendado</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Primera fila con cabeceras claras: cliente («Nombre», «Teléfono», «Correo»…) y, si migrás órdenes, trabajo
            («N.º orden», «Descripción», «Marca», «Modelo», «IMEI», «Estado», «Costo estimado»…).
          </li>
          <li>Una fila por registro; evitá celdas combinadas en la zona de datos.</li>
          <li>
            Podés usar términos en español o inglés en cabeceras: el asistente intenta emparejar sinónimos habituales; si algo
            no calza, corregís el mapeo en pantalla.
          </li>
          <li>
            Límite práctico: <strong className="text-slate-300">hasta 1000 filas con datos</strong> por archivo en la primera
            hoja.
          </li>
        </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Después de importar</h2>
        <p className="mt-2">
          Si alguna fila falla al crear cliente u orden, el panel lo lista en el resumen y muestra una{' '}
          <strong className="text-slate-300">advertencia</strong>, no solo un mensaje de éxito: revisá el detalle por número
          de fila. La guía integrada del panel (menú Guía de usuario → Clientes → Importar desde Excel) amplía estos puntos.
        </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Prueba gratis y demo en la web</h2>
        <p className="mt-2">
          La cuenta de prueba incluye acceso al panel para validar el flujo real con tus archivos. En la página de inicio hay
          una{' '}
          <Link href="/#import-demo" className="font-medium text-[#F5C518] hover:text-[#D4A915]">
            demo interactiva
          </Link>{' '}
          que muestra, sin subir datos, un ejemplo del flujo de mapeo (ilustrativo, no lee tu archivo).
        </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Otras importaciones en el producto</h2>
        <p className="mt-2">
          Además de esta importación de clientes y órdenes, el panel incluye importaciones específicas por módulo (por
          ejemplo inventario con su propio asistente de columnas, u hojas CSV en otras áreas). Consultá la guía en pantalla
          o a soporte para el caso que necesites.
        </p>
        </section>

        <section>
          <p className="mt-2">
            <Link href="/register" className="font-semibold text-[#F5C518] hover:text-[#D4A915]">
              Crear cuenta y probar gratis →
            </Link>
          </p>
        </section>
      </LegalDocumentShell>
    </>
  );
}
