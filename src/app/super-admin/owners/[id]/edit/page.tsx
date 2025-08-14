
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { useRouter, useParams, notFound } from "next/navigation";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import type { CommissionTier, BusOwner } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditOwnerPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const { getOwnerById, updateOwner, owners } = useData();

    const id = params.id as string;
    const [owner, setOwner] = useState<BusOwner | null>(null);

    useEffect(() => {
        const o = getOwnerById(id);
        if (o) {
            setOwner(o);
        } else {
           // notFound();
        }
    }, [id, getOwnerById]);

    const handleTierChange = (index: number, field: keyof Omit<CommissionTier, 'id' | 'type'>, value: number) => {
        if (!owner) return;
        const newTiers = [...owner.commissionTiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setOwner({ ...owner, commissionTiers: newTiers });
    };

     const handleTierTypeChange = (index: number, value: 'fixed' | 'percentage') => {
        if (!owner) return;
        const newTiers = [...owner.commissionTiers];
        newTiers[index].type = value;
        setOwner({ ...owner, commissionTiers: newTiers });
    };

    const addTier = () => {
        if (!owner) return;
        const lastTier = owner.commissionTiers[owner.commissionTiers.length - 1];
        const newMinSales = lastTier ? lastTier.maxSales + 1 : 1;
        const newTiers = [...owner.commissionTiers, { id: `tier-${Date.now()}`, minSales: newMinSales, maxSales: newMinSales + 100, type: 'percentage', value: 0 }];
        setOwner({ ...owner, commissionTiers: newTiers });
    };

    const removeTier = (index: number) => {
        if (!owner) return;
        if (owner.commissionTiers.length > 1) {
            const newTiers = owner.commissionTiers.filter((_, i) => i !== index);
            setOwner({ ...owner, commissionTiers: newTiers });
        } else {
             toast({ title: "Error", description: "You must have at least one tier.", variant: "destructive" });
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!owner) {
            toast({ title: "Error", description: "Owner not found.", variant: "destructive" });
            return;
        }

        if (!owner.name) {
            toast({ title: "Error", description: "Owner name cannot be empty.", variant: "destructive" });
            return;
        }
        
        if (owners.some(o => o.name.toLowerCase() === owner.name.toLowerCase() && o.id !== owner.id)) {
             toast({ title: "Error", description: "An owner with this name already exists.", variant: "destructive" });
             return;
        }
        
        for (const tier of owner.commissionTiers) {
            if (tier.minSales <= 0 || tier.maxSales <= 0 || tier.value <= 0) {
                toast({ title: "Error", description: "Please fill out all tier fields with valid numbers greater than 0.", variant: "destructive" });
                return;
            }
            if(tier.minSales > tier.maxSales) {
                toast({ title: "Error", description: "Min sales cannot be greater than max sales in a tier.", variant: "destructive" });
                return;
            }
        }
        
        updateOwner(owner);

        toast({
            title: "Success!",
            description: "Owner details have been updated.",
        });
        router.push("/super-admin/owners");
    };

    if (!owner) {
        return <p>Loading...</p>;
    }

    return (
        <form onSubmit={handleSubmit}>
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
                            placeholder="e.g., Metro Transit Inc." 
                            required
                            value={owner.name}
                            onChange={(e) => setOwner({...owner, name: e.target.value})}
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

                        {owner.commissionTiers.map((tier, index) => (
                            <div key={tier.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
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
                                        <Select value={tier.type} onValueChange={(value: 'fixed' | 'percentage') => handleTierTypeChange(index, value)}>
                                            <SelectTrigger id={`type-${index}`}>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">Percentage</SelectItem>
                                                <SelectItem value="fixed">Fixed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor={`value-${index}`}>{tier.type === 'fixed' ? 'Amount ($)' : 'Rate (%)'}</Label>
                                        <Input id={`value-${index}`} type="number" placeholder="e.g., 3" required value={tier.value || ''} onChange={e => handleTierChange(index, 'value', Number(e.target.value))} />
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeTier(index)} disabled={owner.commissionTiers.length <= 1}>
                                    <Trash2 className="h-4 w-4"/>
                                    <span className="sr-only">Remove Tier</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push('/super-admin/owners')}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
