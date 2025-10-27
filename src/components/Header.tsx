
'use client';
import Link from 'next/link';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { Shield, Gem, LogIn, Ticket } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import type { User } from '@prisma/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
    user: User | null;
    isMiniApp: boolean;
}

export function Header({ user, isMiniApp = false }: HeaderProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const isAdminPage = pathname.startsWith('/admin') && !pathname.startsWith('/super-admin');
  const isSuperAdminPage = pathname.startsWith('/super-admin');

  const renderNavContent = () => {
    // Priority 1: Mini App
    if (isMiniApp) {
      return (
        <Button asChild variant="ghost" size={isMobile ? "icon" : "sm"}>
            <Link href="/my-tickets">
                <Ticket />
                <span className="sr-only md:not-sr-only md:ml-2">My Tickets</span>
            </Link>
        </Button>
      );
    }

    // Priority 2: Logged-in Web User
    if (user) {
      return (
        <>
            <Button asChild variant="ghost" size={isMobile ? "icon" : "sm"}>
                <Link href="/my-tickets">
                    <Ticket />
                    <span className="sr-only md:not-sr-only md:ml-2">My Tickets</span>
                </Link>
            </Button>
            {user?.role === 'ADMIN' && (
                <Button asChild variant={isAdminPage ? 'secondary' : 'ghost'} size={isMobile ? "icon" : "sm"}>
                    <Link href="/admin">
                        <Shield />
                        <span className="sr-only md:not-sr-only md:ml-2">Admin</span>
                    </Link>
                </Button>
            )}
            {user?.role === 'SUPER_ADMIN' && (
                <Button asChild variant={isSuperAdminPage ? 'secondary' : 'ghost'} size={isMobile ? "icon" : "sm"}>
                    <Link href="/super-admin">
                        <Gem />
                        <span className="sr-only md:not-sr-only md:ml-2">Super Admin</span>
                    </Link>
                </Button>
            )}
        </>
      );
    }
    
    // Priority 3: Logged-out Web User
    return (
        <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size={isMobile ? "icon" : "sm"}>
                <Link href="/my-tickets">
                    <Ticket />
                    <span className="sr-only md:not-sr-only md:ml-2">My Tickets</span>
                </Link>
            </Button>
            <Button asChild variant="outline" size={isMobile ? "icon" : "sm"}>
                <Link href="/login">
                    <LogIn />
                    <span className="sr-only md:not-sr-only md:ml-2">Login</span>
                </Link>
            </Button>
        </div>
    );
  };

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
        
        <nav className="flex items-center gap-2 flex-wrap justify-end">
            {renderNavContent()}
        </nav>
      </div>
    </header>
  );
}
