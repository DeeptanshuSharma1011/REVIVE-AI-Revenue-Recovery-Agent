/**
 * @license
 * REVIVE — Synthetic Data Generator
 * Deterministic PRNG and Realistic Financial Distributions
 */

export class DeterministicPRNG {
  private s: number;

  constructor(seed = 42) {
    this.s = Math.floor(seed) % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }

  // Returns float in [0, 1)
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    const idx = Math.floor(this.next() * arr.length);
    return arr[idx];
  }

  weightedChoice<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      if (r < weights[i]) return items[i];
      r -= weights[i];
    }
    return items[items.length - 1];
  }

  uuid(prefix = ''): string {
    // Deterministic UUID-like format
    const hex = () => Math.floor(this.next() * 16).toString(16);
    const seg = (len: number) => Array.from({ length: len }, hex).join('');
    const raw = `${seg(8)}-${seg(4)}-4${seg(3)}-a${seg(3)}-${seg(12)}`;
    return prefix ? `${prefix}-${raw}` : raw;
  }
}

// Indian & Global realistic names for merchant context
export const FIRST_NAMES = [
  'Rahul', 'Priya', 'Amit', 'Neha', 'Vikram', 'Ananya', 'Rohan', 'Sneha', 'Rajesh', 'Pooja',
  'Aditya', 'Divya', 'Suresh', 'Kavita', 'Manish', 'Ritu', 'Sanjay', 'Meera', 'Kunal', 'Swati',
  'Arjun', 'Simran', 'Karthik', 'Deepa', 'Nikhil', 'Tanvi', 'Abhishek', 'Aarti', 'Gaurav', 'Shreya'
];

export const LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Gupta', 'Malhotra', 'Mehta', 'Singh', 'Reddy', 'Chopra', 'Joshi',
  'Nair', 'Bhatia', 'Iyer', 'Deshmukh', 'Saxena', 'Kapoor', 'Menon', 'Rao', 'Bose', 'Chatterjee'
];

export const COMPANY_NAMES = [
  'Apex Global Technologies', 'Zephyr Logistics Pvt Ltd', 'Nexus Media Labs', 'Starlight Retail',
  'Hyperion Cloud Systems', 'Zenith Financial Solutions', 'BluePeak Ventures', 'Vanguard Analytics',
  'Aura Health Tech', 'Crestline Innovations', 'Pinnacle ERP Solutions', 'Falcon Mobility'
];

export const SUBSCRIPTION_PLANS = [
  { name: 'Starter Pro', amount: 999, cycle: 'MONTHLY' as const },
  { name: 'Growth Suite', amount: 2499, cycle: 'MONTHLY' as const },
  { name: 'Business Plus', amount: 4999, cycle: 'MONTHLY' as const },
  { name: 'Enterprise Cloud', amount: 14999, cycle: 'MONTHLY' as const },
  { name: 'Annual Growth Plan', amount: 24999, cycle: 'ANNUAL' as const },
  { name: 'Enterprise Premium Annual', amount: 89999, cycle: 'ANNUAL' as const },
];
