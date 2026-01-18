import { Filter } from '../types';

export type Database = string;

export async function fetchUsers(): Promise<string[]> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  const data = await response.json();
  return data.users;
}

export interface CreateFilterData {
  name: string;
  fromAddresses: string[];
  toAddress: string;
  expirationDays: number | null;
  markRead: boolean;
  addYearLabel: boolean;
  targetFolder: string;
  labels: string[];
}

export async function fetchFilters(db: Database): Promise<Filter[]> {
  const response = await fetch(`/api/filters?db=${db}`);
  if (!response.ok) {
    throw new Error('Failed to fetch filters');
  }
  const data = await response.json();
  return data.map((filter: Filter & { updatedAt: string }) => ({
    ...filter,
    updatedAt: new Date(filter.updatedAt),
  }));
}

export async function createFilter(db: Database, data: CreateFilterData): Promise<Filter> {
  const response = await fetch(`/api/filters?db=${db}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create filter');
  }
  const filter = await response.json();
  return {
    ...filter,
    updatedAt: new Date(filter.updatedAt),
  };
}

export async function fetchFilter(db: Database, id: string): Promise<Filter> {
  const response = await fetch(`/api/filters/${id}?db=${db}`);
  if (!response.ok) {
    throw new Error('Failed to fetch filter');
  }
  const filter = await response.json();
  return {
    ...filter,
    updatedAt: new Date(filter.updatedAt),
  };
}

export async function updateFilter(db: Database, id: string, data: CreateFilterData): Promise<Filter> {
  const response = await fetch(`/api/filters/${id}?db=${db}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update filter');
  }
  const filter = await response.json();
  return {
    ...filter,
    updatedAt: new Date(filter.updatedAt),
  };
}

export async function deleteFilters(db: Database, ids: string[]): Promise<{ deleted: number }> {
  const response = await fetch(`/api/filters?db=${db}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete filters');
  }
  return response.json();
}
