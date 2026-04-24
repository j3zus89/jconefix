import type { ComponentPropsWithoutRef } from 'react';
import { JcOneFixAppIcon } from '@/components/jc-one-fix-brand-icons';

type VariantShellProps = ComponentPropsWithoutRef<'span'> & {
  hideRing?: boolean;
};

/** Variantes históricas de demo: todas usan el logotipo oficial (PNG). */
export function JcOneFixAppIconMonogram1F(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconLetterO(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconTicket(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconHexOne(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconBadgeJc(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconBadgeJcTight(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconBadgeJcAiry(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconBadgeJcBoldRing(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconBadgeJcTripleRing(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

export function JcOneFixAppIconBadgeJcMaxLetters(props: VariantShellProps) {
  return <JcOneFixAppIcon {...props} />;
}

/** Mapa: mismas proporciones (logo oficial). */
export const JC_ONE_FIX_JC_BADGE_SIZE_VARIANTS = [
  {
    id: 'badge-jc-tight',
    title: 'A · Logo oficial',
    blurb: 'Marca circular JC ONE FIX (PNG).',
    Icon: JcOneFixAppIconBadgeJcTight,
  },
  {
    id: 'badge-jc-airy',
    title: 'B · Logo oficial',
    blurb: 'Marca circular JC ONE FIX (PNG).',
    Icon: JcOneFixAppIconBadgeJcAiry,
  },
  {
    id: 'badge-jc-bold-ring',
    title: 'C · Logo oficial',
    blurb: 'Marca circular JC ONE FIX (PNG).',
    Icon: JcOneFixAppIconBadgeJcBoldRing,
  },
  {
    id: 'badge-jc-triple-ring',
    title: 'D · Logo oficial',
    blurb: 'Marca circular JC ONE FIX (PNG).',
    Icon: JcOneFixAppIconBadgeJcTripleRing,
  },
  {
    id: 'badge-jc-max-letters',
    title: 'E · Logo oficial',
    blurb: 'Marca circular JC ONE FIX (PNG).',
    Icon: JcOneFixAppIconBadgeJcMaxLetters,
  },
] as const;

/** Mapa para la página de demos (etiquetas + componente). */
export const JC_ONE_FIX_APP_ICON_VARIANTS = [
  {
    id: 'monogram-1f',
    title: '1 · Logo oficial',
    blurb: 'Marca circular con JC lima y anillo neón.',
    Icon: JcOneFixAppIconMonogram1F,
  },
  {
    id: 'letter-o',
    title: '2 · Logo oficial',
    blurb: 'Marca circular con JC lima y anillo neón.',
    Icon: JcOneFixAppIconLetterO,
  },
  {
    id: 'ticket',
    title: '3 · Logo oficial',
    blurb: 'Marca circular con JC lima y anillo neón.',
    Icon: JcOneFixAppIconTicket,
  },
  {
    id: 'hex-one',
    title: '4 · Logo oficial',
    blurb: 'Marca circular con JC lima y anillo neón.',
    Icon: JcOneFixAppIconHexOne,
  },
  {
    id: 'badge-jc',
    title: '5 · Logo oficial',
    blurb: 'Marca circular con JC lima y anillo neón.',
    Icon: JcOneFixAppIconBadgeJc,
  },
] as const;
