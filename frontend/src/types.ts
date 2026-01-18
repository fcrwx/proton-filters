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
  updatedAt: Date;
}
