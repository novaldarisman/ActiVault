import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMyRoles } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/platform")({
  component: PlatformLayout,
});

function PlatformLayout() {
  const { data: me } = useMyRoles();
  const roles = me?.roles ?? [];
  const isPlatformAdmin = roles.includes("platform_super_admin");

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Akses Ditolak</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Hanya Platform Super Admin yang dapat mengakses halaman ini.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}