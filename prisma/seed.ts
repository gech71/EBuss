
import { PrismaClient, SeatStatus, SeatType, CommissionType } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate seat layouts, adapted from the original data file.
const generateSeats = (rows: number, cols: number, aisleCols: number[], lastRowFull: boolean = false) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLastRow = r === rows - 1;
      const isAisle = aisleCols.includes(c) && !(lastRowFull && isLastRow);
      
      seats.push({
        seatNumber: `${c + 1}${String.fromCharCode(65 + r)}`,
        status: isAisle ? SeatStatus.AVAILABLE : (Math.random() > 0.7 ? SeatStatus.OCCUPIED : SeatStatus.AVAILABLE),
        type: isAisle ? SeatType.AISLE : SeatType.SEAT,
      });
    }
  }
  return seats;
};


async function main() {
  console.log('Start seeding...');

  // 1. Create Bus Owners
  const owner1 = await prisma.busOwner.create({
    data: {
      name: 'FleetFirst Inc.',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 100, type: CommissionType.PERCENTAGE, value: 5 },
          { minSales: 101, maxSales: 500, type: CommissionType.PERCENTAGE, value: 4 },
          { minSales: 501, maxSales: 999999, type: CommissionType.PERCENTAGE, value: 3 },
        ],
      },
    },
  });

  const owner2 = await prisma.busOwner.create({
    data: {
      name: 'RoadRunner Co.',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 999999, type: CommissionType.FIXED, value: 2.50 },
        ],
      },
    },
  });

  console.log(`Created owners: ${owner1.name}, ${owner2.name}`);

  // 2. Create Buses and their SeatLayouts
  const bus1 = await prisma.bus.create({
    data: {
      name: 'Standard Cruiser',
      capacity: 48,
      ownerId: owner1.id,
      layout: {
        create: {
          rows: 12,
          cols: 5,
          seats: {
            create: generateSeats(12, 5, [2]),
          },
        },
      },
    },
  });

  const bus2 = await prisma.bus.create({
    data: {
      name: 'Luxury Liner',
      capacity: 36,
      ownerId: owner2.id,
      layout: {
        create: {
          rows: 9,
          cols: 5,
          seats: {
            create: generateSeats(9, 5, [2]),
          },
        },
      },
    },
  });

   const bus3 = await prisma.bus.create({
    data: {
      name: 'City Hopper',
      capacity: 52,
      ownerId: owner1.id,
      layout: {
        create: {
          rows: 13,
          cols: 5,
          seats: {
            create: generateSeats(13, 5, [2]),
          },
        },
      },
    },
  });

  console.log(`Created buses: ${bus1.name}, ${bus2.name}, ${bus3.name}`);
  
  // 3. Create Routes
  const route1 = await prisma.route.create({
    data: {
      origin: 'New York, NY',
      destination: 'Boston, MA',
      departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      arrivalTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      price: 45.00,
      busId: bus1.id,
    }
  });

  const route2 = await prisma.route.create({
    data: {
        origin: 'Los Angeles, CA',
        destination: 'San Francisco, CA',
        departureTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        arrivalTime: new Date(Date.now() + 9 * 60 * 60 * 1000),
        price: 60.00,
        busId: bus2.id,
    }
  });

   const route3 = await prisma.route.create({
    data: {
        origin: 'Chicago, IL',
        destination: 'Detroit, MI',
        departureTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        arrivalTime: new Date(Date.now() + 9 * 60 * 60 * 1000),
        price: 35.00,
        busId: bus1.id,
    }
  });

  const route4 = await prisma.route.create({
    data: {
        origin: 'Miami, FL',
        destination: 'Orlando, FL',
        departureTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        arrivalTime: new Date(Date.now() + 9 * 60 * 60 * 1000),
        price: 25.00,
        busId: bus2.id,
    }
  });

  const route5 = await prisma.route.create({
    data: {
        origin: 'New York, NY',
        destination: 'Boston, MA',
        departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        arrivalTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
        price: 55.00,
        busId: bus3.id,
    }
  });

  console.log('Created 5 routes.');

  // 4. Create a sample Discount
  const summerDiscount = await prisma.discount.create({
    data: {
        name: 'Summer Group Offer',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        tiers: {
            create: [
                { minTickets: 2, maxTickets: 4, percentage: 10 },
                { minTickets: 5, maxTickets: 10, percentage: 15 },
            ]
        }
    }
  });

  console.log(`Created discount: ${summerDiscount.name}`);

  // 5. Create some sample Bookings
  const booking1 = await prisma.booking.create({
    data: {
      passengerName: 'Alice Johnson',
      passengerEmail: 'alice@example.com',
      totalPrice: 45.00,
      routeId: route1.id,
      seats: {
        create: [
          { seatNumber: '1A', status: SeatStatus.OCCUPIED, type: SeatType.SEAT },
        ]
      }
    }
  });

  const booking2 = await prisma.booking.create({
    data: {
      passengerName: 'Bob Williams',
      passengerEmail: 'bob@example.com',
      totalPrice: 120.00,
      routeId: route2.id,
      seats: {
        create: [
          { seatNumber: '2B', status: SeatStatus.OCCUPIED, type: SeatType.SEAT },
          { seatNumber: '2C', status: SeatStatus.OCCUPIED, type: SeatType.SEAT },
        ]
      }
    }
  });
  
  console.log(`Created bookings for ${booking1.passengerName} and ${booking2.passengerName}.`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
