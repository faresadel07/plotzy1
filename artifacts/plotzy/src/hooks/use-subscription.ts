import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";

export interface SubscriptionStatus {
  subscriptionStatus: "free_trial" | "active" | "canceled" | "expired";
  subscriptionPlan: "monthly" | "yearly" | null;
  subscriptionEndDate: string | null;
  chapterCount: number;
  chapterLimit: number;
  wordLimit: number;
  isActive: boolean;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const isSubscribed = data?.isActive === true;
  const isFreeTrialExhausted = !isSubscribed && (data?.chapterCount ?? 0) >= (data?.chapterLimit ?? 1);
  const chapterCount = data?.chapterCount ?? 0;
  const chapterLimit = data?.chapterLimit ?? 1;
  const wordLimit = data?.wordLimit ?? 3750;

  return {
    status: data,
    isLoading,
    isSubscribed,
    isFreeTrialExhausted,
    chapterCount,
    chapterLimit,
    wordLimit,
    refetch,
  };
}

export async function createCheckoutSession(plan: "monthly" | "yearly"): Promise<string | null> {
  const res = await fetch("/api/subscription/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.url;
}
