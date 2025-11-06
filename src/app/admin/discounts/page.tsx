
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, ArrowRight, Percent, Calendar } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';
import { redirect } from 'next/navigation';
import { DiscountActions } from '@/components/admin/DiscountActions';
import { DiscountType } from '@prisma/client';

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

  const getDiscountInfo = (discount: (typeof discounts)[0]) => {
      if (discount.type === DiscountType.DATE_BASED) {
          return <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3"/> {Number(discount.percentage)}%</Badge>
      }
      return <Badge variant="outline">{discount.tiers.length} Tiers</Badge>
  }

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
                <TableHead>Details</TableHead>
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
                      {getDiscountInfo(discount)}
                  </TableCell>
                  <TableCell>{format(new Date(discount.startDate), "PPP")} <ArrowRight className="inline h-4 w-4 mx-1" /> {format(new Date(discount.endDate), "PPP")}</TableCell>
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
