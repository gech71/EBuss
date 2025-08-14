
import type { Bus, Route, Seat, BusOwner } from './types';

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
  { id: 'owner-01', name: 'FleetFirst Inc.' },
  { id: 'owner-02', name: 'RoadRunner Co.' },
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

export const allRoutes: Route[] = [
  {
    id: 'route-01',
    origin: 'New York, NY',
    destination: 'Boston, MA',
    departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    arrivalTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
    price: 45.00,
    busId: 'bus-001',
  },
  {
    id: 'route-02',
    origin: 'Los Angeles, CA',
    destination: 'San Francisco, CA',
    departureTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
    arrivalTime: new Date(Date.now() + 9 * 60 * 60 * 1000), // 9 hours from now
    price: 60.00,
    busId: 'bus-002',
  },
  {
    id: 'route-03',
    origin: 'Chicago, IL',
    destination: 'Detroit, MI',
    departureTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 9 * 60 * 60 * 1000),
    price: 35.00,
    busId: 'bus-001',
  },
  {
    id: 'route-04',
    origin: 'Miami, FL',
    destination: 'Orlando, FL',
    departureTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
    arrivalTime: new Date(Date.now() + 9 * 60 * 60 * 1000),
    price: 25.00,
    busId: 'bus-002',
  },
  {
    id: 'route-05',
    origin: 'New York, NY',
    destination: 'Boston, MA',
    departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // Same time as route-01, but different bus
    arrivalTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    price: 55.00,
    busId: 'bus-003',
  },
];
