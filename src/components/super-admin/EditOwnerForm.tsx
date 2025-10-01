
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Separator } from "@/components/ui/separator";
import type { CommissionTier, BusOwner, CommissionType } from "@prisma/client";
import { PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOwnerAction } from "@/app/super-admin/(dashboard)/owners/actions";


interface EditOwnerFormProps {
    owner: BusOwner & { commissionTiers: CommissionTier[] };
    otherOwnerNames: string[];
}

type ClientCommissionTier = Omit<CommissionTier, 'value'> & { value: number };

const initialState = {
    success: false,
    message: ''
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Changes'}
        </Button>
    )
}

export function EditOwnerForm({ owner: initialOwner, otherOwnerNames }: EditOwnerFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [state, formAction] = useFormState(updateOwnerAction, initialState);
    
    const [name, setName] = useState(initialOwner.name);
    const [tiers, setTiers] = useState<ClientCommissionTier[]>(
        initialOwner.commissionTiers.map(t => ({...t, value: Number(t.value)}))
    );

    useEffect(() => {
        if(state.message) {
            if(!state.success) {
                toast({ title: "Update Failed", description: state.message, variant: "destructive" });
            }
        }
    }, [state, toast, router]);

    const handleTierChange = (index: number, field: keyof Omit<ClientCommissionTier, 'id' | 'type' | 'ownerId'>, value: number) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

     const handleTierTypeChange = (index: number, value: CommissionType) => {
        const newTiers = [...tiers];
        newTiers[index].type = value;
        setTiers(newTiers);
    };

    const addTier = () => {
        const lastTier = tiers[tiers.length - 1];
        const newMinSales = lastTier ? lastTier.maxSales + 1 : 1;
        const newTiers = [...tiers, { id: `new-tier-${Date.now()}`, ownerId: initialOwner.id, minSales: newMinSales, maxSales: newMinSales + 100, type: 'PERCENTAGE', value: 0 }];
        setTiers(newTiers);
    };

    const removeTier = (index: number) => {
        if (tiers.length > 1) {
            const newTiers = tiers.filter((_, i) => i !== index);
            setTiers(newTiers);
        } else {
             toast({ title: "Error", description: "You must have at least one tier.", variant: "destructive" });
        }
    };


    return (
        <form action={formAction}>
            <input type="hidden" name="id" value={initialOwner.id} />
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="commissionTiers" value={JSON.stringify(tiers)} />

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Bus Owner</CardTitle>
                    <CardDescription>Update the details for this bus owner and their commission structure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Owner Name</Label>
                        <Input 
                            id="name" 
                            name="name"
                            placeholder="e.g., Metro Transit Inc." 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Commission Tiers</h3>
                            <Button type="button" size="sm" onClick={addTier}>
                                <PlusCircle className="mr-2 h-4 w-4"/>
                                Add Tier
                            </Button>
                        </div>
                         <p className="text-sm text-muted-foreground">
                            Define commission rates based on total daily ticket sales.
                        </p>

                        {tiers.map((tier, index) => (
                            <div key={tier.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                                <Label className="font-semibold">Tier {index + 1}</Label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`minSales-${index}`}>Min Sales</Label>
                                        <Input id={`minSales-${index}`} type="number" placeholder="e.g., 1" required value={tier.minSales} onChange={e => handleTierChange(index, 'minSales', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`maxSales-${index}`}>Max Sales</Label>
                                        <Input id={`maxSales-${index}`} type="number" placeholder="e.g., 100" required value={tier.maxSales} onChange={e => handleTierChange(index, 'maxSales', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`type-${index}`}>Type</Label>
                                        <Select value={tier.type} onValueChange={(value: CommissionType) => handleTierTypeChange(index, value)}>
                                            <SelectTrigger id={`type-${index}`}>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                                                <SelectItem value="FIXED">Fixed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor={`value-${index}`}>{tier.type === 'FIXED' ? 'Amount ($)' : 'Rate (%)'}</Label>
                                        <Input id={`value-${index}`} type="number" placeholder="e.g., 3" required value={tier.value} onChange={e => handleTierChange(index, 'value', Number(e.target.value))} />
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeTier(index)} disabled={tiers.length <= 1}>
                                    <Trash2 className="h-4 w-4"/>
                                    <span className="sr-only">Remove Tier</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push('/super-admin/owners')}>Cancel</Button>
                    <SubmitButton />
                </CardFooter>
            </Card>
        </form>
    );
}
