import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function GenerationProgress() {
  return (
    <section aria-live="polite" aria-label="پیشرفت تولید برنامه">
      <Card className="overflow-hidden border-primary/25">
        <CardContent className="flex items-center gap-4 p-6 md:p-8">
          <div className="flex flex-col justify-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold">در حال تولید برنامه...</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              موتور زمان‌بندی در حال بررسی محدودیت‌ها و ساخت برنامه است. تا پایان درخواست منتظر
              بمانید.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
