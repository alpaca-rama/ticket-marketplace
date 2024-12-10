import { Doc } from "./_generated/dataModel";

// TIME CONSTANTS IN MILLISECONDS
export const DURATIONS = {
  TICKET_OFFER: 30 * 60 * 1000, // 30 MINUTES (MINIMUM STRIPE ALLOWS FOR CHECKOUT EXPIRY)
} as const;


// STATUS TYPES FOR BETTER TYPE SAFETY
export const WAITING_LIST_STATUS: Record<string, Doc<'waitingList'>['status']> = {
  WAITING: 'waiting',
  OFFERED: 'offered',
  PURCHASED: 'purchased',
  EXPIRED: 'expired',
} as const;

export const TICKET_STATUS: Record<string, Doc<'tickets'>['status']> = {
  VALID: 'valid',
  USED: 'used',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const;