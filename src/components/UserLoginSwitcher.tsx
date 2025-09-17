
"use client";

import { useData } from "@/lib/store";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserLoginSwitcher() {
    const { owners, loggedInUserId, setLoggedInUserId } = useData();
    const router = useRouter();

    const handleValueChange = (userId: string) => {
        setLoggedInUserId(userId);
        // If switching to customer, redirect to homepage
        if(userId === 'customer') {
            router.push('/');
        }
    };

    const realOwners = owners.filter(o => o.id !== 'super-admin');
    const selectedOwner = owners.find(o => o.id === loggedInUserId);
    const displayName = selectedOwner ? selectedOwner.name : 'Customer';

    return (
        <div className="w-full max-w-[200px]">
            <Select onValueChange={handleValueChange} value={loggedInUserId}>
                <SelectTrigger className="h-9">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <SelectValue asChild>
                           <span className="truncate">{displayName}</span>
                        </SelectValue>
                    </div>
                </SelectTrigger>
                <SelectContent>
                     <SelectGroup>
                        <SelectLabel>Login As</SelectLabel>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="super-admin">Super Admin</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                        <SelectLabel>Bus Owners</SelectLabel>
                        {realOwners.map(owner => (
                            <SelectItem key={owner.id} value={owner.id}>
                                {owner.name}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}
