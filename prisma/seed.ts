
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

  // Create Bus Owners
  const owner1 = await prisma.busOwner.create({
    data: {
      id: generateId(15),
      name: 'FleetFirst Inc.',
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
      name: 'RoadRunner Co.',
      bankAccountNumber: '7000202744498',
      commissionTiers: {
        create: [
          { minSales: 1, maxSales: 10000, type: 'PERCENTAGE', value: 6 },
        ],
      },
    },
  });
  console.log('Created bus owners.');

  // Create Users
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

  // Create Buses for Owner 1
  const bus1 = await prisma.bus.create({
    data: {
      name: 'FF-01 Luxury Liner',
      capacity: 45,
      owner: {
        connect: {
          id: owner1.id,
        },
      },
      layout: {
        create: {
          rows: 12,
          cols: 5,
          seats: {
            create: generateSeats(12, 5, [3], true),
          },
        },
      },
    },
  });

  const bus2 = await prisma.bus.create({
    data: {
      name: 'FF-02 Express',
      capacity: 40,
      owner: {
        connect: {
          id: owner1.id,
        },
      },
      layout: {
        create: {
          rows: 10,
          cols: 5,
          seats: {
            create: generateSeats(10, 5, [3], false),
          },
        },
      },
    },
  });

  // Create Buses for Owner 2
  const bus3 = await prisma.bus.create({
    data: {
      name: 'RR-Cruiser',
      capacity: 49,
      owner: {
        connect: {
          id: owner2.id,
        },
      },
      layout: {
        create: {
          rows: 13,
          cols: 5,
          seats: {
            create: generateSeats(13, 5, [3], true),
          },
        },
      },
    },
  });
  console.log('Created buses and seat layouts.');

  // Create Locations
  const locationsData = [
    { name: 'Addis Ababa', ownerId: owner1.id },
    { name: 'Hawassa', ownerId: owner1.id },
    { name: 'Bahir Dar', ownerId: owner1.id },
    { name: 'Gondar', ownerId: owner1.id },
    { name: 'Mekelle', ownerId: owner2.id },
    { name: 'Dire Dawa', ownerId: owner2.id },
    { name: 'Adama', ownerId: owner2.id },
  ];
  
  const locations = await Promise.all(
      locationsData.map(loc => prisma.location.create({ data: loc }))
  );
  console.log('Created locations.');
  
  const locMap = new Map(locations.map(l => [l.name, l.id]));


  // Create Routes
  await prisma.route.createMany({
    data: [
        {
            originId: locMap.get('Addis Ababa')!,
            destinationId: locMap.get('Hawassa')!,
            departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            arrivalTime: new Date(Date.now() + 29 * 60 * 60 * 1000), // Tomorrow + 5 hours
            price: 500.00,
            busId: bus1.id,
        },
        {
            originId: locMap.get('Addis Ababa')!,
            destinationId: locMap.get('Bahir Dar')!,
            departureTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // In 2 days
            arrivalTime: new Date(Date.now() + 58 * 60 * 60 * 1000), // In 2 days + 10 hours
            price: 800.00,
            busId: bus2.id,
        },
        {
            originId: locMap.get('Mekelle')!,
            destinationId: locMap.get('Dire Dawa')!,
            departureTime: new Date(Date.now() + 36 * 60 * 60 * 1000), // In 1.5 days
            arrivalTime: new Date(Date.now() + 50 * 60 * 60 * 1000), // In 1.5 days + 14 hours
            price: 1200.00,
            busId: bus3.id,
        }
    ]
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
