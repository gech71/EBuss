

export interface Seat {
  id: string; // e.g., "1A", "1B"
  status: 'available' | 'occupied' | 'selected';
  type: 'seat' | 'aisle' | 'blocked' | 'driver';
  priceModifier?: number; // For premium seats
}

export interface CommissionTier {
  id: string;
  minSales: number;
  maxSales: number;
  type: 'fixed' | 'percentage';
  value: number;
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
  ownerId: string;
  password?: string;
}

export interface Bus {
  id: string;
  name: string;
  capacity: number;
  layout: {
    rows: number;
    cols: number;
    seats: Seat[];
  };
  ownerId: string;
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  busId: string;
  discountId?: string;
}

export interface Booking {
  id:string;
  routeId: string;
  seats: Seat[];
  totalPrice: number;
  bookingTime: Date;
  passengerName: string;
  passengerEmail: string;
}

export interface DiscountTier {
  id: string;
  minTickets: number;
  maxTickets: number;
  percentage: number;
}

export interface Discount {
  id:string;
  name: string;
  tiers: DiscountTier[];
  startDate: Date;
  endDate: Date;
}
