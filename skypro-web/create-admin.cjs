const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL || 'admin@skywaveads.com';
const PASSWORD = process.env.ADMIN_PASSWORD;
const NAME = process.env.ADMIN_NAME || 'Admin';
const CREATE_TEST_USER = process.env.CREATE_TEST_USER === '1';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

function requireStrongPassword(label, value) {
  if (!value || value.length < 12) {
    throw new Error(`Set ${label} to a strong password with at least 12 characters.`);
  }
  return value;
}

async function main() {
  try {
    const adminPassword = requireStrongPassword('ADMIN_PASSWORD', PASSWORD);
    const passwordHash = bcrypt.hashSync(adminPassword, 12);

    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      await prisma.user.update({
        where: { email: EMAIL },
        data: { passwordHash, role: 'admin', status: 'active', emailVerifiedAt: new Date() },
      });
      console.log('Admin user updated:', existing.id, EMAIL);
    } else {
      const user = await prisma.user.create({
        data: {
          email: EMAIL,
          name: NAME,
          passwordHash,
          role: 'admin',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });
      console.log('Admin user created:', user.id, user.email);
    }

    if (CREATE_TEST_USER) {
      const testPassword = requireStrongPassword('TEST_USER_PASSWORD', TEST_PASSWORD);
      const testHash = bcrypt.hashSync(testPassword, 12);
      const testExisting = await prisma.user.findUnique({ where: { email: 'test@skywaveads.com' } });
      if (!testExisting) {
        await prisma.user.create({
          data: {
            email: 'test@skywaveads.com',
            name: 'Test User',
            passwordHash: testHash,
            role: 'user',
            status: 'active',
            emailVerifiedAt: new Date(),
          },
        });
        console.log('Test user created: test@skywaveads.com');
      }
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, status: true },
      orderBy: { id: 'asc' },
    });
    console.log('\nUsers:');
    users.forEach((u) => console.log(`  ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`));
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
