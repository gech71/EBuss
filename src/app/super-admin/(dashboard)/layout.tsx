

import Link from "next/link";
import { Header } from "@/components/Header";
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, Gem, FileClock } from "lucide-react";
import { UserNav } from "@/components/UserNav";
import { validateRequest } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function getIsMiniApp() {
  const cookieStore = await cookies();
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

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();
  if (!user) {
    return redirect('/super-admin/login');
  }
   if (user.role !== 'SUPER_ADMIN') {
    return redirect('/unauthorized');
  }
  
  // Enforce password change if required
  if (user.passwordChangeRequired && !children.props.segmentPath.includes('settings')) {
    redirect('/super-admin/settings');
  }

  const isMiniApp = await getIsMiniApp();
  
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full">
        <Header user={user} isMiniApp={isMiniApp} />
        <div className="flex flex-1">
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dashboard">
                    <Link href="/super-admin">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Owners">
                     <Link href="/super-admin/owners">
                      <Users />
                      <span>Bus Owners</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Platform Settings">
                    <Link href="/super-admin/settings">
                      <Gem />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Audit Logs">
                    <Link href="/super-admin/logs">
                      <FileClock />
                      <span>Audit Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <UserNav user={user} />
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

