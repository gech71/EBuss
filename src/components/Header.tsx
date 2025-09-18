
'use client';
import Link from 'next/link';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { User, Shield, Gem, LogOut, LogIn } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import { useData } from '@/lib/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSuperAdmin, loggedInUserId, loggedInUser, logout } = useData();
  
  const isAdminOrSuper = loggedInUserId && !loggedInUserId.startsWith('user-');

  const isAdminPage = pathname.startsWith('/admin') && !pathname.startsWith('/super-admin');
  const isSuperAdminPage = pathname.startsWith('/super-admin');

  const handleLogout = () => {
    logout();
    router.push('/login');
  }

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
          {loggedInUser ? (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-fit px-4">
                    <User className="mr-2 h-4 w-4" />
                    <span className="truncate">{loggedInUser.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{loggedInUser.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {loggedInUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          ) : (
             <Button asChild variant="outline" size="sm">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login / Register
                </Link>
              </Button>
          )}
          
          {isAdminOrSuper && (
            <>
               <Button asChild variant={isAdminPage ? 'secondary' : 'ghost'} size="sm">
                <Link href="/admin">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </Link>
              </Button>
              {isSuperAdmin && (
                <Button asChild variant={isSuperAdminPage ? 'secondary' : 'ghost'} size="sm">
                    <Link href="/super-admin">
                    <Gem className="mr-2 h-4 w-4" />
                    Super Admin
                    </Link>
                </Button>
              )}
            </>
          )}

        </nav>
      </div>
    </header>
  );
}
