
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, ArrowRight, Percent } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { formatInTimeZone } from 'date-fns-tz';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';
import { redirect } from 'next/navigation';
import { DiscountActions } from '@/components/admin/DiscountActions';

export default async function AdminDiscountsPage() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect('/login');
  }

  const discounts = await prisma.discount.findMany({
    where: {
      ownerId: user.busOwnerId,
    },
    include: {
      tiers: true,
    },
    orderBy: {
      name: 'asc'
    }
  });

  const getStatus = (startDate: Date, endDate: Date) => {
    const now = new Date();
    if (now < startDate) return <Badge variant="outline">Upcoming</Badge>;
    if (now > endDate) return <Badge variant="secondary">Expired</Badge>;
    return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
  };

  return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Discount Offers</CardTitle>
            <CardDescription>Manage your promotional discounts.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/discounts/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Discount
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tiers</TableHead>
                <TableHead>Validity Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-medium">{discount.name}</TableCell>
                  <TableCell>
                      <Badge variant="outline">{discount.tiers.length} Tiers</Badge>
                  </TableCell>
                  <TableCell>
                    {formatInTimeZone(discount.startDate, 'UTC', "PPP")} <ArrowRight className="inline h-4 w-4 mx-1" /> {formatInTimeZone(discount.endDate, 'UTC', "PPP")}
                  </TableCell>
                  <TableCell>{getStatus(discount.startDate, discount.endDate)}</TableCell>
                  <TableCell className="text-right">
                    <DiscountActions discountId={discount.id} />
                  </TableCell>
                </TableRow>
              ))}
              {discounts.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No discounts have been created yet.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
  );
}
