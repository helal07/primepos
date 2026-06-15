import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "trial_reminder_dismissed";

export function TrialReminderBanner() {
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const t = user.tenant;
    if (!t) return;
    setIsTrial(t.status === "trial");
    if (t.subscription_end) {
      const end = new Date(t.subscription_end + "T23:59:59");
      const d = Math.ceil((end.getTime() - Date.now()) / 86400_000);
      setDaysLeft(d);
    }
  }, [user]);

  useEffect(() => {
    if (daysLeft === null) return;
    // Dismiss key is per-day so it reappears each day
    const key = `${DISMISS_KEY}_${daysLeft}`;
    setDismissed(sessionStorage.getItem(key) === "1");
  }, [daysLeft]);

  if (!isTrial || daysLeft === null || daysLeft > 7 || dismissed) return null;

  const expired = daysLeft <= 0;
  const urgent = daysLeft <= 2;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm border-b ${
        expired || urgent
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/20"
      }`}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        {expired ? (
          <span className="font-medium">Your free trial has ended.</span>
        ) : (
          <span>
            <span className="font-medium">
              {daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
            </span>{" "}
            in your free trial. Upgrade to keep access without interruption.
          </span>
        )}
      </div>
      <Button asChild size="sm" variant={expired || urgent ? "destructive" : "default"} className="h-7">
        <Link to="/subscription">{expired ? "Choose a plan" : "Upgrade now"}</Link>
      </Button>
      {!expired && (
        <button
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem(`${DISMISS_KEY}_${daysLeft}`, "1");
            setDismissed(true);
          }}
          className="p-1 rounded hover:bg-foreground/10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}