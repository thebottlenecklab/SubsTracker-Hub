import { PlanComparison, SubscriptionCategory, BillingCycle, ReminderTiming } from "./types";

export const PLAN_COMPARISON: PlanComparison[] = [
  { feature: "Manual subscription entry", free: "Yes (Max 5)", premium: "Unlimited" },
  { feature: "Renewal reminders", free: "1 day before", premium: "Custom Reminders" },
  { feature: "Free trial tracking", free: "Yes", premium: "Yes + End Alerts" },
  { feature: "Monthly and yearly totals", free: "Yes", premium: "Yes" },
  { feature: "Unlimited subscriptions", free: "No (Limit 5)", premium: "Yes" },
  { feature: "CSV/PDF export", free: "No", premium: "Yes" },
  { feature: "Backup & secure cloud restore", free: "No (Local only)", premium: "Yes (Across devices)" },
  { feature: "Multiple device sync", free: "No", premium: "Yes" },
  { feature: "Advanced reminders", free: "No", premium: "Yes" },
  { feature: "Priority email support", free: "No", premium: "Yes" },
];

export interface PresetService {
  name: string;
  amount: number;
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
}

export const PRESET_SERVICES: PresetService[] = [
  // Streaming
  { name: "Netflix", amount: 15.49, category: "Streaming", billingCycle: "monthly" },
  { name: "Spotify Premium", amount: 11.99, category: "Streaming", billingCycle: "monthly" },
  { name: "YouTube Premium", amount: 13.99, category: "Streaming", billingCycle: "monthly" },
  { name: "Disney+", amount: 9.99, category: "Streaming", billingCycle: "monthly" },
  { name: "Apple One", amount: 19.95, category: "Streaming", billingCycle: "monthly" },
  
  // Software / AI
  { name: "ChatGPT Plus", amount: 20.00, category: "Software", billingCycle: "monthly" },
  { name: "GitHub Copilot", amount: 10.00, category: "Software", billingCycle: "monthly" },
  { name: "Adobe Creative Cloud", amount: 54.99, category: "Software", billingCycle: "monthly" },
  { name: "Figma Professional", amount: 15.00, category: "Software", billingCycle: "monthly" },
  { name: "Notion Plus", amount: 10.00, category: "Software", billingCycle: "monthly" },

  // Fitness
  { name: "Planet Fitness", amount: 24.99, category: "Fitness", billingCycle: "monthly" },
  { name: "Peloton App", amount: 12.99, category: "Fitness", billingCycle: "monthly" },
  { name: "ClassPass", amount: 49.00, category: "Fitness", billingCycle: "monthly" },

  // Family & Utilities
  { name: "Amazon Prime", amount: 14.99, category: "Family", billingCycle: "monthly" },
  { name: "Costco Gold Star", amount: 65.00, category: "Family", billingCycle: "yearly" },
  { name: "Google One (100GB)", amount: 1.99, category: "Utility", billingCycle: "monthly" },
  { name: "iCloud+ (200GB)", amount: 2.99, category: "Utility", billingCycle: "monthly" },
  { name: "Nintendo Switch Online", amount: 19.99, category: "Family", billingCycle: "yearly" },
];

export const CATEGORIES: { value: SubscriptionCategory; label: string; color: string; icon: string }[] = [
  { value: "Streaming", label: "Streaming", color: "bg-zinc-100 border-zinc-900 text-zinc-900", icon: "Tv" },
  { value: "Software", label: "Software & AI", color: "bg-zinc-100 border-zinc-900 text-zinc-900", icon: "Cpu" },
  { value: "Fitness", label: "Fitness & Health", color: "bg-zinc-100 border-zinc-900 text-zinc-900", icon: "Activity" },
  { value: "Family", label: "Family & Shopping", color: "bg-zinc-100 border-zinc-900 text-zinc-900", icon: "ShoppingBag" },
  { value: "Utility", label: "Utilities & Cloud", color: "bg-zinc-100 border-zinc-900 text-zinc-900", icon: "Cloud" },
  { value: "Finance", label: "Finance & News", color: "bg-zinc-100 border-zinc-900 text-zinc-900", icon: "CreditCard" },
  { value: "Other", label: "Other", color: "bg-zinc-100 border-zinc-900 text-zinc-900", icon: "Layers" },
];

export const REMINDER_OPTIONS: { value: ReminderTiming; label: string }[] = [
  { value: "none", label: "No reminder" },
  { value: "on_day", label: "On the renewal day" },
  { value: "1_day_before", label: "1 day before" },
  { value: "3_days_before", label: "3 days before" },
  { value: "7_days_before", label: "1 week before" },
];
