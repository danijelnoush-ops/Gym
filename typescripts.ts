export interface Client {
  id: string;
  name: string;
  surname: string;
  phone: string;
  birthYear: number;
  email: string;
  package: 'promo' | 'basic' | 'premium';
  packagePaid: boolean;
  totalSessions: number;
  remainingSessions: number;
  membershipStartDate: Date;
  membershipEndDate: Date;
  createdAt: Date;
  lastEmailSent?: Date;
}

export interface TrainingSession {
  id: string;
  clientId: string;
  clientName: string;
  clientSurname: string;
  clientEmail: string;
  date: string;
  time: string;
  createdAt: Date;
}

export interface Package {
  id: 'promo' | 'basic' | 'premium';
  name: string;
  price: number;
  sessions: number;
  durationDays: number;
}

export interface ArchiveRecord {
  id: string;
  type: 'client' | 'session';
  data: any;
  archivedAt: Date;
  originalDate: Date;
}

export interface RevenueStats {
  daily: number;
  monthly: number;
  yearly: number;
  byMonth: { [key: string]: number };
  byYear: { [key: string]: number };
}

export interface OccupancyStats {
  daily: number;
  monthly: number;
  dailyCapacity: number;
  monthlyCapacity: number;
  weeklyByDay: { [key: string]: number };
}

export interface EmailLog {
  id: string;
  clientId: string;
  clientEmail: string;
  sentAt: Date;
  type: 'membership_expiry';
  membershipEndDate: Date;
}