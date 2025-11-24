
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createBusRouteAction } from "@/app/admin/bus-mappings/actions";
import { useCsrf } from "@/hooks/useCsrf";
import type { Bus, Location } from "@prisma/client";
import { PlusCircle, ArrowRight } from "lucide-react";


interface BusMappingsClientProps {
  buses: Bus[];
  locations: Location[];
}

export function BusMappingsClient({ buses, locations }: BusMappingsClientProps) {
  const { toast } = useToast();
  const { csrfToken, loading: csrfLoading } = useCsrf();
  const [isPending, startTransition] = useTransition();

  const [busId, setBusId] = useState<string>('');
  const [originId, setOriginId] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!busId || !originId || !destinationId) {
      toast({ title: "Missing Information", description: "Please select a bus, origin, and destination.", variant: "destructive" });
      return;
    }

    if (originId === destinationId) {
      toast({ title: "Invalid Route", description: "Origin and destination cannot be the same.", variant: "destructive" });
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append('csrfToken', csrfToken || '');
    formData.append('busId', busId);
    formData.append('originId', originId);
    formData.append('destinationId', destinationId);

    startTransition(async () => {
      const result = await createBusRouteAction(formData);
      if (result.success) {
        toast({ title: "Mapping Created", description: result.message });
      } else {
        toast({ title: "Creation Failed", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Create Bus-Route Mapping</CardTitle>
            <CardDescription>
              Define which buses are allowed to operate on specific routes. This will filter the bus list when creating a new route schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label htmlFor="bus">Bus</Label>
              <Select value={busId} onValueChange={setBusId} required>
                <SelectTrigger id="bus">
                  <SelectValue placeholder="Select a bus..." />
                </SelectTrigger>
                <SelectContent>
                  {buses.map(bus => (
                    <SelectItem key={bus.id} value={bus.id}>{bus.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin">Route</Label>
              <div className="flex items-center gap-2">
                <Select value={originId} onValueChange={setOriginId} required>
                  <SelectTrigger id="origin">
                    <SelectValue placeholder="Origin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0"/>
                <Select value={destinationId} onValueChange={setDestinationId} required>
                  <SelectTrigger id="destination">
                    <SelectValue placeholder="Destination..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
             <Button type="submit" disabled={isPending || csrfLoading} className="w-full md:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              {isPending ? 'Adding...' : 'Add Mapping'}
            </Button>
          </CardContent>
        </form>
      </Card>
  );
}
