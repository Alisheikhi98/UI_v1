import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONTACT_INFO } from "@/lib/contact-info";
import { copyText } from "@/lib/copy-text";
import { PAYMENT_DETAILS } from "@/lib/payment-details";
import type { PaidPlanDefinition } from "@/lib/plans";

type CopyablePaymentField = "cardNumber" | "iban";

interface PaymentDialogProps {
  plan: PaidPlanDefinition | null;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDialog({ plan, onOpenChange }: PaymentDialogProps) {
  const [copiedField, setCopiedField] = useState<CopyablePaymentField | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function clearCopyTimerOnUnmount() {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function copyPaymentField(field: CopyablePaymentField) {
    const copied = await copyText(PAYMENT_DETAILS[field]);
    if (!copied) return;

    setCopiedField(field);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopiedField(null), 1800);
  }

  function handleOpenChange(open: boolean) {
    if (!open) setCopiedField(null);
    onOpenChange(open);
  }

  return (
    <Dialog open={Boolean(plan)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
            اطلاعات پرداخت
          </DialogTitle>
          {plan ? (
            <DialogDescription>
              {plan.title} به مبلغ {plan.price} تومان
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-3">
          <PaymentDetail
            label="شماره کارت بلو بانک:"
            value={PAYMENT_DETAILS.cardNumber}
            copied={copiedField === "cardNumber"}
            onCopy={() => void copyPaymentField("cardNumber")}
          />
          <PaymentDetail
            label="شماره شبا:"
            value={PAYMENT_DETAILS.iban}
            copied={copiedField === "iban"}
            onCopy={() => void copyPaymentField("iban")}
          />
          <div className="rounded-xl border bg-muted/25 p-3.5 sm:p-4">
            <p className="text-xs text-muted-foreground">به نام:</p>
            <p className="mt-1 font-semibold">{PAYMENT_DETAILS.accountHolder}</p>
          </div>
        </div>

        <p className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-sm leading-7">
          پس از واریز وجه، تصویر رسید پرداخت را از طریق پیام‌رسان بله برای پشتیبانی ارسال کنید.
        </p>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="self-start sm:self-auto">
              بستن
            </Button>
          </DialogClose>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex min-h-10 min-w-0 items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 text-sm sm:justify-start">
              <span className="shrink-0 text-muted-foreground">آیدی بله</span>
              <span dir="ltr" className="truncate text-left font-mono font-semibold">
                {CONTACT_INFO.primaryBaleId}
              </span>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <a
                href={CONTACT_INFO.primaryBaleUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`ارسال رسید در بله به ${CONTACT_INFO.primaryBaleId} (باز شدن در زبانه جدید)`}
              >
                ارسال رسید در بله
                <ExternalLink className="ms-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDetail({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-muted/25 p-3.5 sm:gap-3 sm:p-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          dir="ltr"
          className="mt-1 break-all text-left font-mono text-sm font-semibold tracking-wide sm:text-base"
        >
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 shrink-0 gap-1.5 px-2.5"
        aria-label={`کپی ${label}`}
        onClick={onCopy}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-xs text-primary">کپی شد</span>
          </>
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} کپی شد` : ""}
      </span>
    </div>
  );
}
