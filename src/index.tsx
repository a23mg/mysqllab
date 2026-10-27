import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import 'dotenv/config';
import { createDatabaseAdapter } from './db/index.ts';
import { seedFromDummyJson } from './db/seeder.ts';
import { App } from './ui/App.tsx';

const program = new Command();

program
  .name('mysqllab')
  .description('Interactive Terminal E-Commerce App with MySQL & SQLite support')
  .version('1.0.0')
  .option('-u, --url <string>', 'MySQL connection URL (e.g. mysql://user:password@localhost:3306/mysqllab)')
  .option('-f, --file <string>', 'SQLite local database file path (defaults to data/mysqllab.db)')
  .option('-s, --seed', 'Seed database from DummyJSON before starting')
  .option('--seed-only', 'Seed database from DummyJSON and exit without opening TUI');

program.parse(process.argv);
const options = program.opts();

async function main() {
  try {
    const adapter = await createDatabaseAdapter({
      url: options.url,
      file: options.file
    });

    if (options.seed || options.seedOnly) {
      console.log(`[SEED] Seeding products from DummyJSON into ${adapter.connectionInfo}...`);
      const res = await seedFromDummyJson(adapter, 100, (msg) => console.log(`  › ${msg}`));
      console.log(`[SEED] Completed! Seeded ${res.totalSeeded} items in ${res.durationMs}ms.\n`);

      if (options.seedOnly) {
        await adapter.close();
        process.exit(0);
      }
    }

    const { waitUntilExit } = render(<App db={adapter} />);

    await waitUntilExit();
    await adapter.close();
    process.exit(0);
  } catch (err: any) {
    console.error('Fatal Error:', err.message);
    process.exit(1);
  }
}

main();
