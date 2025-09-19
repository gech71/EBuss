
import type { Bus, Route, Seat, BusOwner, Discount } from './types';

export const generateSeats = (rows: number, cols: number, aisleCols: number[], lastRowFull: boolean = false): Seat[] => {
  const seats: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rowLabel = String.fromCharCode(65 + r);
      const seatId = `${c + 1}${rowLabel}`;
      
      const isLastRow = r === rows - 1;

      if (aisleCols.includes(c) && !(lastRowFull && isLastRow)) {
        seats.push({ id: seatId, status: 'available', type: 'aisle' });
      } else {
        seats.push({
          id: seatId,
          status: Math.random() > 0.7 ? 'occupied' : 'available',
          type: 'seat',
        });
      }
    }
  }
  return seats;
};

export const allOwners: BusOwner[] = [
  { 
    id: 'owner-01', 
    name: 'FleetFirst Inc.',
    commissionTiers: [
      { id: 'tier-1', minSales: 1, maxSales: 100, type: 'percentage', value: 5 },
      { id: 'tier-2', minSales: 101, maxSales: 500, type: 'percentage', value: 4 },
      { id: 'tier-3', minSales: 501, maxSales: Infinity, type: 'percentage', value: 3 },
    ]
  },
  { 
    id: 'owner-02', 
    name: 'RoadRunner Co.',
    commissionTiers: [
      { id: 'tier-1', minSales: 1, maxSales: Infinity, type: 'fixed', value: 2.50 },
    ]
  },
];


export const allBuses: Bus[] = [
  {
    id: 'bus-001',
    name: 'Standard Cruiser',
    capacity: 48,
    layout: {
      rows: 12,
      cols: 5,
      seats: generateSeats(12, 5, [2]),
    },
    ownerId: 'owner-01',
  },
  {
    id: 'bus-002',
    name: 'Luxury Liner',
    capacity: 36,
    layout: {
      rows: 9,
      cols: 5,
      seats: generateSeats(9, 5, [2]),
    },
    ownerId: 'owner-02',
  },
  {
    id: 'bus-003',
    name: 'City Hopper',
    capacity: 52,
    layout: {
      rows: 13,
      cols: 5,
      seats: generateSeats(13, 5, [2]),
    },
    ownerId: 'owner-01',
  }
];

const tomorrow = new Date('2025-09-19T00:00:00.000Z');
const dayAfterTomorrow = new Date('2025-09-20T00:00:00.000Z');


export const allRoutes: Route[] = [
  {
    id: 'route-01',
    origin: 'New York, NY',
    destination: 'Boston, MA',
    departureTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
    arrivalTime: new Date(new Date(tomorrow).setHours(13, 30, 0, 0)),
    price: 45.00,
    busId: 'bus-001',
    discountId: 'discount-summer-2025',
  },
  {
    id: 'route-02',
    origin: 'Los Angeles, CA',
    destination: 'San Francisco, CA',
    departureTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
    arrivalTime: new Date(new Date(tomorrow).setHours(18, 0, 0, 0)),
    price: 60.00,
    busId: 'bus-002',
  },
  {
    id: 'route-03',
    origin: 'Chicago, IL',
    destination: 'Detroit, MI',
    departureTime: new Date(new Date(dayAfterTomorrow).setHours(8, 30, 0, 0)),
    arrivalTime: new Date(new Date(dayAfterTomorrow).setHours(14, 0, 0, 0)),
    price: 35.00,
    busId: 'bus-001',
  },
  {
    id: 'route-04',
    origin: 'Miami, FL',
    destination: 'Orlando, FL',
    departureTime: new Date(new Date(dayAfterTomorrow).setHours(14, 0, 0, 0)),
    arrivalTime: new Date(new Date(dayAfterTomorrow).setHours(18, 0, 0, 0)),
    price: 25.00,
    busId: 'bus-002',
  },
  {
    id: 'route-05',
    origin: 'New York, NY',
    destination: 'Boston, MA',
    departureTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
    arrivalTime: new Date(new Date(tomorrow).setHours(13, 30, 0, 0)),
    price: 55.00,
    busId: 'bus-003',
    discountId: 'discount-summer-2025',
  },
];

export const allDiscounts: Discount[] = [
    {
        id: 'discount-summer-2025',
        name: 'Summer Group Offer',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // active 10 days ago
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // active for 30 more days
        tiers: [
            { id: 'tier-d1-1', minTickets: 2, maxTickets: 4, percentage: 10 },
            { id: 'tier-d1-2', minTickets: 5, maxTickets: 10, percentage: 15 },
        ],
        ownerId: 'owner-01',
    },
    {
        id: 'discount-early-bird',
        name: 'Early Bird Special',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tiers: [
            { id: 'tier-d2-1', minTickets: 1, maxTickets: 1, percentage: 5 },
        ],
        ownerId: 'owner-01',
    },
     {
        id: 'discount-weekend-deal',
        name: 'Weekend Deal',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        tiers: [
            { id: 'tier-d3-1', minTickets: 2, maxTickets: 2, percentage: 5 },
            { id: 'tier-d3-2', minTickets: 3, maxTickets: 5, percentage: 8 },
        ],
        ownerId: 'owner-02',
    },
    {
        id: 'discount-roadrunner-special',
        name: 'RoadRunner Special',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        tiers: [
            { id: 'tier-d4-1', minTickets: 4, maxTickets: 10, percentage: 12 },
        ],
        ownerId: 'owner-02',
    }
];
