import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockTeachers, mockClasses, mockSubjects, mockActivities, mockAlerts } from '@/lib/data'
import { Users, GraduationCap, BookOpen, CalendarDays, ArrowLeft, AlertTriangle, CheckCircle, Info, TrendingUp, Sparkles } from 'lucide-react'

const stats = [
  { name: 'مجموع معلمان', value: mockTeachers.length, change: '+۲ این ماه', icon: Users, href: '/dashboard/teachers' },
  { name: 'مجموع کلاس‌ها', value: mockClasses.length, change: 'همه فعال', icon: GraduationCap, href: '/dashboard/classes' },
  { name: 'مجموع دروس', value: mockSubjects.length, change: '۲۴ ساعت/هفته', icon: BookOpen, href: '/dashboard/subjects' },
  { name: 'برنامه‌های تولید شده', value: 12, change: '+۳ این هفته', icon: CalendarDays, href: '/dashboard/timetable' },
]

const quickActions = [
  { name: 'تولید برنامه جدید', icon: Sparkles, href: '/dashboard/generator', variant: 'default' as const },
  { name: 'افزودن معلم', icon: Users, href: '/dashboard/teachers', variant: 'outline' as const },
  { name: 'مشاهده برنامه هفتگی', icon: CalendarDays, href: '/dashboard/timetable', variant: 'outline' as const },
]

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 60) return `${minutes} دقیقه پیش`
  if (hours < 24) return `${hours} ساعت پیش`
  return `${days} روز پیش`
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
    default: return <Info className="h-4 w-4 text-blue-600" />
  }
}

export const Route = createFileRoute('/dashboard/')({
  head: () => ({ meta: [{ title: 'داشبورد - آموزش‌یار' }] }),
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="flex flex-col">
      <Header title="داشبورد" description="خوش آمدید! مروری بر سیستم برنامه‌ریزی مدرسه شما." />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.name} to={stat.href}>
              <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />{stat.change}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>دسترسی سریع</CardTitle>
              <CardDescription>کارهای رایج و میانبرها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Link key={action.name} to={action.href}>
                  <Button variant={action.variant} className="w-full justify-start gap-2">
                    <action.icon className="h-4 w-4" />{action.name}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>هشدارهای برنامه</CardTitle>
              <CardDescription>اعلان‌ها و یادآوری‌های مهم</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
                    {getAlertIcon(alert.type)}
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>فعالیت‌های اخیر</CardTitle>
            <CardDescription>آخرین تغییرات سیستم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(activity.timestamp)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
