import { AuthGuard, LockForm } from "@/components/auth/Security";
export default function Page() {
  return (
    <AuthGuard>
      <LockForm />
    </AuthGuard>
  );
}
