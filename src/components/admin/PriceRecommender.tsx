
'use client';
import { useState } from 'react';
import { recommendTicketPrice, RecommendTicketPriceOutput } from '@/ai/flows/recommend-ticket-price';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, DollarSign, Lightbulb } from 'lucide-react';
import { useData } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

export function PriceRecommender() {
  const { routes } = useData();
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendTicketPriceOutput | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedRouteId) {
      toast({
        title: 'No Route Selected',
        description: 'Please select a route to get a price recommendation.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setRecommendation(null);

    try {
      const route = routes.find(r => r.id === selectedRouteId);
      if (!route) {
          throw new Error("Route not found");
      }
      // Mock data for the AI flow
      const historicalBookingData = JSON.stringify({
        last_30_days_occupancy: Math.random() * (0.9 - 0.6) + 0.6, // 60-90%
        avg_price: route.price * (Math.random() * (1.1 - 0.9) + 0.9),
      });
      const marketTrends = JSON.stringify({
        competitor_prices: { 'Competitor A': 55, 'Competitor B': 58 },
        local_events: ['Convention', 'Sports Game'],
        fuel_price_index: 1.2,
      });

      const result = await recommendTicketPrice({
        routeId: selectedRouteId,
        historicalBookingData,
        marketTrends,
      });
      setRecommendation(result);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to get price recommendation.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="text-primary" />
          <span>AI Price Recommender</span>
        </CardTitle>
        <CardDescription>
          Get an AI-powered ticket price suggestion based on historical data and market trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="route-select">Select a Route</Label>
          <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
            <SelectTrigger id="route-select">
              <SelectValue placeholder="Select a route..." />
            </SelectTrigger>
            <SelectContent>
              {routes.map(route => (
                <SelectItem key={route.id} value={route.id}>
                  {route.origin} to {route.destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSubmit} disabled={isLoading || !selectedRouteId}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Recommend Price
        </Button>

        {recommendation && (
          <Card className="bg-muted/50 mt-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">Recommended Price:</p>
                <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                  <DollarSign className="h-6 w-6" />
                  <span>{recommendation.recommendedPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                 <p className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Explanation:</p>
                 <p className="text-muted-foreground pl-6">{recommendation.explanation}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
