
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronsUpDown } from "lucide-react";
import { BusOwner } from "@prisma/client";

interface UserSwitcherProps {
    owners: BusOwner[];
    viewedOwnerId: string | null;
    setViewedOwnerId: (id: string) => void;
    isSuperAdmin: boolean;
}

export function UserSwitcher({ owners, viewedOwnerId, setViewedOwnerId, isSuperAdmin }: UserSwitcherProps) {

    if (!isSuperAdmin) {
        return null;
    }
    
    // Exclude the super admin from the list of switchable owners
    const realOwners = owners.filter(o => o.id !== 'super-admin');

    return (
        <div className="w-full max-w-xs">
            <Select onValueChange={setViewedOwnerId} defaultValue={viewedOwnerId ?? undefined}>
                <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select an owner to view..." />
                </SelectTrigger>
                <SelectContent>
                    {realOwners.map(owner => (
                        <SelectItem key={owner.id} value={owner.id}>
                            {owner.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
