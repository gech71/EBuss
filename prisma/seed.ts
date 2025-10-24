
import { PrismaClient, SeatStatus, SeatType, CommissionType, Role, PaymentStatus, BookingStatus } from '@prisma/client';
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
  await prisma.loginAttempt.deleteMany();
  await prisma.session.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookedSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.discountTier.deleteMany();
  await prisma.route.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.seatLayout.deleteMany();
  await prisma.commissionTier.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.busOwner.deleteMany();
  console.log('Existing data cleared.');

  
  // 2. Create Bus Owners
  const owner1 = await prisma.busOwner.create({
    data: {
      name: 'Selam Bus',
      bankAccountNumber: '7000123456789',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 10000, type: CommissionType.PERCENTAGE, value: 5 },
          { minSales: 10001, maxSales: 50000, type: CommissionType.PERCENTAGE, value: 4 },
          { minSales: 50001, maxSales: 9999999, type: CommissionType.PERCENTAGE, value: 3 },
        ],
      },
    },
  });

  const owner2 = await prisma.busOwner.create({
    data: {
      name: 'Abyssinia Bus',
      bankAccountNumber: '7000987654321',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 9999999, type: CommissionType.FIXED, value: 50.00 },
        ],
      },
    },
  });

  console.log(`Created owners: ${owner1.name}, ${owner2.name}`);


  // 3. Create Locations
  const locationsData = [
      { name: 'Addis Ababa', ownerId: owner1.id },
      { name: 'Adama', ownerId: owner1.id },
      { name: 'Hawassa', ownerId: owner2.id },
      { name: 'Bahir Dar', ownerId: owner2.id },
      { name: 'Gondar', ownerId: owner1.id },
      { name: 'Mekelle', ownerId: owner1.id },
      { name: 'Dire Dawa', ownerId: owner2.id },
      { name: 'Jimma', ownerId: owner2.id },
      { name: 'Dessie', ownerId: owner1.id },
      { name: 'Arba Minch', ownerId: owner1.id },
      { name: 'Shashemene', ownerId: owner2.id },
      { name: 'Harar', ownerId: owner2.id },
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
      id: 'user-super-admin',
      name: 'Super Admin',
      email: 'super@example.com',
      hashed_password: await new Argon2id().hash('password'),
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      id: 'user-admin-1',
      name: 'Selam Admin',
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
      id: 'user-admin-2',
      name: 'Abyssinia Admin',
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
        name: 'Holiday Group Offer',
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
  const routesToCreate = [
    // 10 with discounts
    { origin: 'Addis Ababa', destination: 'Hawassa', departureHour: 9, price: 450.00, busId: bus1.id, discountId: summerDiscount.id, dayOffset: 1 },
    { origin: 'Addis Ababa', destination: 'Bahir Dar', departureHour: 11, price: 750.00, busId: bus2.id, discountId: weekendDiscount.id, dayOffset: 1 },
    { origin: 'Addis Ababa', destination: 'Hawassa', departureHour: 15, price: 550.00, busId: bus3.id, discountId: summerDiscount.id, dayOffset: 1 },
    { origin: 'Gondar', destination: 'Bahir Dar', departureHour: 10, price: 300.00, busId: bus1.id, discountId: summerDiscount.id, dayOffset: 2 },
    { origin: 'Dire Dawa', destination: 'Harar', departureHour: 13, price: 150.00, busId: bus2.id, discountId: weekendDiscount.id, dayOffset: 2 },
    { origin: 'Hawassa', destination: 'Addis Ababa', departureHour: 9, price: 450.00, busId: bus1.id, discountId: summerDiscount.id, dayOffset: 3 },
    { origin: 'Bahir Dar', destination: 'Addis Ababa', departureHour: 11, price: 750.00, busId: bus2.id, discountId: weekendDiscount.id, dayOffset: 3 },
    { origin: 'Bahir Dar', destination: 'Gondar', departureHour: 16, price: 300.00, busId: bus3.id, discountId: summerDiscount.id, dayOffset: 4 },
    { origin: 'Harar', destination: 'Dire Dawa', departureHour: 14, price: 150.00, busId: bus2.id, discountId: weekendDiscount.id, dayOffset: 4 },
    { origin: 'Addis Ababa', destination: 'Adama', departureHour: 12, price: 200.00, busId: bus1.id, discountId: summerDiscount.id, dayOffset: 5 },
    
    // 10 without discounts
    { origin: 'Dessie', destination: 'Mekelle', departureHour: 8, price: 500.00, busId: bus1.id, discountId: null, dayOffset: 2 },
    { origin: 'Jimma', destination: 'Addis Ababa', departureHour: 14, price: 600.00, busId: bus2.id, discountId: null, dayOffset: 2 },
    { origin: 'Mekelle', destination: 'Dessie', departureHour: 18, price: 500.00, busId: bus3.id, discountId: null, dayOffset: 3 },
    { origin: 'Addis Ababa', destination: 'Jimma', departureHour: 9, price: 600.00, busId: bus2.id, discountId: null, dayOffset: 3 },
    { origin: 'Addis Ababa', destination: 'Arba Minch', departureHour: 7, price: 800.00, busId: bus1.id, discountId: null, dayOffset: 4 },
    { origin: 'Arba Minch', destination: 'Addis Ababa', departureHour: 19, price: 800.00, busId: bus3.id, discountId: null, dayOffset: 5 },
    { origin: 'Hawassa', destination: 'Shashemene', departureHour: 6, price: 120.00, busId: bus2.id, discountId: null, dayOffset: 6 },
    { origin: 'Shashemene', destination: 'Hawassa', departureHour: 20, price: 120.00, busId: bus2.id, discountId: null, dayOffset: 7 },
    { origin: 'Adama', destination: 'Addis Ababa', departureHour: 13, price: 200.00, busId: bus1.id, discountId: null, dayOffset: 8 },
    { origin: 'Addis Ababa', destination: 'Dire Dawa', departureHour: 13, price: 900.00, busId: bus3.id, discountId: null, dayOffset: 9 },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const routeData of routesToCreate) {
    const departureDate = new Date(today);
    departureDate.setDate(today.getDate() + routeData.dayOffset);
    
    const departureTime = new Date(departureDate);
    departureTime.setHours(routeData.departureHour, 0, 0, 0);

    const arrivalTime = new Date(departureTime);
    // Assuming travel time is roughly 4 hours for simplicity
    arrivalTime.setHours(departureTime.getHours() + 4, 30, 0, 0);

    await prisma.route.create({
      data: {
        originId: locationMap.get(routeData.origin)!,
        destinationId: locationMap.get(routeData.destination)!,
        departureTime,
        arrivalTime,
        price: routeData.price,
        busId: routeData.busId,
        discountId: routeData.discountId,
      }
    });
  }

  console.log(`Created ${routesToCreate.length} routes.`);

  const allCreatedRoutes = await prisma.route.findMany();

  // 8. Create some sample Bookings
  if (allCreatedRoutes.length >= 3) {
    const booking1 = await prisma.booking.create({
      data: {
        passengerName: 'Abebe Kebede',
        passengerPhone: '123-456-7890',
        passengerEmail: 'abebe@example.com',
        totalPrice: allCreatedRoutes[0].price,
        routeId: allCreatedRoutes[0].id,
        status: BookingStatus.VALID,
        paymentStatus: PaymentStatus.PAID,
        bookedSeats: {
          create: [
            { seatNumber: 'A1' },
          ]
        }
      }
    });

    const booking2 = await prisma.booking.create({
      data: {
        passengerName: 'Birtukan Tadesse',
        passengerPhone: '098-765-4321',
        passengerEmail: 'birtukan@example.com',
        totalPrice: allCreatedRoutes[1].price * 2,
        routeId: allCreatedRoutes[1].id,
        status: BookingStatus.VALID,
        paymentStatus: PaymentStatus.PAID,
        bookedSeats: {
          create: [
            { seatNumber: 'B2' },
            { seatNumber: 'B3' },
          ]
        }
      }
    });
    
    const booking3 = await prisma.booking.create({
      data: {
        passengerName: 'Test User',
        passengerPhone: '251933704978',
        passengerEmail: 'test@example.com',
        totalPrice: allCreatedRoutes[2].price,
        routeId: allCreatedRoutes[2].id,
        status: BookingStatus.VALID,
        paymentStatus: PaymentStatus.PAID,
        bookedSeats: {
          create: [
            { seatNumber: 'C1' },
          ]
        }
      }
    });
    
    console.log(`Created bookings for ${booking1.passengerName}, ${booking2.passengerName}, and ${booking3.passengerName}.`);
  }

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
