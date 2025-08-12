import Link from "next/link";
import { Header } from "@/components/Header";
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent } from "@/components/ui/sidebar";
import { LayoutDashboard, Route as RouteIcon, Bus, QrCode, MapPin, Building } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Header />
        <div className="flex">
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard">
                    <Link href="/admin">
                      <LayoutDashboard />
                      Dashboard
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Routes">
                     <Link href="/admin/routes">
                      <RouteIcon />
                      Routes
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Locations">
                    <Link href="/admin/locations">
                      <MapPin />
                      Locations
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Buses">
                    <Link href="/admin/buses">
                      <Bus />
                      Buses
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Scan Ticket">
                    <Link href="/admin/scan">
                      <QrCode />
                      Scan Ticket
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <main className="flex-1 p-4 md:p-8 bg-background">
             <div className="flex items-center mb-4">
                <SidebarTrigger className="md:hidden" />
                <h1 className="font-headline text-3xl font-bold text-primary ml-2">Admin Panel</h1>
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
