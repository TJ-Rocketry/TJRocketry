const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  const ionId = process.argv[2];

  if (!ionId) {
    console.error('Please provide an Ion ID: node setadmin.js <ionId>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { ionId }
  });

  if (!user) {
    console.error(`User with Ion ID ${ionId} not found.`);
    process.exit(1);
  }

  const roles = new Set(user.roles);
  roles.add('admin');

  await prisma.user.update({
    where: { ionId },
    data: {
      roles: Array.from(roles),
    }
  });

  console.log(`Successfully added 'admin' role to user ${ionId} (${user.name || 'Unknown Name'}).`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
