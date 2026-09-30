import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SessionLockOverlay } from '@/components/auth/Security';

export const metadata: Metadata = {
  title: 'NovaBank | Enterprise Cloud Banking Platform',
  description:
    'Next-Gen Cloud Native Banking Microservices Platform built with Next.js, NestJS, MongoDB, Redis & Kafka.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        <AuthProvider>{children}<SessionLockOverlay /></AuthProvider>
      </body>
    </html>
  );
}
