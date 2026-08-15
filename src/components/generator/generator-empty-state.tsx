import { AlertCircle, RefreshCcw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function GeneratorEmptyState({
  kind,
  onRetry,
  message,
}: {
  kind: "no-data" | "failed" | "no-feasible";
  onRetry?: () => void;
  message?: string;
}) {
  const content = {
    "no-data": {
      icon: AlertCircle,
      title: "اطلاعات کافی برای زمان‌بندی وجود ندارد.",
      description: "ابتدا اطلاعات مدرسه، کلاس‌ها و معلمان را تکمیل کنید.",
      action: "بررسی اطلاعات",
    },
    failed: {
      icon: AlertCircle,
      title: "تولید برنامه با خطا مواجه شد.",
      description: "دوباره تلاش کنید یا اطلاعات ورودی را بررسی کنید.",
      action: "تلاش دوباره",
    },
    "no-feasible": {
      icon: SearchX,
      title: "با تنظیمات فعلی برنامه قابل اجرا پیدا نشد.",
      description: "محدودیت‌ها و اطلاعات کلاس‌ها و معلمان را بررسی کنید.",
      action: "بررسی محدودیت‌ها",
    },
  }[kind];
  const Icon = content.icon;

  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{content.title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {message ?? content.description}
        </p>
        {onRetry && (
          <Button variant="outline" className="mt-5" onClick={onRetry}>
            <RefreshCcw className="me-2 h-4 w-4" />
            {content.action}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
