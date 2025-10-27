
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useSidebar } from './ui/sidebar';
import { cn } from '@/lib/utils';
import type { User } from '@prisma/client';
import { logout } from '@/app/lib/actions';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UserNavProps {
  user: User | null;
  ownerName?: string | null;
}

export function UserNav({ user, ownerName }: UserNavProps) {
  const { state: sidebarState } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    startTransition(async () => {
      await logout();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      window.location.href = '/login';
    });
  };
  
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  if (sidebarState === 'collapsed') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {ownerName && (
                <p className="text-xs leading-none text-muted-foreground pt-1">
                  {ownerName}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="w-full cursor-pointer" onSelect={(e) => { e.preventDefault(); handleLogout(); }} disabled={isPending}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isPending ? 'Logging out...' : 'Log out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-fit px-2 py-2 rounded-md',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-left">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
              {ownerName && (
                <p className="text-xs leading-none text-muted-foreground pt-1 truncate">
                  {ownerName}
                </p>
              )}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {ownerName && (
              <p className="text-xs leading-none text-muted-foreground pt-1">
                {ownerName}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="w-full cursor-pointer" onSelect={(e) => { e.preventDefault(); handleLogout(); }} disabled={isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isPending ? 'Logging out...' : 'Log out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
