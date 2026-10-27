import type { DatabaseAdapter } from '../types/index.ts';
import { MySQLAdapter } from './mysql.ts';
import { SQLiteAdapter } from './sqlite.ts';

export interface DatabaseOptions {
  url?: string;
  file?: string;
}

export async function createDatabaseAdapter(options: DatabaseOptions = {}): Promise<DatabaseAdapter> {
  const url = options.url || process.env.DATABASE_URL;

  if (url && (url.startsWith('mysql://') || url.startsWith('mysql2://'))) {
    const adapter = new MySQLAdapter(url);
    await adapter.init();
    return adapter;
  }

  // Fallback to SQLite
  const dbFile = options.file || process.env.SQLITE_PATH || 'data/mysqllab.db';
  const adapter = new SQLiteAdapter(dbFile);
  await adapter.init();
  return adapter;
}
