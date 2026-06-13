import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, FileText, Receipt, Archive, ScrollText, Building2, Shield,
  Settings, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useMyRoles, type Role } from "@/lib/use-role";
import { useTenant } from "@/lib/use-tenant";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const tenantItems: { title: string; url: string; icon: any; allowed: Role[] }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, allowed: ["super_admin", "owner", "admin_keuangan", "tenant_super_admin"] },
  { title: "Pelanggan", url: "/pelanggan", icon: Users, allowed: ["super_admin", "owner", "admin_keuangan", "tenant_super_admin"] },
  { title: "Invoice", url: "/invoice", icon: FileText, allowed: ["super_admin", "owner", "admin_keuangan", "tenant_super_admin"] },
  { title: "Kwitansi", url: "/kwitansi", icon: Receipt, allowed: ["super_admin", "owner", "admin_keuangan", "tenant_super_admin"] },
  { title: "Surat Menyurat", url: "/surat", icon: ScrollText, allowed: ["super_admin", "owner", "admin_keuangan", "tenant_super_admin"] },
  { title: "Arsip", url: "/arsip", icon: Archive, allowed: ["super_admin", "owner", "tenant_super_admin"] },
  { title: "Pengaturan", url: "/pengaturan", icon: Settings, allowed: ["super_admin", "owner", "admin_keuangan", "tenant_super_admin"] },
  ];

const platformItems: { title: string; url: string; icon: any; allowed: Role[] }[] = [
  { title: "Dashboard Platform", url: "/platform", icon: LayoutDashboard, allowed: ["platform_super_admin"] },
  { title: "Tenant Management", url: "/platform/tenants", icon: Building2, allowed: ["platform_super_admin"] },
  { title: "Audit Platform", url: "/platform/audit", icon: Shield, allowed: ["platform_super_admin"] },
  { title: "Profil Saya", url: "/profil", icon: Settings, allowed: ["platform_super_admin"] },
];
function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useMyRoles();
  const { data: tenant } = useTenant();
  const roles = me?.roles ?? [];
  const isPlatformAdmin = roles.includes("platform_super_admin");

  const items = isPlatformAdmin ? platformItems : tenantItems;
  const visible = items.filter((it) => it.allowed.some((r) => roles.includes(r)));

  const handleLogout = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await supabase.from("audit_logs").insert({
        user_id: u.user.id, user_email: u.user.email,
        entity_type: "auth", action: "create", entity_label: "logout",
      });
    } catch {}
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              <img src="/logo.svg" alt="DocTiva" className="h-9 w-9 rounded-xl shrink-0" />
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sidebar-foreground tracking-tight">DocTiva</span>
                <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">
                  Smart Digital Administration
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="pt-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const active = pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <Link to={item.url} className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Keluar">
                  <LogOut className="h-4 w-4" />
                  <span>Keluar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 px-4 border-b bg-card/50 backdrop-blur sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {tenant?.logo_url && <img src={tenant.logo_url} alt={tenant.name} className="h-6 w-6 rounded object-contain" />}
              {tenant?.name && <span className="text-sm font-medium text-muted-foreground truncate">{tenant.name}</span>}
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">{me?.email}</div>
          </header>
          <main className="flex-1 p-6 lg:p-8">
            <Outlet />
          </main>
          <footer className="px-6 py-3 border-t text-center text-xs text-muted-foreground">
            DocTiva · Smart Digital Administration
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
