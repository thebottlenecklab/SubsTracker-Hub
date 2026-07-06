export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";

export type SubscriptionCategory = "Streaming" | "Software" | "Fitness" | "Family" | "Utility" | "Finance" | "Other";

export type ReminderTiming = "none" | "on_day" | "1_day_before" | "3_days_before" | "7_days_before";

export interface Subscription {
  id: string;
  userId: string; // "local" for anonymous offline mode
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextChargeDate: string; // YYYY-MM-DD
  isFreeTrial: boolean;
  freeTrialEndDate?: string; // YYYY-MM-DD
  reminderTiming: ReminderTiming;
  category: SubscriptionCategory;
  notes?: string;
  status: "active" | "paused" | "canceled";
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  isPremium: boolean;
  onboarded: boolean;
  createdAt: string;
  selectedCategories?: string[];
  currency?: string;
  theme?: string;
}

export interface PlanComparison {
  feature: string;
  free: boolean | string;
  premium: boolean | string;
}

export interface ReminderNotification {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  dueDate: string;
  amount: number;
  message: string;
  read: boolean;
  timestamp: string;
}
