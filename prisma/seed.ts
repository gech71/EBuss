
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Simple ID generator to replace lucia's generateId
function generateId(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

async function main() {
  console.log('Start seeding...');

  // Clear existing data to ensure a clean slate
  await prisma.apiRequestAttempt.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookedSeat.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.busRoute.deleteMany({});
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

  const superAdminPassword = await bcrypt.hash('password', SALT_ROUNDS);
  const adminPassword = await bcrypt.hash('password', SALT_ROUNDS);

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
  const locations = await prisma.location.createManyAndReturn({
      data: [
        { name: 'Addis Ababa', ownerId: owner1.id },
        { name: 'Adama', ownerId: owner1.id },
        { name: 'Hawassa', ownerId: owner1.id },
        { name: 'Bahir Dar', ownerId: owner1.id },
        { name: 'Gondar', ownerId: owner1.id },
        { name: 'Mekelle', ownerId: owner1.id },
        { name: 'Dire Dawa', ownerId: owner1.id },
        { name: 'Jimma', ownerId: owner1.id },
      ],
  });
  console.log(`Created ${locations.length} locations.`);

  // --- Create Buses for Selam Bus ---
  const bus1 = await prisma.bus.create({
      data: {
          name: 'Selam 1',
          capacity: 45,
          owner: { connect: { id: owner1.id } },
          layout: { create: { rows: 11, cols: 5, seats: { create: Array.from({ length: 55 }).map((_, i) => ({ seatNumber: `${String.fromCharCode(65 + Math.floor(i / 5))}${ (i % 5) + 1 }`, type: (i % 5 === 2) ? 'AISLE' : 'SEAT' })) } } }
      }
  });

  const bus2 = await prisma.bus.create({
      data: {
          name: 'Selam 2',
          capacity: 45,
          owner: { connect: { id: owner1.id } },
          layout: { create: { rows: 11, cols: 5, seats: { create: Array.from({ length: 55 }).map((_, i) => ({ seatNumber: `${String.fromCharCode(65 + Math.floor(i / 5))}${ (i % 5) + 1 }`, type: (i % 5 === 2) ? 'AISLE' : 'SEAT' })) } } }
      }
  });

  const bus3 = await prisma.bus.create({
      data: {
          name: 'Selam VIP',
          capacity: 30,
          owner: { connect: { id: owner1.id } },
          layout: { create: { rows: 10, cols: 4, seats: { create: Array.from({ length: 40 }).map((_, i) => ({ seatNumber: `${String.fromCharCode(65 + Math.floor(i / 4))}${ (i % 4) + 1 }`, type: (i % 4 === 1) ? 'AISLE' : 'SEAT' })) } } }
      }
  });
  console.log('Created buses.');

  // --- Create Routes ---
  const addisAbaba = locations.find(l => l.name === 'Addis Ababa');
  const hawassa = locations.find(l => l.name === 'Hawassa');
  const bahirDar = locations.find(l => l.name === 'Bahir Dar');
  const adama = locations.find(l => l.name === 'Adama');

  if (addisAbaba && hawassa && bahirDar && adama) {
      await prisma.route.createMany({
          data: [
              // Future routes
              { originId: addisAbaba.id, destinationId: hawassa.id, busId: bus1.id, departureTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), arrivalTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), price: 500 },
              { originId: addisAbaba.id, destinationId: bahirDar.id, busId: bus2.id, departureTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), arrivalTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), price: 700 },
              { originId: hawassa.id, destinationId: addisAbaba.id, busId: bus1.id, departureTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), arrivalTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), price: 500 },
              { originId: addisAbaba.id, destinationId: adama.id, busId: bus3.id, departureTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), arrivalTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), price: 250 },
              // Past routes
              { originId: addisAbaba.id, destinationId: hawassa.id, busId: bus1.id, departureTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), arrivalTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), price: 450 },
          ]
      });
      console.log('Created routes.');
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
