import { AuthGuard, Mfa } from "@/components/auth/Security";
export default function Page() {
  return (
    <AuthGuard>
      <Mfa setup />
    </AuthGuard>
  );
}
