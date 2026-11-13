import type { Metadata } from 'next';
import { PlanView } from './PlanView';

export const metadata: Metadata = { title: 'План приміщення' };

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanView id={id} />;
}
