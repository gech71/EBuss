

import Link from "next/link";
import { Header } from "@/components/Header";
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, Route as RouteIcon, Bus, QrCode, MapPin, Percent, Settings, GitFork } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { validateRequest } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

async function getIsMiniApp() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('miniapp_session');
  if (sessionCookie) {
    try {
      const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('ascii');
      const sessionData = JSON.parse(decodedSession);
      return sessionData.isAuthenticated;
    } catch (error) {
      return false;
    }
  }
  return false;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();
  if (!user) {
    return redirect('/login');
  }
  if (user.role !== 'ADMIN') {
    return redirect('/unauthorized');
  }
  
  const isMiniApp = await getIsMiniApp();

  let ownerName = null;
  if (user.busOwnerId) {
    const owner = await prisma.busOwner.findUnique({
      where: { id: user.busOwnerId },
      select: { name: true }
    });
    ownerName = owner?.name;
  }
  
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full">
        <Header user={user} isMiniApp={false} />
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
                  <SidebarMenuButton asChild tooltip="Bus Mappings">
                    <Link href="/admin/bus-mappings">
                      <GitFork />
                      <span>Bus Mappings</span>
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
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Settings">
                    <Link href="/admin/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <UserNav user={user} ownerName={ownerName} />
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
