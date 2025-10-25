
import { PrismaClient, Role, SeatStatus, SeatType } from '@prisma/client';
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

  const hashedPassword = await new Argon2id().hash('password');

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

  const owner2 = await prisma.busOwner.create({
    data: {
      id: generateId(15),
      name: 'Abay Bus Service',
      bankAccountNumber: '7000202744498',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 10000, type: 'PERCENTAGE', value: 6 },
        ],
      },
    },
  });

  const owner3 = await prisma.busOwner.create({
    data: {
      id: generateId(15),
      name: 'Golden Express',
      bankAccountNumber: '7000303855509',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 20000, type: 'PERCENTAGE', value: 7 },
        ],
      },
    },
  });
  console.log('Created bus owners.');

  // --- Create Users ---
  await prisma.user.create({
    data: {
      id: generateId(15),
      email: 'super@example.com',
      name: 'Super Admin',
      hashed_password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      id: generateId(15),
      email: 'admin@example.com',
      name: 'Admin User One',
      hashed_password: hashedPassword,
      role: Role.ADMIN,
      busOwnerId: owner1.id,
    },
  });

  await prisma.user.create({
    data: {
      id: generateId(15),
      email: 'runner@example.com',
      name: 'Admin User Two',
      hashed_password: hashedPassword,
      role: Role.ADMIN,
      busOwnerId: owner2.id,
    },
  });

  await prisma.user.create({
    data: {
      id: generateId(15),
      email: 'golden@example.com',
      name: 'Admin Golden',
      hashed_password: hashedPassword,
      role: Role.ADMIN,
      busOwnerId: owner3.id,
    },
  });
  console.log('Created users.');
  
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
      name: 'Selam Class 1', capacity: 45, ownerId: owner1.id,
      layout: { create: { rows: 12, cols: 5, seats: { create: generateSeats(12, 5, [3], true) } } }
    },
  });

  const bus2 = await prisma.bus.create({
    data: {
      name: 'Selam Express', capacity: 40, ownerId: owner1.id,
      layout: { create: { rows: 10, cols: 5, seats: { create: generateSeats(10, 5, [3], false) } } }
    },
  });

  const bus3 = await prisma.bus.create({
    data: {
      name: 'Abay Special', capacity: 49, ownerId: owner2.id,
      layout: { create: { rows: 13, cols: 5, seats: { create: generateSeats(13, 5, [3], true) } } }
    },
  });

  const bus4 = await prisma.bus.create({
    data: {
      name: 'Abay Flyer', capacity: 45, ownerId: owner2.id,
      layout: { create: { rows: 12, cols: 5, seats: { create: generateSeats(12, 5, [3], true) } } }
    },
  });

  const bus5 = await prisma.bus.create({
    data: {
      name: 'Golden Cruiser', capacity: 52, ownerId: owner3.id,
      layout: { create: { rows: 13, cols: 5, seats: { create: generateSeats(13, 5, [3], false) } } }
    },
  });

   const bus6 = await prisma.bus.create({
    data: {
      name: 'Golden Jet', capacity: 49, ownerId: owner3.id,
      layout: { create: { rows: 13, cols: 5, seats: { create: generateSeats(13, 5, [3], true) } } }
    },
  });
  console.log('Created buses and seat layouts.');

  // --- Create Locations ---
  const locationsData = [
    { name: 'Addis Ababa', ownerId: owner1.id }, { name: 'Hawassa', ownerId: owner1.id },
    { name: 'Bahir Dar', ownerId: owner1.id }, { name: 'Gondar', ownerId: owner1.id },
    { name: 'Mekelle', ownerId: owner2.id }, { name: 'Dire Dawa', ownerId: owner2.id },
    { name: 'Adama', ownerId: owner2.id }, { name: 'Jimma', ownerId: owner3.id },
    { name: 'Dessie', ownerId: owner3.id }, { name: 'Jigjiga', ownerId: owner1.id },
    { name: 'Shashamane', ownerId: owner2.id }, { name: 'Arba Minch', ownerId: owner3.id }
  ];
  
  const locations = await Promise.all(
      locationsData.map(loc => prisma.location.create({ data: loc }))
  );
  console.log('Created locations.');
  
  const locMap = new Map(locations.map(l => [l.name, l.id]));

  // --- Create Discounts ---
  const weekendDiscount = await prisma.discount.create({
      data: {
          name: 'Weekend Special',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          ownerId: owner1.id,
          tiers: {
              create: [
                  { minTickets: 2, maxTickets: 3, percentage: 10 },
                  { minTickets: 4, maxTickets: 10, percentage: 15 },
              ]
          }
      }
  });
  console.log('Created discounts.');

  // --- Create Routes ---
  const routesToCreate = [
    // --- Selam Bus Lines Routes (owner1) ---
    // Future routes
    { origin: 'Addis Ababa', dest: 'Hawassa', days_offset: 1, hour: 8, duration_h: 5, price: 550, busId: bus1.id, discountId: weekendDiscount.id },
    { origin: 'Addis Ababa', dest: 'Gondar', days_offset: 2, hour: 6, duration_h: 10, price: 900, busId: bus2.id, discountId: null },
    { origin: 'Addis Ababa', dest: 'Gondar', days_offset: 2, hour: 7, duration_h: 10, price: 920, busId: bus1.id, discountId: null }, // Same route, different bus/time
    { origin: 'Dessie', dest: 'Addis Ababa', days_offset: 3, hour: 9, duration_h: 8, price: 700, busId: bus1.id, discountId: weekendDiscount.id },
    { origin: 'Jigjiga', dest: 'Addis Ababa', days_offset: 4, hour: 10, duration_h: 12, price: 1100, busId: bus2.id, discountId: null },
    // Expired route
    { origin: 'Hawassa', dest: 'Addis Ababa', days_offset: -1, hour: 14, duration_h: 5, price: 500, busId: bus1.id, discountId: null },
    
    // --- Abay Bus Service Routes (owner2) ---
    // Future routes
    { origin: 'Mekelle', dest: 'Dire Dawa', days_offset: 1, hour: 7, duration_h: 14, price: 1250, busId: bus3.id, discountId: null },
    { origin: 'Adama', dest: 'Bahir Dar', days_offset: 2, hour: 8, duration_h: 9, price: 850, busId: bus4.id, discountId: null },
    { origin: 'Shashamane', dest: 'Addis Ababa', days_offset: 3, hour: 13, duration_h: 4, price: 450, busId: bus3.id, discountId: null },
    { origin: 'Addis Ababa', dest: 'Mekelle', days_offset: 5, hour: 5, duration_h: 15, price: 1300, busId: bus4.id, discountId: null },
     // Expired route
    { origin: 'Bahir Dar', dest: 'Adama', days_offset: -2, hour: 7, duration_h: 9, price: 820, busId: bus4.id, discountId: null },
    
    // --- Golden Express Routes (owner3) ---
    // Future routes
    { origin: 'Jimma', dest: 'Addis Ababa', days_offset: 1, hour: 9, duration_h: 7, price: 650, busId: bus5.id, discountId: null },
    { origin: 'Arba Minch', dest: 'Addis Ababa', days_offset: 2, hour: 6, duration_h: 9, price: 780, busId: bus6.id, discountId: null },
    { origin: 'Addis Ababa', dest: 'Dessie', days_offset: 3, hour: 7, duration_h: 8, price: 720, busId: bus5.id, discountId: null },
    { origin: 'Jimma', dest: 'Arba Minch', days_offset: 4, hour: 8, duration_h: 10, price: 950, busId: bus6.id, discountId: null },
    // Expired route
    { origin: 'Addis Ababa', dest: 'Jimma', days_offset: -3, hour: 10, duration_h: 7, price: 630, busId: bus5.id, discountId: null },
  ];

  await prisma.route.createMany({
    data: routesToCreate.map(r => {
        const departure = new Date();
        departure.setDate(departure.getDate() + r.days_offset);
        departure.setHours(r.hour, 0, 0, 0);

        const arrival = new Date(departure);
        arrival.setHours(arrival.getHours() + r.duration_h);

        return {
            originId: locMap.get(r.origin)!,
            destinationId: locMap.get(r.dest)!,
            departureTime: departure,
            arrivalTime: arrival,
            price: r.price,
            busId: r.busId,
            discountId: r.discountId
        }
    })
  });
  console.log('Created routes.');

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
