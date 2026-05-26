

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import Link from 'next/link';
import prisma from "@/lib/prisma";
import { RouteActions } from "@/components/admin/RouteActions";
import { validateRequest } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { formatRouteDateTime } from "@/lib/route-time";

export default async function AdminRoutesPage() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect('/login');
  }

  const routesData = await prisma.route.findMany({
    where: {
      bus: {
        ownerId: user.busOwnerId
      }
    },
    include: {
      origin: true,
      destination: true,
    },
    orderBy: {
      departureTime: 'asc'
    }
  });

  const routes = routesData.map(route => ({
    ...route,
    price: Number(route.price)
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bus Routes</CardTitle>
          <CardDescription>Manage your bus routes and pricing.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/admin/routes/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Route
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origin</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">{route.origin.name}</TableCell>
                <TableCell>{route.destination.name}</TableCell>
                <TableCell>{formatRouteDateTime(route.departureTime, "MMM d, yyyy h:mm a")}</TableCell>
                <TableCell className="text-right">{route.price.toFixed(2)} ETB</TableCell>
                <TableCell>
                  <RouteActions routeId={route.id} />
                </TableCell>
              </TableRow>
            ))}
             {routes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No routes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
