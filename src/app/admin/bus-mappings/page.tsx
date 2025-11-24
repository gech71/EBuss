
import prisma from "@/lib/prisma";
import { validateRequest } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { BusMappingsClient } from "@/components/admin/BusMappingsClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { deleteBusRouteAction } from "./actions";
import { DeleteMappingButton } from "./DeleteMappingButton";


export default async function AdminBusMappingsPage() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect('/login');
  }

  const [buses, locations, mappings] = await Promise.all([
    prisma.bus.findMany({
      where: { ownerId: user.busOwnerId },
      orderBy: { name: 'asc' }
    }),
    prisma.location.findMany({
      where: { ownerId: user.busOwnerId },
      orderBy: { name: 'asc' }
    }),
    prisma.busRoute.findMany({
      where: {
        bus: {
          ownerId: user.busOwnerId
        }
      },
      include: {
        bus: true,
        origin: true,
        destination: true,
      },
      orderBy: [
        { bus: { name: 'asc' } },
        { origin: { name: 'asc' } },
        { destination: { name: 'asc' } }
      ]
    })
  ]);

  return (
    <div className="space-y-6">
      <BusMappingsClient buses={buses} locations={locations} />
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
              {mappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No bus-to-route mappings have been created yet.
                  </TableCell>
                </TableRow>
              )}
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">{mapping.bus.name}</TableCell>
                  <TableCell>{mapping.origin.name}</TableCell>
                  <TableCell>{mapping.destination.name}</TableCell>
                  <TableCell className="text-right">
                    <DeleteMappingButton id={mapping.id} busName={mapping.bus.name} originName={mapping.origin.name} destinationName={mapping.destination.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
