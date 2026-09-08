import { Link } from "@tanstack/react-router";
import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TimetableEmptyState({
  kind,
}: {
  kind: "no-final" | "no-class" | "no-teacher" | "no-lessons" | "load-error";
}) {
  const content = {
    "no-final": "برنامه هفتگی هنوز آماده نیست.",
    "no-class": "برای مشاهده برنامه، یک کلاس انتخاب کنید.",
    "no-teacher": "برای مشاهده برنامه، یک معلم انتخاب کنید.",
    "no-lessons": "برای مورد انتخاب‌شده هنوز درسی در برنامه قرار نگرفته است.",
    "load-error": "دریافت برنامه هفتگی از سرور با خطا مواجه شد. دوباره تلاش کنید.",
  }[kind];

  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CalendarX2 className="h-6 w-6" />
      </div>
      <p className="mt-4 font-medium">{content}</p>
      {kind === "no-final" && (
        <Button asChild className="mt-5">
          <Link to="/dashboard/generator">رفتن به تولید برنامه</Link>
        </Button>
      )}
    </div>
  );
}
