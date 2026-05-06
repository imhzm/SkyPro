const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL || 'admin@skywaveads.com';
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!password) {
    throw new Error('Set ADMIN_PASSWORD before checking a password.');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true, status: true, passwordHash: true },
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  console.log('User:', user.email, user.role, user.status);
  console.log('Password valid:', isValid);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
