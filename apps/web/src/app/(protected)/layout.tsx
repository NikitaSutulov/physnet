import { AppHeader } from './AppHeader';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">{children}</div>
    </>
  );
}
