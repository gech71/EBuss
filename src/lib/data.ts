
import type { Bus, Route, Seat, BusOwner, Discount, Location } from './types';

export const generateSeats = (rows: number, cols: number, aisleCols: number[], lastRowFull: boolean = false): Seat[] => {
  const seats: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rowLabel = String.fromCharCode(65 + r);
      const seatId = `${c + 1}${rowLabel}`;
      
      const isLastRow = r === rows - 1;

      // Note: Seat ID is not unique in this generator but will be in the DB.
      // Status is also randomized here for initial visual representation.
      const status = Math.random() > 0.7 ? 'occupied' : 'available';

      if (aisleCols.includes(c) && !(lastRowFull && isLastRow)) {
        seats.push({ id: seatId, status: 'available', type: 'aisle', seatNumber: seatId });
      } else {
        seats.push({
          id: seatId,
          status: status,
          type: 'seat',
          seatNumber: seatId,
        });
      }
    }
  }
  return seats;
};

export const allLocations: Location[] = [
    { id: 'loc-1', name: 'New York, NY', ownerId: 'owner-01' },
    { id: 'loc-2', name: 'Boston, MA', ownerId: 'owner-01' },
    { id: 'loc-3', name: 'Los Angeles, CA', ownerId: 'owner-02' },
    { id: 'loc-4', name: 'San Francisco, CA', ownerId: 'owner-02' },
    { id: 'loc-5', name: 'Chicago, IL', ownerId: 'owner-01' },
    { id: 'loc-6', name: 'Detroit, MI', ownerId: 'owner-01' },
    { id: 'loc-7', name: 'Miami, FL', ownerId: 'owner-02' },
    { id: 'loc-8', name: 'Orlando, FL', ownerId: 'owner-02' },
];

export const allOwners: BusOwner[] = [
  { 
    id: 'owner-01', 
    name: 'FleetFirst Inc.',
    commissionTiers: [
      { id: 'tier-1-1', ownerId: 'owner-01', minSales: 1, maxSales: 100, type: 'PERCENTAGE', value: 5 },
      { id: 'tier-1-2', ownerId: 'owner-01', minSales: 101, maxSales: 500, type: 'PERCENTAGE', value: 4 },
      { id: 'tier-1-3', ownerId: 'owner-01', minSales: 501, maxSales: 999999, type: 'PERCENTAGE', value: 3 },
    ]
  },
  { 
    id: 'owner-02', 
    name: 'RoadRunner Co.',
    commissionTiers: [
      { id: 'tier-2-1', ownerId: 'owner-02', minSales: 1, maxSales: 999999, type: 'FIXED', value: 2.50 },
    ]
  },
];


export const allBuses: Bus[] = [
  {
    id: 'bus-001',
    name: 'Standard Cruiser',
    capacity: 48,
    layout: {
      id: 'layout-01',
      rows: 12,
      cols: 5,
      seats: [],
    },
    ownerId: 'owner-01',
  },
  {
    id: 'bus-002',
    name: 'Luxury Liner',
    capacity: 36,
    layout: {
      id: 'layout-02',
      rows: 9,
      cols: 5,
      seats: [],
    },
    ownerId: 'owner-02',
  },
  {
    id: 'bus-003',
    name: 'City Hopper',
    capacity: 52,
    layout: {
       id: 'layout-03',
      rows: 13,
      cols: 5,
      seats: [],
    },
    ownerId: 'owner-01',
  }
];

const tomorrow = new Date('2025-09-19T00:00:00.000Z');
const dayAfterTomorrow = new Date('2025-09-20T00:00:00.000Z');


export const allRoutes: Route[] = [
  {
    id: 'route-01',
    originId: 'loc-1',
    destinationId: 'loc-2',
    departureTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
    arrivalTime: new Date(new Date(tomorrow).setHours(13, 30, 0, 0)),
    price: 45.00,
    busId: 'bus-001',
    discountId: 'discount-summer-2025',
  },
  {
    id: 'route-02',
    originId: 'loc-3',
    destinationId: 'loc-4',
    departureTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
    arrivalTime: new Date(new Date(tomorrow).setHours(18, 0, 0, 0)),
    price: 60.00,
    busId: 'bus-002',
  },
  {
    id: 'route-03',
    originId: 'loc-5',
    destinationId: 'loc-6',
    departureTime: new Date(new Date(dayAfterTomorrow).setHours(8, 30, 0, 0)),
    arrivalTime: new Date(new Date(dayAfterTomorrow).setHours(14, 0, 0, 0)),
    price: 35.00,
    busId: 'bus-001',
  },
  {
    id: 'route-04',
    originId: 'loc-7',
    destinationId: 'loc-8',
    departureTime: new Date(new Date(dayAfterTomorrow).setHours(14, 0, 0, 0)),
    arrivalTime: new Date(new Date(dayAfterTomorrow).setHours(18, 0, 0, 0)),
    price: 25.00,
    busId: 'bus-002',
  },
  {
    id: 'route-05',
    originId: 'loc-1',
    destinationId: 'loc-2',
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
            { id: 'tier-d1-1', discountId: 'discount-summer-2025', minTickets: 2, maxTickets: 4, percentage: 10 },
            { id: 'tier-d1-2', discountId: 'discount-summer-2025', minTickets: 5, maxTickets: 10, percentage: 15 },
        ],
        ownerId: 'owner-01',
    },
    {
        id: 'discount-early-bird',
        name: 'Early Bird Special',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tiers: [
            { id: 'tier-d2-1', discountId: 'discount-early-bird', minTickets: 1, maxTickets: 1, percentage: 5 },
        ],
        ownerId: 'owner-01',
    },
     {
        id: 'discount-weekend-deal',
        name: 'Weekend Deal',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        tiers: [
            { id: 'tier-d3-1', discountId: 'discount-weekend-deal', minTickets: 2, maxTickets: 2, percentage: 5 },
            { id: 'tier-d3-2', discountId: 'discount-weekend-deal', minTickets: 3, maxTickets: 5, percentage: 8 },
        ],
        ownerId: 'owner-02',
    },
    {
        id: 'discount-roadrunner-special',
        name: 'RoadRunner Special',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        tiers: [
            { id: 'tier-d4-1', discountId: 'discount-roadrunner-special', minTickets: 4, maxTickets: 10, percentage: 12 },
        ],
        ownerId: 'owner-02',
    }
];
