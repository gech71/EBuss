
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
      name: 'Abay Special', capacity: 49, owner: { connect: { id: owner2.id } },
      layout: { create: { rows: 13, cols: 5, seats: { create: generateSeats(13, 5, [3], true) } } }
    },
  });

  const bus4 = await prisma.bus.create({
    data:.