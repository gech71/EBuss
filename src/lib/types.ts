
import type { Role, SeatStatus, SeatType, CommissionType } from "@prisma/client"

// This file defines client-side types, which are similar to Prisma models.
// They are used to ensure type safety in components and data providers
// without passing Prisma-specific types to the client.

export interface Seat {
  id: string;
  seatNumber: string;
  status: SeatStatus;
  type: SeatType;
  layoutId?: string;
}

export interface SeatLayout {
  id: string;
  rows: number;
  cols: number;
  seats: Seat[];
}

export interface CommissionTier {
  id: string;
  minSales: number;
  maxSales: number;
  type: CommissionType;
  value: number;
  ownerId: string;
}

export interface BusOwner {
  id: string;
  name: string;
  commissionTiers: CommissionTier[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  busOwnerId: string | null;
  hashed_password?: string;
}

export interface Bus {
  id: string;
  name: string;
  capacity: number;
  layout: SeatLayout;
  ownerId: string;
}

export interface Location {
    id: string;
    name: string;
    ownerId: string;
}

export interface Route {
  id: string;
  originId: string;
  destinationId: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  busId: string;
  discountId?: string | null;
}

export interface Booking {
  id:string;
  routeId: string;
  passengerName: string;
  passengerEmail: string;
  totalPrice: number;
  bookingTime: Date;
  status: "VALID" | "CANCELLED" | "USED";
  bookedSeats: { seatNumber: string }[];
}

export interface DiscountTier {
  id: string;
  minTickets: number;
  maxTickets: number;
  percentage: number;
  discountId: string;
}

export interface Discount {
  id:string;
  name: string;
  tiers: DiscountTier[];
  startDate: Date;
  endDate: Date;
  ownerId: string;
}
