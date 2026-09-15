import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_INFO } from "@/lib/contact-info";
import { copyText } from "@/lib/copy-text";
import { cn } from "@/lib/utils";

interface ContactChannelsProps {
  className?: string;
}

export function ContactChannels({ className }: ContactChannelsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function clearCopyTimerOnUnmount() {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function copyBaleId(baleId: string) {
    const copied = await copyText(baleId);
    if (!copied) return;

    setCopiedId(baleId);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopiedId(null), 1800);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {CONTACT_INFO.baleIds.map((baleId) => {
        const isCopied = copiedId === baleId;

        return (
          <div
            key={baleId}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-background/80 p-3"
          >
            <div className="min-w-0 flex-1 text-start">
              <p className="text-xs text-muted-foreground">آیدی بله</p>
              <p dir="ltr" className="mt-1 truncate text-left font-mono text-sm font-semibold">
                {baleId}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-9 shrink-0", isCopied ? "w-auto gap-1.5 px-2" : "w-9")}
              aria-label={`کپی ${baleId}`}
              title={`کپی ${baleId}`}
              onClick={() => void copyBaleId(baleId)}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs text-primary">کپی شد</span>
                </>
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <span className="sr-only" aria-live="polite">
              {isCopied ? `${baleId} کپی شد` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
