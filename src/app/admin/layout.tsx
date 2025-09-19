
'use client';

import Link from "next/link";
import { Header } from "@/components/Header";
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, Route as RouteIcon, Bus, QrCode, MapPin, Percent } from "lucide-react";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { UserNav } from "@/components/UserNav";
import { useData } from "@/lib/store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuthRedirect({ requiredRole: 'admin' });
  const { isSuperAdmin } = useData();


  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // This prevents a flash of the admin layout if a super admin navigates here before redirecting.
  if (isSuperAdmin) {
     return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
  }
  
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard">
                    <Link href="/admin">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Routes">
                     <Link href="/admin/routes">
                      <RouteIcon />
                      <span>Routes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Locations">
                    <Link href="/admin/locations">
                      <MapPin />
                      <span>Locations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Buses">
                    <Link href="/admin/buses">
                      <Bus />
                      <span>Buses</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Discounts">
                    <Link href="/admin/discounts">
                      <Percent />
                      <span>Discounts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Scan Ticket">
                    <Link href="/admin/scan">
                      <QrCode />
                      <span>Scan Ticket</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <UserNav />
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 container mx-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
