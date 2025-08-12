import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allRoutes } from "@/lib/data";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";

export default function AdminRoutesPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bus Routes</CardTitle>
          <CardDescription>Manage your bus routes and pricing.</CardDescription>
        </div>
        <Button asChild>
          <Link href="#">
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
            {allRoutes.map((route) => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">{route.origin}</TableCell>
                <TableCell>{route.destination}</TableCell>
                <TableCell>{route.departureTime.toLocaleString()}</TableCell>
                <TableCell className="text-right">${route.price.toFixed(2)}</TableCell>
                <TableCell>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
