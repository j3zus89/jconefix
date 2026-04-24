import type { Metadata } from 'next';
import { LegalDocumentShell } from '@/components/legal/legal-document-shell';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Información sobre el tratamiento de datos personales en el servicio JC ONE FIX, de acuerdo con el RGPD.',
};

export default function PrivacidadPage() {
  return (
    <LegalDocumentShell title="Política de privacidad" updated="4 de abril de 2026">
      <section>
        <h2 className="text-base font-semibold text-white">1. Responsable del tratamiento</h2>
        <p className="mt-2">
          El responsable del tratamiento de los datos personales es la entidad titular del servicio <strong className="text-slate-300">JC ONE FIX</strong>{' '}
          (software de gestión para talleres), identificable mediante los datos de contacto publicados en el sitio web oficial. Para cualquier
          consulta relacionada con esta política puede utilizarse el mismo canal de contacto comercial o de soporte indicado en la web.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">2. Finalidad del tratamiento</h2>
        <p className="mt-2">Los datos personales se tratan con las siguientes finalidades principales:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Gestionar el registro de usuario, el acceso al panel y la prestación del servicio contratado.</li>
          <li>Gestionar la relación contractual, facturación, cobros y atención al cliente.</li>
          <li>Cumplir obligaciones legales aplicables (fiscales, contables, seguridad, etc.).</li>
          <li>Mantener la seguridad del servicio, prevenir abusos y mejorar el funcionamiento técnico de la plataforma.</li>
          <li>En su caso, enviar comunicaciones relacionadas con el servicio; las comunicaciones comerciales adicionales requerirán base jurídica adecuada (p. ej. consentimiento).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">3. Base jurídica</h2>
        <p className="mt-2">
          El tratamiento se basa en la ejecución del contrato o condiciones de uso del servicio, en el cumplimiento de obligaciones legales, en el
          interés legítimo para la seguridad y mejora del servicio cuando resulte proporcionado, y en el consentimiento del interesado cuando sea
          necesario (por ejemplo, ciertas cookies o comunicaciones opcionales).
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">4. Categorías de datos</h2>
        <p className="mt-2">
          Según el uso del servicio, pueden tratarse datos identificativos y de contacto, credenciales de acceso, datos de facturación y pago,
          datos relativos a la actividad en el panel (logs técnicos, IP, dispositivo) y, en la medida en que el cliente los incorpore al sistema,
          datos de terceros (por ejemplo clientes o empleados del taller) introducidos por el usuario en su cuenta. El usuario es responsable de
          informar a dichos terceros cuando la ley así lo exija.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">5. Conservación</h2>
        <p className="mt-2">
          Los datos se conservarán mientras se mantenga la relación contractual y, posteriormente, el tiempo necesario para cumplir obligaciones
          legales, resolver reclamaciones o requerimientos de autoridades, salvo supresión solicitada con arreglo a ley.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">6. Destinatarios y encargados</h2>
        <p className="mt-2">
          Pueden tener acceso a los datos proveedores de infraestructura en la nube, pasarelas de pago, herramientas de correo o soporte, y otros
          subencargados estrictamente necesarios para la prestación del servicio, con los que se procuran acuerdos acordes a la normativa de
          protección de datos. No se cederán datos a terceros salvo obligación legal o con su consentimiento cuando corresponda.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">7. Transferencias internacionales</h2>
        <p className="mt-2">
          Si algún proveedor tratara datos fuera del Espacio Económico Europeo, se aplicarán las garantías previstas en la normativa vigente
          (cláusulas contractuales tipo, decisiones de adecuación u otras medidas aceptadas).
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">8. Derechos de las personas interesadas</h2>
        <p className="mt-2">
          Puede ejercer los derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y opposición, así como retirar
          el consentimiento en su caso, dirigiéndose al responsable mediante los datos de contacto publicados. Tiene derecho a presentar una
          reclamación ante la autoridad de control competente (en España, la Agencia Española de Protección de Datos, <span className="text-slate-300">www.aepd.es</span>).
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">9. Cookies y tecnologías similares</h2>
        <p className="mt-2">
          El sitio puede utilizar cookies técnicas necesarias para el funcionamiento, cookies de preferencias (p. ej. región de precios) y, si se
          implementan, analíticas o de terceros conforme a la información facilitada en el aviso de cookies correspondiente.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">10. Menores de edad</h2>
        <p className="mt-2">
          El servicio está dirigido a profesionales y empresas. No se recogen datos de menores de forma intencionada.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">11. Cambios</h2>
        <p className="mt-2">
          Esta política puede actualizarse para adaptarse a cambios normativos o del servicio. Se recomienda revisarla periódicamente; la fecha de
          última actualización figura al inicio del documento.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
