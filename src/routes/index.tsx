import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, Users, GraduationCap, BookOpen, Sparkles, ArrowLeft, Check, Clock, Shield, Zap } from 'lucide-react'

const features = [
  { icon: Users, title: 'مدیریت معلمان', description: 'به‌راحتی کادر آموزشی خود را مدیریت کنید، دسترس‌پذیری را پیگیری و دروس را تخصیص دهید.' },
  { icon: GraduationCap, title: 'سازماندهی کلاس‌ها', description: 'کلاس‌ها را بر اساس پایه و بخش سازمان‌دهی کنید و آمار دانش‌آموزان را دنبال کنید.' },
  { icon: BookOpen, title: 'برنامه درسی', description: 'دروس را با ساعت هفتگی تعریف کنید و معلمان را به‌سادگی تخصیص دهید.' },
  { icon: Sparkles, title: 'تولید هوشمند', description: 'به‌صورت خودکار برنامه هفتگی بدون تداخل با الگوریتم‌های هوشمند تولید کنید.' },
  { icon: CalendarDays, title: 'برنامه هفتگی بصری', description: 'نمای بصری برنامه با رنگ‌بندی دروس و قابلیت ویرایش آسان.' },
  { icon: Clock, title: 'بهینه‌سازی زمان', description: 'بازه‌های زمانی را بهینه کنید و توزیع متوازن دروس را تضمین نمایید.' },
]

const benefits = [
  'کاهش ۹۵٪ تداخل‌های برنامه',
  'صرفه‌جویی بیش از ۱۰ ساعت در هفته',
  'بهبود استفاده از ظرفیت معلمان و کلاس‌ها',
  'ویرایش و به‌روزرسانی آسان برنامه',
  'خروجی PDF برای توزیع',
  'شناسایی تداخل در لحظه',
]

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'آموزش‌یار - سامانه هوشمند برنامه درسی' }] }),
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">آموزش‌یار</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth/login"><Button variant="ghost">ورود</Button></Link>
            <Link to="/auth/register"><Button>شروع کنید</Button></Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <div className="container py-24 text-center md:py-32">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>برنامه‌ریزی هوشمند برای مدارس مدرن</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              مدیریت برنامه درسی با <span className="text-primary">آموزش‌یار</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
              برنامه هفتگی بهینه برای معلمان، کلاس‌ها و دروس را به‌صورت خودکار تولید کنید. در وقت صرفه‌جویی کنید، تداخل را حذف کنید و روی آموزش تمرکز کنید.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/auth/register">
                <Button size="lg" className="gap-2">شروع رایگان <ArrowLeft className="h-4 w-4" /></Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline">مشاهده دمو</Button>
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
            <div className="space-y-1"><p className="text-3xl font-bold text-primary">۵۰۰+</p><p className="text-sm text-muted-foreground">مدرسه از آموزش‌یار استفاده می‌کنند</p></div>
            <div className="space-y-1"><p className="text-3xl font-bold text-primary">۱۰,۰۰۰+</p><p className="text-sm text-muted-foreground">برنامه هفتگی تولید شده</p></div>
            <div className="space-y-1"><p className="text-3xl font-bold text-primary">۹۵٪</p><p className="text-sm text-muted-foreground">کاهش تداخل برنامه</p></div>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">همه آنچه برای مدیریت برنامه نیاز دارید</h2>
            <p className="mt-4 text-muted-foreground">ابزارهای جامع طراحی‌شده برای مدیران مدارس جهت ایجاد و مدیریت برنامه‌های کارآمد.</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 bg-card/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">چرا مدارس آموزش‌یار را انتخاب می‌کنند</h2>
              <p className="mt-4 text-muted-foreground">سیستم هوشمند برنامه‌ریزی ما به مدارس کمک می‌کند در وقت و منابع صرفه‌جویی کنند.</p>
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-6"><Zap className="h-8 w-8 text-primary" /><h3 className="mt-4 font-semibold">تولید سریع</h3><p className="mt-2 text-sm text-muted-foreground">برنامه کامل هفتگی را در ثانیه‌ها نه ساعت‌ها تولید کنید.</p></Card>
              <Card className="p-6"><Shield className="h-8 w-8 text-primary" /><h3 className="mt-4 font-semibold">بدون تداخل</h3><p className="mt-2 text-sm text-muted-foreground">شناسایی و رفع خودکار تداخل‌های برنامه.</p></Card>
              <Card className="p-6 sm:col-span-2"><CalendarDays className="h-8 w-8 text-primary" /><h3 className="mt-4 font-semibold">برنامه بصری</h3><p className="mt-2 text-sm text-muted-foreground">برنامه‌های رنگی و زیبا که به‌راحتی قابل مشاهده و به اشتراک‌گذاری هستند.</p></Card>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">آماده ساده‌سازی برنامه‌ریزی هستید؟</h2>
            <p className="mt-4 text-muted-foreground">به صدها مدرسه‌ای بپیوندید که از آموزش‌یار برای صرفه‌جویی در وقت استفاده می‌کنند.</p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/auth/register"><Button size="lg" className="gap-2">شروع رایگان <ArrowLeft className="h-4 w-4" /></Button></Link>
              <Link to="/auth/login"><Button size="lg" variant="outline">ورود به سیستم</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <CalendarDays className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">آموزش‌یار</span>
            </div>
            <p className="text-sm text-muted-foreground">© ۱۴۰۴ آموزش‌یار. تمام حقوق محفوظ است.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
