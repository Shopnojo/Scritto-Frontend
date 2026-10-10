import { Suspense, type ReactNode } from "react";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";

/** Every route in the (admin) group requires a backend-confirmed admin session. */
export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <RequireAdmin>
        <AdminLayout>{children}</AdminLayout>
      </RequireAdmin>
    </Suspense>
  );
}
