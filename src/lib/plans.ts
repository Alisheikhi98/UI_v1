export type PlanId = "trial" | "professional" | "advanced" | "enterprise";

export interface PlanDefinition {
  id: PlanId;
  title: string;
  description: string;
  features: readonly string[];
  price?: string;
  badge?: string;
  note?: string;
  landingCta: string;
  landingDestination: "register" | "contact";
  cardClass: string;
  accentClass: string;
  checkClass: string;
}

export const PLAN_CATALOG: readonly PlanDefinition[] = [
  {
    id: "trial",
    title: "پلن آزمایشی پایه",
    description: "برای شروع و آشنایی با امکانات سامانه",
    features: [
      "۵ روز اعتبار",
      "تا ۶۰ دبیر فعال",
      "تا ۲۰ کلاس فعال",
      "حداکثر ۲۰ بار ساخت برنامه در کل دوره",
      "حداکثر ۴ بار ساخت برنامه در روز برای هر کاربر",
      "خروجی اکسل با واترمارک",
    ],
    note: "ظرفیت دبیر و کلاس این پلن برای ارزیابی کامل سامانه بازتر است، اما دوره فقط ۵ روز و حداکثر ۲۰ بار ساخت برنامه فعال است.",
    landingCta: "شروع دوره آزمایشی",
    landingDestination: "register",
    cardClass:
      "border-sky-200/80 bg-sky-50/35 hover:border-sky-300 dark:border-sky-900/70 dark:bg-sky-950/15 dark:hover:border-sky-800",
    accentClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    checkClass: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "professional",
    title: "پلن حرفه‌ای",
    description: "مناسب مدارس کوچک و استفاده روزمره",
    price: "۱٬۵۰۰٬۰۰۰",
    features: [
      "اعتبار یک‌ساله",
      "تا ۳۰ دبیر فعال",
      "تا ۱۰ کلاس فعال",
      "بدون محدودیت در تعداد کل ساخت برنامه",
      "حداکثر ۲۰ بار ساخت برنامه در روز برای هر کاربر",
      "خروجی اکسل بدون واترمارک",
    ],
    landingCta: "انتخاب پلن حرفه‌ای",
    landingDestination: "contact",
    cardClass:
      "border-emerald-200/80 bg-emerald-50/30 hover:border-emerald-300 dark:border-emerald-900/70 dark:bg-emerald-950/15 dark:hover:border-emerald-800",
    accentClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    checkClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "advanced",
    title: "پلن پیشرفته",
    description: "مناسب مدارس متوسط و مجموعه‌های آموزشی بزرگ‌تر",
    badge: "پیشنهاد ویژه",
    price: "۲٬۵۰۰٬۰۰۰",
    features: [
      "اعتبار یک‌ساله",
      "تا ۶۰ دبیر فعال",
      "تا ۲۵ کلاس فعال",
      "بدون محدودیت در تعداد کل ساخت برنامه",
      "حداکثر ۵۰ بار ساخت برنامه در روز برای هر کاربر",
      "خروجی اکسل بدون واترمارک",
    ],
    landingCta: "انتخاب پلن پیشرفته",
    landingDestination: "contact",
    cardClass:
      "border-indigo-400/80 bg-indigo-50/45 shadow-lg shadow-indigo-500/10 hover:border-indigo-500 dark:border-indigo-700/80 dark:bg-indigo-950/20 dark:hover:border-indigo-600",
    accentClass: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    checkClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "enterprise",
    title: "پلن سازمانی",
    description: "راهکاری منعطف برای مدارس و مجموعه‌های بزرگ",
    features: [
      "اعتبار یک‌ساله",
      "ظرفیت دبیران متناسب با نیاز مجموعه",
      "ظرفیت کلاس‌ها متناسب با نیاز مجموعه",
      "بدون محدودیت در تعداد کل ساخت برنامه",
      "سقف روزانه ساخت برنامه به‌صورت اختصاصی",
      "خروجی اکسل بدون واترمارک",
      "تنظیم محدودیت‌ها براساس نیاز مدرسه",
    ],
    landingCta: "تماس برای مشاوره",
    landingDestination: "contact",
    cardClass:
      "border-amber-200/90 bg-amber-50/35 hover:border-amber-300 dark:border-amber-900/70 dark:bg-amber-950/15 dark:hover:border-amber-800",
    accentClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    checkClass: "text-amber-600 dark:text-amber-400",
  },
] as const;

export const UPGRADE_PLANS = PLAN_CATALOG.filter((plan) => plan.id !== "trial");
