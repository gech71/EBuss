
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import prisma from '@/lib/prisma';
import { LocationActions } from '@/components/admin/LocationActions';
import { validateRequest } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLocationsPage() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect('/login');
  }

  const locations = await prisma.location.findMany({
    where: {
      ownerId: user.busOwnerId,
    },
    orderBy: {
      name: 'asc'
    }
  });

  return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Manage the cities and places for your routes.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/locations/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Location
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell className="text-right">
                    <LocationActions 
                      locationId={location.id} 
                      locationName={location.name}
                    />
                  </TableCell>
                </TableRow>
              ))}
               {locations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No locations found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
  );
}
