import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MessageCircle } from "lucide-react";
import { ContactChannels } from "@/components/contact-channels";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withAppName } from "@/lib/branding";
import { CONTACT_INFO } from "@/lib/contact-info";

export const Route = createFileRoute("/dashboard/contact")({
  head: () => ({ meta: [{ title: withAppName("ارتباط با ما") }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      <Header
        title="ارتباط با ما"
        description="برای دریافت راهنمایی یا ارتباط با تیم چیدمان، می‌توانید از راه‌های زیر با ما در تماس باشید."
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <Card className="overflow-hidden shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <CardTitle>بله</CardTitle>
                  <CardDescription>
                    برای راهنمایی، یکی از شناسه‌های زیر را کپی کنید یا پیام بفرستید.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ContactChannels />
              <div className="flex justify-end border-t border-border/70 pt-5">
                <Button asChild className="h-11 w-full gap-2 sm:w-auto">
                  <a
                    href={CONTACT_INFO.primaryBaleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`پیام در بله به ${CONTACT_INFO.primaryBaleId} (باز شدن در زبانه جدید)`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    پیام در بله
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
