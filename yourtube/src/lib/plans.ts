export type PlanId = "free" | "bronze" | "silver" | "gold";

export const PLAN_DETAILS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    amount: number;
    watchLimitMinutes: number | null;
    rank: number;
  }
> = {
  free: {
    id: "free",
    name: "Free",
    amount: 0,
    watchLimitMinutes: 5,
    rank: 0,
  },
  bronze: {
    id: "bronze",
    name: "Bronze",
    amount: 10,
    watchLimitMinutes: 7,
    rank: 1,
  },
  silver: {
    id: "silver",
    name: "Silver",
    amount: 50,
    watchLimitMinutes: 10,
    rank: 2,
  },
  gold: {
    id: "gold",
    name: "Gold",
    amount: 100,
    watchLimitMinutes: null,
    rank: 3,
  },
};

export const PAID_PLAN_IDS: PlanId[] = ["bronze", "silver", "gold"];

export const getUserPlanId = (user: any): PlanId => {
  if (user?.isPremium && (!user?.plan || user.plan === "free")) {
    return "gold";
  }

  if (user?.plan && PLAN_DETAILS[user.plan as PlanId]) {
    return user.plan as PlanId;
  }

  return "free";
};

export const getUserPlan = (user: any) => PLAN_DETAILS[getUserPlanId(user)];

export const formatPlanAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
