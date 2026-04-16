"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import {
  formatPlanAmount,
  getUserPlan,
  PLAN_DETAILS,
  type PlanId,
} from "@/lib/plans";

declare global {
  interface Window {
    Razorpay?: new (options: any) => any;
  }
}

type PremiumUpgradeButtonProps = {
  children?: ReactNode;
  className?: string;
  onSuccess?: () => Promise<void> | void;
  plan?: PlanId;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
};

const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PremiumUpgradeButton({
  children,
  className,
  onSuccess,
  plan = "gold",
  size = "default",
  variant = "default",
}: PremiumUpgradeButtonProps) {
  const { user, login } = useUser();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const selectedPlan = PLAN_DETAILS[plan];
  const currentPlan = getUserPlan(user);
  const isCurrentOrLowerPlan = Boolean(
    user && currentPlan.rank >= selectedPlan.rank
  );

  const handleUpgradeToPremium = async () => {
    if (!user?._id) {
      toast.error("Please sign in first.");
      return;
    }

    if (isCurrentOrLowerPlan) {
      toast.success(`Your ${currentPlan.name} plan is already active.`);
      return;
    }

    setIsUpgrading(true);

    try {
      const isScriptLoaded = await loadRazorpayScript();

      if (!isScriptLoaded) {
        toast.error("Unable to load Razorpay checkout.");
        setIsUpgrading(false);
        return;
      }

      const orderResponse = await axiosInstance.post("/premium/create-order", {
        userId: user._id,
        plan,
      });

      if (orderResponse.data?.alreadyPremium) {
        login(orderResponse.data.user);
        toast.success(
          orderResponse.data?.alreadyOnPlan
            ? `Your ${orderResponse.data?.plan?.name || currentPlan.name} plan is already active.`
            : "Your plan is already active."
        );
        await onSuccess?.();
        setIsUpgrading(false);
        return;
      }

      const order = orderResponse.data?.order;
      const keyId =
        orderResponse.data?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!order?.id || !keyId || !window.Razorpay) {
        toast.error("Unable to initialize payment.");
        setIsUpgrading(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "YourTube Plans",
        description: `${selectedPlan.name} plan - ${formatPlanAmount(
          selectedPlan.amount
        )}`,
        order_id: order.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        notes: {
          userId: user._id,
        },
        handler: async (paymentResponse: any) => {
          try {
            const verifyResponse = await axiosInstance.post("/premium/verify", {
              userId: user._id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            if (verifyResponse.data?.success) {
              login(verifyResponse.data.user);
              toast.success(`${verifyResponse.data.plan?.name || selectedPlan.name} plan activated.`);
              if (verifyResponse.data?.emailSent === false) {
                toast.info("Plan is active. Invoice email is pending SMTP setup.");
              }
              await onSuccess?.();
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (error: any) {
            console.error(error);
            toast.error(
              error?.response?.data?.message ||
                "Unable to verify premium payment."
            );
          } finally {
            setIsUpgrading(false);
          }
        },
        modal: {
          ondismiss: () => setIsUpgrading(false),
        },
        theme: {
          color: "#dc2626",
        },
      });

      razorpay.on("payment.failed", (paymentError: any) => {
        toast.error(
          paymentError?.error?.description ||
            "Payment failed. Please try again."
        );
        setIsUpgrading(false);
      });

      razorpay.open();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Unable to start payment.");
      setIsUpgrading(false);
    }
  };

  return (
    <Button
      className={className}
      disabled={isUpgrading || isCurrentOrLowerPlan}
      onClick={handleUpgradeToPremium}
      size={size}
      variant={variant}
    >
      <Crown className="w-4 h-4" />
      {isCurrentOrLowerPlan
        ? `${currentPlan.name} active`
        : isUpgrading
        ? "Processing..."
        : children || `Choose ${selectedPlan.name}`}
    </Button>
  );
}
