import { PriceRecommender } from "@/components/admin/PriceRecommender";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allRoutes, allBuses } from "@/lib/data";
import { DollarSign, Route as RouteIcon, Bus } from "lucide-react";

export default function AdminDashboard() {
  const totalRevenue = allRoutes.reduce((acc, route) => acc + route.price * Math.floor(Math.random() * 20), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estimated Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Based on mock sales data
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <RouteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allRoutes.length}</div>
            <p className="text-xs text-muted-foreground">
              Total routes available for booking
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buses in Fleet</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allBuses.length}</div>
            <p className="text-xs text-muted-foreground">
              Total buses configured
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <PriceRecommender />
      </div>
    </div>
  );
}
