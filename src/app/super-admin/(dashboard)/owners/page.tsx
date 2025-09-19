import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import prisma from '@/lib/prisma';
import { OwnerActions } from '@/components/super-admin/OwnerActions';

export default async function SuperAdminOwnersPage() {
  const owners = await prisma.busOwner.findMany({
    include: {
      _count: {
        select: { buses: true, users: true }
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
            <CardTitle>Bus Owners</CardTitle>
            <CardDescription>Manage all bus owner accounts on the platform.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/super-admin/owners/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Owner
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner Name</TableHead>
                <TableHead>Buses</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Commission Tiers</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell className="font-medium">{owner.name}</TableCell>
                   <TableCell>
                    <Badge variant="secondary">{owner._count.buses}</Badge>
                  </TableCell>
                   <TableCell>
                    <Badge variant="secondary">{owner._count.users}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{owner.commissionTiers.length} Tiers</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <OwnerActions owner={owner} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
  );
}
