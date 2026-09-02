import { prisma } from '../lib/prisma';

async function testCreate() {
  try {
    const school = await prisma.school.findFirst();
    if (!school) {
      console.error('No school found!');
      return;
    }
    console.log('Testing room creation for school:', school.name, school.id);

    const newRoom = await prisma.room.create({
      data: {
        id: `room-test-${Date.now()}`,
        schoolId: school.id,
        roomNumber: 'Test Room 99',
        floor: '3rd Floor',
        block: 'Block C',
        capacity: 40,
      },
    });
    console.log('Successfully created room:', newRoom);

    // Clean up test room
    await prisma.room.delete({ where: { id: newRoom.id } });
    console.log('Test room cleaned up successfully.');
  } catch (err) {
    console.error('Error creating test room:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testCreate();
