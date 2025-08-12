'use server';

/**
 * @fileOverview This file defines a Genkit flow for recommending ticket prices based on historical booking data and market trends.
 *
 * - recommendTicketPrice - A function that initiates the ticket price recommendation process.
 * - RecommendTicketPriceInput - The input type for the recommendTicketPrice function.
 * - RecommendTicketPriceOutput - The return type for the recommendTicketPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendTicketPriceInputSchema = z.object({
  routeId: z.string().describe('The ID of the route for which to recommend a ticket price.'),
  historicalBookingData: z.string().describe('Historical booking data for the route, as a JSON string.'),
  marketTrends: z.string().describe('Current market trends data, as a JSON string.'),
});
export type RecommendTicketPriceInput = z.infer<typeof RecommendTicketPriceInputSchema>;

const RecommendTicketPriceOutputSchema = z.object({
  recommendedPrice: z.number().describe('The recommended ticket price for the route.'),
  explanation: z.string().describe('An explanation of why this price is recommended.'),
});
export type RecommendTicketPriceOutput = z.infer<typeof RecommendTicketPriceOutputSchema>;

export async function recommendTicketPrice(input: RecommendTicketPriceInput): Promise<RecommendTicketPriceOutput> {
  return recommendTicketPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendTicketPricePrompt',
  input: {schema: RecommendTicketPriceInputSchema},
  output: {schema: RecommendTicketPriceOutputSchema},
  prompt: `You are an AI assistant that recommends optimal ticket prices for bus routes.

You will be provided with historical booking data and current market trends.
Use this information to recommend a ticket price that maximizes revenue and occupancy.

Historical Booking Data: {{{historicalBookingData}}}
Market Trends: {{{marketTrends}}}

Consider factors such as demand, seasonality, competitor pricing, and any upcoming events that may impact bookings.

Route ID: {{{routeId}}}

Based on this information, what is the optimal ticket price for this route, and why?

Recommended Price:
Explanation: `,
});

const recommendTicketPriceFlow = ai.defineFlow(
  {
    name: 'recommendTicketPriceFlow',
    inputSchema: RecommendTicketPriceInputSchema,
    outputSchema: RecommendTicketPriceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
