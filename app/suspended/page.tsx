import { SuspendedView } from './SuspendedView';

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ hard?: string }>;
}) {
  const sp = await searchParams;
  const hardBlock = sp.hard === '1';
  return <SuspendedView hardBlock={hardBlock} />;
}
