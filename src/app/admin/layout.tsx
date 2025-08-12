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
                  <SidebarMenuButton href="/admin" tooltip="Dashboard">
                    <LayoutDashboard />
                    Dashboard
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton href="/admin/routes" tooltip="Routes">
                    <RouteIcon />
                    Routes
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton href="/admin/locations" tooltip="Locations">
                    <MapPin />
                    Locations
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton href="/admin/buses" tooltip="Buses">
                    <Bus />
                    Buses
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton href="/admin/scan" tooltip="Scan Ticket">
                    <QrCode />
                    Scan Ticket
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
