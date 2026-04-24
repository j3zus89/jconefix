import { BrandAnimationDemos } from '@/components/branding/BrandAnimationDemos';

/** Demo pública de animaciones de marca (no requiere sesión). Misma vista que /dashboard/branding-animations. */
export default function DemoMarcaAnimacionesPage() {
  return (
    <BrandAnimationDemos backHref="/" backLabel="Ir al inicio" showDeployHint />
  );
}
