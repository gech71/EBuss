
'use client';
import Link from 'next/link';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { Shield, Gem, LogIn } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import type { User } from 'lucia';
import { useEffect, useState } from 'react';
import { cookies } from 'next/dist/client/components/hooks-server';

interface HeaderProps {
    user: User | null;
}

function getCookie(name: string): string | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
}


export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const [isMiniApp, setIsMiniApp] = useState(false);
  
  useEffect(() => {
    // This check runs on the client-side after hydration
    setIsMiniApp(!!getCookie('miniapp_session'));
  }, [pathname]);

  const isAdminPage = pathname.startsWith('/admin') && !pathname.startsWith('/super-admin');
  const isSuperAdminPage = pathname.startsWith('/super-admin');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
            {(isAdminPage || isSuperAdminPage) && <SidebarTrigger className="md:hidden" />}
            <Link href="/" className="flex items-center gap-2">
            <Logo />
            </Link>
            {isAdminPage && <h1 className="font-headline text-xl font-bold text-primary hidden md:block">Admin Panel</h1>}
            {isSuperAdminPage && (
                <div className="hidden md:flex items-center gap-4">
                     <h1 className="font-headline text-xl font-bold text-primary">Super Admin</h1>
                </div>
            )}
        </div>
        
        <nav className="flex items-center gap-4">
          {!user && !isMiniApp && (
             <Button asChild variant="outline" size="sm">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login / Register
                </Link>
              </Button>
          )}
          
          {user?.role === 'ADMIN' && !isMiniApp && (
            <Button asChild variant={isAdminPage ? 'secondary' : 'ghost'} size="sm">
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          
          {user?.role === 'SUPER_ADMIN' && !isMiniApp && (
            <Button asChild variant={isSuperAdminPage ? 'secondary' : 'ghost'} size="sm">
              <Link href="/super-admin">
                <Gem className="mr-2 h-4 w-4" />
                Super Admin
              </Link>
            </Button>
          )}

        </nav>
      </div>
    </header>
  );
}
