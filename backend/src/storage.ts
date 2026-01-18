import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Filter {
  id: string;
  name: string;
  fromAddresses: string[];
  toAddress: string;
  expirationDays: number | null;
  markRead: boolean;
  addYearLabel: boolean;
  targetFolder: string;
  labels: string[];
  updatedAt: string;
}

const DATA_DIR = '/app/data';

export const VALID_DATABASES = ['karl', 'amy'] as const;
export type Database = (typeof VALID_DATABASES)[number];

function getFiltersFile(database: Database): string {
  return path.join(DATA_DIR, `filters-${database}.json`);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export async function readFilters(database: Database): Promise<Filter[]> {
  const filtersFile = getFiltersFile(database);
  try {
    if (!existsSync(filtersFile)) {
      return [];
    }
    const data = await readFile(filtersFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeFilters(database: Database, filters: Filter[]): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  const filtersFile = getFiltersFile(database);
  await writeFile(filtersFile, JSON.stringify(filters, null, 2));
}
