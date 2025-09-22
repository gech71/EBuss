
import { PrismaClient, SeatStatus, SeatType, CommissionType, Role } from '@prisma/client';
import { Argon2id } from 'oslo/password';

const prisma = new PrismaClient();

// Helper function to generate seat layouts, adapted from the original data file.
const generateSeats = (rows: number, cols: number, aisleCols: number[], lastRowFull: boolean = false) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLastRow = r === rows - 1;
      const isAisle = aisleCols.includes(c) && !(lastRowFull && isLastRow);
      
      seats.push({
        seatNumber: `${String.fromCharCode(65 + r)}${c + 1}`,
        status: isAisle ? SeatStatus.AVAILABLE : (Math.random() > 0.7 ? SeatStatus.OCCUPIED : SeatStatus.AVAILABLE),
        type: isAisle ? SeatType.AISLE : SeatType.SEAT,
      });
    }
  }
  return seats;
};


async function main() {
  console.log('Start seeding...');

  // 1. Clear previous data
  console.log('Clearing existing data...');
  await prisma.session.deleteMany();
  await prisma.bookedSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.discountTier.deleteMany();
  await prisma.route.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatLayout.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.commissionTier.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.busOwner.deleteMany();
  console.log('Existing data cleared.');

  
  // 2. Create Bus Owners
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


  // 3. Create Locations
  const locationsData = [
      { name: 'New York, NY', ownerId: owner1.id },
      { name: 'Boston, MA', ownerId: owner1.id },
      { name: 'Los Angeles, CA', ownerId: owner2.id },
      { name: 'San Francisco, CA', ownerId: owner2.id },
      { name: 'Chicago, IL', ownerId: owner1.id },
      { name: 'Detroit, MI', ownerId: owner1.id },
      { name: 'Miami, FL', ownerId: owner2.id },
      { name: 'Orlando, FL', ownerId: owner2.id },
  ];
  await prisma.location.createMany({
    data: locationsData,
  });
  const allLocations = await prisma.location.findMany();
  const locationMap = new Map(allLocations.map(l => [l.name, l.id]));
  console.log('Created locations.');


  // 4. Create Users
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'super@example.com',
      hashed_password: await new Argon2id().hash('password'),
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      hashed_password: await new Argon2id().hash('password'),
      role: Role.ADMIN,
      busOwner: {
        connect: { id: owner1.id },
      },
    },
  });

   await prisma.user.create({
    data: {
      name: 'RoadRunner Admin',
      email: 'runner@example.com',
      hashed_password: await new Argon2id().hash('password'),
      role: Role.ADMIN,
      busOwner: {
        connect: { id: owner2.id },
      },
    },
  });

  console.log('Created users.');


  // 5. Create Buses and their SeatLayouts
  const bus1 = await prisma.bus.create({
    data: {
      name: 'Standard Cruiser',
      capacity: 48,
      owner: {
        connect: { id: owner1.id }
      },
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
      owner: {
        connect: { id: owner2.id }
      },
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
      owner: {
        connect: { id: owner1.id }
      },
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
  
  // 6. Create Discounts
  const summerDiscount = await prisma.discount.create({
    data: {
        name: 'Summer Group Offer',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        owner: {
            connect: { id: owner1.id }
        },
        tiers: {
            create: [
                { minTickets: 2, maxTickets: 4, percentage: 10 },
                { minTickets: 5, maxTickets: 10, percentage: 15 },
            ]
        }
    }
  });

  const weekendDiscount = await prisma.discount.create({
    data: {
        name: 'Weekend Deal',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        owner: {
            connect: { id: owner2.id }
        },
        tiers: {
            create: [
                { minTickets: 2, maxTickets: 5, percentage: 8 },
            ]
        }
    }
  });

  console.log(`Created discounts: ${summerDiscount.name}, ${weekendDiscount.name}`);

  // 7. Create Routes
  const tomorrow = new Date('2025-09-19T00:00:00.000Z');
  const dayAfterTomorrow = new Date('2025-09-20T00:00:00.000Z');


  const route1 = await prisma.route.create({
    data: {
      originId: locationMap.get('New York, NY')!,
      destinationId: locationMap.get('Boston, MA')!,
      departureTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
      arrivalTime: new Date(new Date(tomorrow).setHours(13, 30, 0, 0)),
      price: 45.00,
      busId: bus1.id,
      discountId: summerDiscount.id
    }
  });

  const route2 = await prisma.route.create({
    data: {
        originId: locationMap.get('Los Angeles, CA')!,
        destinationId: locationMap.get('San Francisco, CA')!,
        departureTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
        arrivalTime: new Date(new Date(tomorrow).setHours(18, 0, 0, 0)),
        price: 60.00,
        busId: bus2.id,
        discountId: weekendDiscount.id
    }
  });

   const route3 = await prisma.route.create({
    data: {
        originId: locationMap.get('Chicago, IL')!,
        destinationId: locationMap.get('Detroit, MI')!,
        departureTime: new Date(new Date(dayAfterTomorrow).setHours(8, 30, 0, 0)),
        arrivalTime: new Date(new Date(dayAfterTomorrow).setHours(14, 0, 0, 0)),
        price: 35.00,
        busId: bus1.id,
    }
  });

  const route4 = await prisma.route.create({
    data: {
        originId: locationMap.get('Miami, FL')!,
        destinationId: locationMap.get('Orlando, FL')!,
        departureTime: new Date(new Date(dayAfterTomorrow).setHours(14, 0, 0, 0)),
        arrivalTime: new Date(new Date(dayAfterTomorrow).setHours(18, 0, 0, 0)),
        price: 25.00,
        busId: bus2.id,
    }
  });

  const route5 = await prisma.route.create({
    data: {
        originId: locationMap.get('New York, NY')!,
        destinationId: locationMap.get('Boston, MA')!,
        departureTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
        arrivalTime: new Date(new Date(tomorrow).setHours(13, 30, 0, 0)),
        price: 55.00,
        busId: bus3.id,
        discountId: summerDiscount.id
    }
  });

  console.log('Created 5 routes.');

  // 8. Create some sample Bookings
  const booking1 = await prisma.booking.create({
    data: {
      passengerName: 'Alice Johnson',
      passengerEmail: 'alice@example.com',
      totalPrice: 45.00,
      routeId: route1.id,
      status: 'VALID',
      bookedSeats: {
        create: [
          { seatNumber: 'A1' },
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
      status: 'VALID',
      bookedSeats: {
        create: [
          { seatNumber: 'B2' },
          { seatNumber: 'B3' },
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
