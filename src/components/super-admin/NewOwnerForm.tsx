
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CommissionType } from "@prisma/client";
import { createOwnerAction } from "@/app/super-admin/(dashboard)/owners/actions";

interface NewOwnerFormProps {
    existingOwnerNames: string[];
}

type CommissionTierState = {
    minSales: number;
    maxSales: number;
    type: CommissionType;
    value: number;
};

export function NewOwnerForm({ existingOwnerNames }: NewOwnerFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    const [name, setName] = useState('');
    const [tiers, setTiers] = useState<CommissionTierState[]>([
        { minSales: 1, maxSales: 100, type: 'PERCENTAGE', value: 0 }
    ]);

    const handleTierChange = (index: number, field: keyof Omit<CommissionTierState, 'type'>, value: number) => {
        const newTiers = [...tiers];
        newTiers[index][field] = value;
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
        setTiers([...tiers, { minSales: newMinSales, maxSales: newMinSales + 100, type: 'PERCENTAGE', value: 0 }]);
    };

    const removeTier = (index: number) => {
        if (tiers.length > 1) {
            const newTiers = tiers.filter((_, i) => i !== index);
            setTiers(newTiers);
        } else {
             toast({ title: "Error", description: "You must have at least one commission tier.", variant: "destructive" });
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name) {
            toast({ title: "Error", description: "Owner name cannot be empty.", variant: "destructive" });
            return;
        }
        if (existingOwnerNames.some(n => n.toLowerCase() === name.toLowerCase())) {
             toast({ title: "Error", description: "An owner with this name already exists.", variant: "destructive" });
             return;
        }

        for (const tier of tiers) {
             if (!tier.minSales || !tier.maxSales || !tier.value ) {
                toast({ title: "Error", description: "Please fill out all tier fields with valid numbers.", variant: "destructive" });
                return;
            }
             if (tier.minSales <= 0 || tier.maxSales <= 0 || tier.value <= 0) {
                 toast({ title: "Error", description: "All tier values must be greater than 0.", variant: "destructive" });
                return;
            }
            if(tier.minSales > tier.maxSales) {
                toast({ title: "Error", description: "Min sales cannot be greater than max sales in a tier.", variant: "destructive" });
                return;
            }
        }
        
        const formData = new FormData();
        formData.append('name', name);
        formData.append('commissionTiers', JSON.stringify(tiers));

        startTransition(async () => {
            const result = await createOwnerAction(formData);
            if (result?.success === false) {
                 toast({ title: "Creation Failed", description: result.message, variant: "destructive" });
            } else {
                 toast({ title: "Success!", description: `Owner "${name}" has been added.`});
            }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Bus Owner</CardTitle>
                    <CardDescription>Enter the details for the new bus owner account and their commission structure.</CardDescription>
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
                            <div key={index} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                                <Label className="font-semibold">Tier {index + 1}</Label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`minSales-${index}`}>Min Sales</Label>
                                        <Input id={`minSales-${index}`} type="number" placeholder="e.g., 1" required value={tier.minSales || ''} onChange={e => handleTierChange(index, 'minSales', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`maxSales-${index}`}>Max Sales</Label>
                                        <Input id={`maxSales-${index}`} type="number" placeholder="e.g., 100" required value={tier.maxSales || ''} onChange={e => handleTierChange(index, 'maxSales', Number(e.target.value))} />
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
                                        <Label htmlFor={`value-${index}`}>{tier.type === 'FIXED' ? 'Amount (ETB)' : 'Rate (%)'}</Label>
                                        <Input id={`value-${index}`} type="number" placeholder="e.g., 3" required value={tier.value || ''} onChange={e => handleTierChange(index, 'value', Number(e.target.value))} />
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
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save Owner'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
