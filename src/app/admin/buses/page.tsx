

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import Link from 'next/link';
import prisma from "@/lib/prisma";
import { validateRequest } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { BusActions } from "@/components/admin/BusActions";

export default async function AdminBusesPage() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect('/login');
  }

  const buses = await prisma.bus.findMany({
    where: {
      ownerId: user.busOwnerId
    },
    include: {
      layout: {
        include: {
          seats: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bus Configurations</CardTitle>
          <CardDescription>Manage your fleet's bus layouts and details.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/admin/buses/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Bus
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bus Name</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buses.map((bus) => (
              <TableRow key={bus.id}>
                <TableCell className="font-medium">{bus.name}</TableCell>
                <TableCell>{bus.capacity}</TableCell>
                <TableCell className="text-right">
                  <BusActions bus={bus} />
                </TableCell>
              </TableRow>
            ))}
             {buses.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        No buses found. Add one to get started.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
