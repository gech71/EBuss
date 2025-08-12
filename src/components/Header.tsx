'use client';
import Link from 'next/link';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, Shield } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant={isAdminPage ? 'ghost' : 'secondary'} size="sm">
            <Link href="/">
              <User className="mr-2 h-4 w-4" />
              Customer
            </Link>
          </Button>
          <Button asChild variant={isAdminPage ? 'secondary' : 'ghost'} size="sm">
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
