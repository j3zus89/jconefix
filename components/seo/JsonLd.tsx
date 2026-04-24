import { getJcOneFixSoftwareApplicationJsonLd } from '@/lib/seo/software-application-jsonld';

/** JSON-LD Schema.org SoftwareApplication (JC ONE FIX / Jconefix) en el documento. */
export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(getJcOneFixSoftwareApplicationJsonLd()),
      }}
    />
  );
}
