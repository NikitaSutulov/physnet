import type { Metadata } from 'next';
import { PlansCatalog } from './PlansCatalog';

export const metadata: Metadata = { title: 'Плани приміщень' };

export default function PlansPage() {
  return <PlansCatalog />;
}
