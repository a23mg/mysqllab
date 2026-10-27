import 'dotenv/config';
import { createDatabaseAdapter } from '../db/index.ts';
import { seedFromDummyJson } from '../db/seeder.ts';

async function main() {
  console.log('--- mysqllab: DummyJSON Database Seeder ---');
  const url = process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1] || process.env.DATABASE_URL;
  const file = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1] || process.env.SQLITE_PATH;

  const adapter = await createDatabaseAdapter({ url, file });
  console.log(`Connected to: ${adapter.connectionInfo}`);

  try {
    const result = await seedFromDummyJson(adapter, 100, (msg) => {
      console.log(`[SEED] ${msg}`);
    });

    console.log(`\nDone! Seeded ${result.totalSeeded} products in ${result.durationMs}ms.`);
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await adapter.close();
  }
}

main();
