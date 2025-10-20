
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
import type { User } from 'lucia';
import { logout } from '@/app/lib/actions';
import prisma from '@/lib/prisma';
import { BusOwner } from '@prisma/client';
import { useState, useEffect } from 'react';

interface UserNavProps {
  user: User | null;
}

export function UserNav({ user }: UserNavProps) {
  const { state: sidebarState } = useSidebar();
  const [owner, setOwner] = useState<BusOwner | null>(null);

  useEffect(() => {
    async function getOwner() {
      if (user?.busOwnerId) {
        // This is a client component, so we can't use prisma directly.
        // This is a placeholder for a fetch call to an API route.
        // For now, we will simulate this.
        // const response = await fetch(`/api/owners/${user.busOwnerId}`);
        // const ownerData = await response.json();
        // setOwner(ownerData);
      }
    }
    getOwner();
  }, [user?.busOwnerId])


  if (!user) {
    return null;
  }
  
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
              {owner && (
                <p className="text-xs leading-none text-muted-foreground pt-1">
                  {owner.name}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <form action={logout}>
            <button type="submit" className="w-full">
              <DropdownMenuItem className="w-full cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </button>
          </form>
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
              {owner && (
                <p className="text-xs leading-none text-muted-foreground pt-1 truncate">
                  {owner.name}
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
            {owner && (
              <p className="text-xs leading-none text-muted-foreground pt-1">
                {owner.name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logout}>
            <button type="submit" className="w-full">
              <DropdownMenuItem className="w-full cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </button>
          </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
