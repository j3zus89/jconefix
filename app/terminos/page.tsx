import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocumentShell } from '@/components/legal/legal-document-shell';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones generales de uso del servicio JC ONE FIX.',
};

export default function TerminosPage() {
  return (
    <LegalDocumentShell title="Términos y condiciones de uso" updated="4 de abril de 2026">
      <section>
        <h2 className="text-base font-semibold text-white">1. Objeto</h2>
        <p className="mt-2">
          Las presentes condiciones regulan el acceso y uso del software en la nube <strong className="text-slate-300">JC ONE FIX</strong> y los
          servicios asociados (en adelante, el &quot;Servicio&quot;). Al registrarse, contratar una prueba o utilizar el Servicio, el usuario acepta
          estas condiciones. Si no está de acuerdo, debe abstenerse de usar el Servicio.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">2. Descripción del Servicio</h2>
        <p className="mt-2">
          JC ONE FIX es una plataforma de gestión orientada a talleres y negocios similares. Las funcionalidades concretas, límites y planes pueden
          describirse en la web o en la documentación del producto. El titular puede modificar o mejorar el Servicio siempre que no lo destruya de
          forma irrazonable.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">3. Registro y cuenta</h2>
        <p className="mt-2">
          El usuario debe facilitar datos veraces y mantener la confidencialidad de sus credenciales. Es responsable de toda actividad realizada
          con su cuenta. Debe notificar de inmediato cualquier uso no autorizado.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">4. Uso aceptable</h2>
        <p className="mt-2">Queda prohibido, entre otros:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Utilizar el Servicio de forma ilícita o para fines que vulneren derechos de terceros.</li>
          <li>Intentar acceder sin autorización a sistemas, datos de otros clientes o infraestructura.</li>
          <li>Introducir malware, realizar ataques o sobrecargar la plataforma de forma malintencionada.</li>
          <li>Revender o sublicenciar el acceso al Servicio sin permiso expreso.</li>
        </ul>
        <p className="mt-2">
          El incumplimiento grave puede conllevar la suspensión o baja inmediata del Servicio.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">5. Propiedad intelectual</h2>
        <p className="mt-2">
          El software, la marca, los diseños y el contenido propio del titular están protegidos. El usuario obtiene únicamente un derecho de uso
          no exclusivo durante la vigencia de su relación contractual, sin transferencia de titularidad. Los datos que el usuario almacene en su
          cuenta siguen siendo de su titularidad, conforme a la ley y a la{' '}
          <Link href="/privacidad" className="text-[#F5C518] underline-offset-2 hover:underline">
            política de privacidad
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">6. Precios, facturación y pruebas</h2>
        <p className="mt-2">
          Los precios, moneda, impuestos y modalidades de pago se indican en el sitio o en el proceso de contratación. Los periodos de prueba, si
          existen, finalizan según las condiciones publicadas en cada momento. El impago puede suponer la suspensión del acceso hasta regularizar
          la situación.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">7. Disponibilidad y soporte</h2>
        <p className="mt-2">
          Se procura una disponibilidad razonable del Servicio, sin embargo no se garantiza un funcionamiento ininterrumpido. Pueden producirse
          cortes por mantenimiento, causas de fuerza mayor o incidencias ajenas al titular. El soporte se prestará por los canales indicados en la
          web, sin perjuicio de los niveles acordados en contratos específicos.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">8. Limitación de responsabilidad</h2>
        <p className="mt-2">
          En la medida permitida por la ley, el Servicio se ofrece &quot;tal cual&quot;. No se responde por daños indirectos, lucro cesante o
          pérdida de datos derivados de un uso inadecuado, de causas externas o de la falta de copias de seguridad por parte del usuario. La
          responsabilidad total por el Servicio, salvo dolo o culpa grave o lo imperativamente exigido por ley, quedará limitada, en su caso, al
          importe abonado por el usuario en los doce meses anteriores al hecho causante.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">9. Duración y baja</h2>
        <p className="mt-2">
          La relación tiene la duración del plan contratado o del uso autorizado. Cualquiera de las partes puede resolver el contrato según lo
          previsto en las condiciones comerciales aplicables. Tras la baja, pueden conservarse datos el tiempo necesario según ley (véase la
          política de privacidad).
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">10. Legislación y jurisdicción</h2>
        <p className="mt-2">
          Salvo norma imperativa en contrario, las presentes condiciones se rigen por la legislación española. Para la resolución de controversias,
          las partes se someten a los juzgados y tribunales del domicilio del consumidor si la normativa de consumo así lo establece; en caso
          contrario, a los que correspondan según la ley.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
