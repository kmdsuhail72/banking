import { AuthShell } from "@/components/auth/AuthShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
