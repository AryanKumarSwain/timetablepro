import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { sanitizeDatabaseJsonColumns } from '../lib/db-sanitize';

async function main() {
  console.log('Sanitizing database JSON columns...');
  await sanitizeDatabaseJsonColumns(prisma, true);
  console.log('Database JSON columns cleaned and synced.');
}

main()
  .catch((err) => {
    console.error('Failed to sanitize database:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
