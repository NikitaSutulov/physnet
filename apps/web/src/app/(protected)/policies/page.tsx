import type { Metadata } from 'next';
import { PoliciesView } from './PoliciesView';

export const metadata: Metadata = { title: 'Політики маршрутизації' };

export default function PoliciesPage() {
  return <PoliciesView />;
}
