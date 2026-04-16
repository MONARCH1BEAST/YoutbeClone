import PremiumUpgradeButton from "@/components/PremiumUpgradeButton";
import { useUser } from "@/lib/AuthContext";
import {
  formatPlanAmount,
  getUserPlan,
  PAID_PLAN_IDS,
  PLAN_DETAILS,
} from "@/lib/plans";
import { Check, Crown, Download, Timer } from "lucide-react";

export default function PremiumPage() {
  const { user } = useUser();
  const currentPlan = getUserPlan(user);

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-red-600">
            <Crown className="w-4 h-4" />
            Plans
          </div>
          <h1 className="text-3xl font-bold mt-2">Choose your watch limit</h1>
          <p className="text-gray-600 mt-2">
            Free includes 5 minutes. Bronze, Silver, and Gold unlock longer
            viewing with Razorpay test payments and an invoice email.
          </p>
        </div>

        <div className="border rounded-lg p-6 space-y-5 bg-gray-50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Current plan: {currentPlan.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentPlan.watchLimitMinutes === null
                  ? "Unlimited video watching is active."
                  : `${currentPlan.watchLimitMinutes} minutes of video watching is active.`}
              </p>
            </div>
            <PremiumUpgradeButton plan="gold" size="lg">
              Upgrade to Gold
            </PremiumUpgradeButton>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 mt-0.5 text-red-600" />
              Paid plans keep the download benefits active
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Download className="w-4 h-4 mt-0.5 text-red-600" />
              Invoice email is triggered after verified payment
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="border rounded-lg p-5 bg-white space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{PLAN_DETAILS.free.name}</h2>
              <p className="text-2xl font-bold mt-2">Free</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Timer className="w-4 h-4" />
              {PLAN_DETAILS.free.watchLimitMinutes} minutes
            </div>
            <p className="text-sm text-gray-600">Default access for every user.</p>
          </div>

          {PAID_PLAN_IDS.map((planId) => {
            const plan = PLAN_DETAILS[planId];
            const watchLimit =
              plan.watchLimitMinutes === null
                ? "Unlimited watching"
                : `${plan.watchLimitMinutes} minutes`;

            return (
              <div key={plan.id} className="border rounded-lg p-5 bg-white space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="text-2xl font-bold mt-2">
                    {formatPlanAmount(plan.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Timer className="w-4 h-4" />
                  {watchLimit}
                </div>
                <PremiumUpgradeButton plan={plan.id} className="w-full">
                  Choose {plan.name}
                </PremiumUpgradeButton>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
