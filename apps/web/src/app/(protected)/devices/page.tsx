import type { Metadata } from 'next';
import { DevicesView } from './DevicesView';

export const metadata: Metadata = { title: 'Обладнання' };

export default function DevicesPage() {
  return <DevicesView />;
}
