
import { PrismaClient, Role, SeatStatus, SeatType, BookingStatus, PaymentStatus } from '@prisma/client';
import { Argon2id } from 'oslo/password';
import { generateId } from 'lucia';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Clear existing data to ensure a clean slate
  await prisma.apiRequestAttempt.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookedSeat.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.seatLayout.deleteMany({});
  await prisma.bus.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.commissionTier.deleteMany({});
  await prisma.discountTier.deleteMany({});
  await prisma.discount.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.busOwner.deleteMany({});
  
  console.log('Cleared previous data.');

  const superAdminPassword = await new Argon2id().hash('password');
  const adminPassword = await new Argon2id().hash('Getaye@123');

  // --- Create Bus Owners ---
  const owner1 = await prisma.busOwner.create({
    data: {
      id: generateId(15),
      name: 'Selam Bus Lines',
      bankAccountNumber: '7000101633387',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 5000, type: 'PERCENTAGE', value: 5 },
          { minSales: 5001, maxSales: 10000, type: 'PERCENTAGE', value: 4 },
        ],
      },
    },
  });
  console.log('Created bus owner.');

  // --- Create Users ---
  await prisma.user.create({
    data: {
      id: generateId(15),
      email: 'super@example.com',
      name: 'Super Admin',
      hashed_password: superAdminPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      id: generateId(15),
      email: 'admin@example.com',
      name: 'Getaye Temesgen',
      hashed_password: adminPassword,
      role: Role.ADMIN,
      busOwnerId: owner1.id,
    },
  });
  console.log('Created users.');
  
  // --- Create Locations ---
  const locationNames = ['Addis Ababa', 'Bahir Dar', 'Gondar', 'Mekelle', 'Hawassa', 'Dire Dawa', 'Jimma', 'Adama', 'Axum', 'Lalibela', 'Dessie', 'Harar'];
  const locations = await Promise.all(
    locationNames.map(name =>
      prisma.location.create({
        data: {
          name,
          ownerId: owner1.id,
        }
      })
    )
  );
  
  console.log('Created locations.');

  // Helper function to generate seats
  const generateSeats = (rows: number, cols: number, aisleCols: number[], lastRowFull: boolean = false) => {
      const seats = [];
      for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
          const isLastRow = r === rows - 1;
          const isAisle = aisleCols.includes(c + 1) && !(lastRowFull && isLastRow);
          
          seats.push({
              seatNumber: `${String.fromCharCode(65 + r)}${c + 1}`,
              status: SeatStatus.AVAILABLE,
              type: isAisle ? SeatType.AISLE : SeatType.SEAT,
          });
          }
      }
      return seats;
  };

  // --- Create Buses ---
  const bus1 = await prisma.bus.create({
    data: {
      name: 'Selam Class 1', capacity: 45, owner: { connect: { id: owner1.id } },
      layout: { create: { rows: 12, cols: 5, seats: { create: generateSeats(12, 5, [3], true) } } }
    },
  });

  const bus2 = await prisma.bus.create({
    data: {
      name: 'Selam Express', capacity: 40, owner: { connect: { id: owner1.id } },
      layout: { create: { rows: 10, cols: 5, seats: { create: generateSeats(10, 5, [3], false) } } }
    },
  });

  const bus3 = await prisma.bus.create({
    data: {
      name: 'Selam Special', capacity: 49, owner: { connect: { id: owner1.id } },
      layout: { create: { rows: 13, cols: 5, seats: { create: generateSeats(13, 5, [3], true) } } }
    },
  });

  const bus4 = await prisma.bus.create({
    data: {
      name: 'Selam Cruiser', capacity: 40, owner: { connect: { id: owner1.id } },
      layout: { create: { rows: 10, cols: 5, seats: { create: generateSeats(10, 5, [3], false) } } }
    },
  });

  const bus5 = await prisma.bus.create({
    data: {
      name: 'Selam Swift', capacity: 45, owner: { connect: { id: owner1.id } },
      layout: { create: { rows: 12, cols: 5, seats: { create: generateSeats(12, 5, [3], true) } } }
    },
  });
  console.log('Created buses.');
  
  const allBuses = [bus1, bus2, bus3, bus4, bus5];

  // --- Create Discounts ---
  const discount1 = await prisma.discount.create({
    data: {
      name: 'Early Bird Special',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      owner: { connect: { id: owner1.id } },
      tiers: {
        create: [
          { minTickets: 2, maxTickets: 4, percentage: 10 },
          { minTickets: 5, maxTickets: 10, percentage: 15 },
        ]
      }
    }
  });
  
  const discount2 = await prisma.discount.create({
    data: {
      name: 'Weekend Getaway',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 60)),
      owner: { connect: { id: owner1.id } },
      tiers: {
        create: [
          { minTickets: 3, maxTickets: 10, percentage: 12 },
        ]
      }
    }
  });

  console.log('Created discounts.');

  // --- Create Routes ---
  const routesToCreate = [];
  const routeCount = 50; // Create 50 routes
  for (let i = 0; i < routeCount; i++) {
    const bus = allBuses[i % allBuses.length];
    const departureDaysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +29 days from now
    const departureHour = Math.floor(Math.random() * 12) + 6; // 6 AM to 5 PM
    const travelHours = Math.floor(Math.random() * 8) + 2; // 2 to 9 hours travel time

    const departureTime = new Date();
    departureTime.setDate(departureTime.getDate() + departureDaysOffset);
    departureTime.setHours(departureHour, 0, 0, 0);

    const arrivalTime = new Date(departureTime.getTime() + travelHours * 60 * 60 * 1000);
    
    let origin, destination;
    do {
      origin = locations[Math.floor(Math.random() * locations.length)];
      destination = locations[Math.floor(Math.random() * locations.length)];
    } while (origin.id === destination.id);

    routesToCreate.push({
      originId: origin.id,
      destinationId: destination.id,
      departureTime,
      arrivalTime,
      price: Math.floor(Math.random() * 500) + 150, // Price between 150 and 649
      busId: bus.id,
      discountId: (i % 2 === 0) ? discount1.id : null, // Assign discount to half the routes
    });
  }

  await prisma.route.createMany({
    data: routesToCreate,
  });
  console.log(`Created ${routeCount} routes.`);
  
  // --- Create Bookings for past routes for analytics ---
  const pastRoutes = await prisma.route.findMany({
      where: {
          departureTime: {
              lt: new Date()
          }
      },
      include: {
          bus: { include: { layout: { include: { seats: true }}}}
      }
  });

  const bookingsToCreate = [];
  for (const route of pastRoutes) {
      if (!route.bus.layout) continue;

      const availableSeats = route.bus.layout.seats.filter(s => s.type === 'SEAT');
      const seatsToBookCount = Math.min(availableSeats.length, Math.floor(Math.random() * (route.bus.capacity / 2)) + 5);
      
      if (seatsToBookCount > 0) {
          const seatsToBook = availableSeats.slice(0, seatsToBookCount);
          const bookingId = generateId(15);
          bookingsToCreate.push(
              prisma.booking.create({
                  data: {
                      id: bookingId,
                      passengerName: `Passenger ${Math.floor(Math.random() * 1000)}`,
                      passengerPhone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
                      totalPrice: route.price * seatsToBookCount,
                      routeId: route.id,
                      status: BookingStatus.VALID,
                      paymentStatus: PaymentStatus.PAID,
                      bookedSeats: {
                          create: seatsToBook.map(s => ({ seatNumber: s.seatNumber }))
                      },
                      payments: {
                          create: {
                              amount: route.price * seatsToBookCount,
                              status: PaymentStatus.PAID,
                              transactionId: generateId(20),
                              referenceNumber: generateId(15)
                          }
                      }
                  }
              })
          )
      }
  }

  await Promise.all(bookingsToCreate);
  console.log(`Created ${bookingsToCreate.length} historical bookings.`);


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
