export interface Seat {
  id: string; // e.g., "1A", "1B"
  status: 'available' | 'occupied' | 'selected';
  type: 'seat' | 'aisle' | 'blocked' | 'driver';
  priceModifier?: number; // For premium seats
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
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  busId: string;
}

export interface Booking {
  id: string;
  routeId: string;
  seats: Seat[];
  totalPrice: number;
  bookingTime: Date;
  passengerName: string;
  passengerEmail: string;
}

export interface Discount {
  id:string;
  name: string;
  minTickets: number;
  maxTickets: number;
  percentage: number;
  startDate: Date;
  endDate: Date;
}
