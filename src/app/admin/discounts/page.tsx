
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Percent } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useData } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminDiscountsPage() {
  const { toast } = useToast();
  const { discounts, deleteDiscount } = useData();

  const handleDelete = (id: string) => {
    deleteDiscount(id);
    toast({
      title: "Discount Deleted",
      description: "The discount has been removed.",
    });
  };

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
                <TableHead>Discount</TableHead>
                <TableHead>Ticket Range</TableHead>
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
                      <Badge variant="destructive">{discount.percentage}% OFF</Badge>
                  </TableCell>
                  <TableCell>{discount.minTickets} - {discount.maxTickets} tickets</TableCell>
                  <TableCell>{format(discount.startDate, "PPP")} - {format(discount.endDate, "PPP")}</TableCell>
                  <TableCell>{getStatus(discount.startDate, discount.endDate)}</TableCell>
                  <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleDelete(discount.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {discounts.length === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                <Percent className="mx-auto h-12 w-12" />
                <p className="mt-4">No discounts have been created yet.</p>
              </div>
            )}
        </CardContent>
      </Card>
  );
}
