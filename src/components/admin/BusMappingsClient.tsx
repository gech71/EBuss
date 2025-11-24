
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createBusRouteAction, deleteBusRouteAction } from "@/app/admin/bus-mappings/actions";
import { useCsrf } from "@/hooks/useCsrf";
import type { Bus, Location, BusRoute } from "@prisma/client";
import { PlusCircle, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { ArrowRight } from 'lucide-react';


interface BusMappingsClientProps {
  buses: Bus[];
  locations: Location[];
  initialMappings: (BusRoute & {
    bus: Bus;
    origin: Location;
    destination: Location;
  })[];
}

export function BusMappingsClient({ buses, locations, initialMappings }: BusMappingsClientProps) {
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

  const handleDelete = (id: string) => {
    startTransition(async () => {
      if (!csrfToken) {
          toast({ title: "Error", description: "Invalid session. Please refresh.", variant: "destructive"});
          return;
      }
      const result = await deleteBusRouteAction(id, csrfToken);
      if (result.success) {
        toast({ title: "Mapping Deleted", description: result.message });
      } else {
        toast({ title: "Deletion Failed", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <>
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

       <Card>
        <CardHeader>
          <CardTitle>Existing Mappings</CardTitle>
          <CardDescription>
            A list of all buses and the specific routes they are allowed to operate on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bus</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialMappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No bus-to-route mappings have been created yet.
                  </TableCell>
                </TableRow>
              )}
              {initialMappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">{mapping.bus.name}</TableCell>
                  <TableCell>{mapping.origin.name}</TableCell>
                  <TableCell>{mapping.destination.name}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive"/>
                            <span className="sr-only">Delete mapping</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This will permanently delete the mapping for '{mapping.bus.name}' on the '{mapping.origin.name} - {mapping.destination.name}' route.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(mapping.id)} className="bg-destructive hover:bg-destructive/90">
                                  Yes, delete
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
