
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useSidebar } from "./ui/sidebar";

export function UserNav() {
  const { loggedInUser, logout } = useData();
  const router = useRouter();
  const { state: sidebarState } = useSidebar();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  }

  if (!loggedInUser) {
    return null;
  }

  const userInitial = loggedInUser.name.charAt(0).toUpperCase();

  if (sidebarState === 'collapsed') {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                     <Avatar className="h-8 w-8">
                        <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
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
    )
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start h-fit px-2">
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                    <p className="text-sm font-medium leading-none">{loggedInUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                        {loggedInUser.email}
                    </p>
                </div>
            </div>
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
  );
}
