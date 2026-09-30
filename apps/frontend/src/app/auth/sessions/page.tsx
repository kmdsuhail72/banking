import { AuthGuard, Sessions } from "@/components/auth/Security";
export default function Page() {
  return (
    <AuthGuard>
      <Sessions />
    </AuthGuard>
  );
}
