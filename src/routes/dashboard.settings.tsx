import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, User, Lock, Palette, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/settings')({
  head: () => ({ meta: [{ title: 'تنظیمات - آموزش‌یار' }, { name: 'description', content: 'مدیریت تنظیمات مدرسه و حساب کاربری' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)

  const [schoolInfo, setSchoolInfo] = useState({
    name: 'آموزش‌یار',
    address: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
    phone: '۰۲۱-۱۲۳۴۵۶۷',
    email: 'admin@school.edu',
    website: 'www.amuzeshyar.ir',
  })

  const [profile, setProfile] = useState({
    name: 'مدیر سیستم',
    email: 'admin@school.edu',
    role: 'مدیر',
  })

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    scheduleConflicts: true,
    newTeachers: false,
    weeklyReports: true,
  })

  const handleSave = async (section: string) => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
    toast.success(`${section} با موفقیت ذخیره شد`)
  }

  return (
    <div className="flex flex-col">
      <Header title="تنظیمات" description="مدیریت تنظیمات مدرسه و حساب کاربری" />
      <div className="p-6">
        <Tabs defaultValue="school" dir="rtl" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="school" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">مدرسه</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">پروفایل</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">امنیت</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">ترجیحات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="school" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات مدرسه</CardTitle>
                <CardDescription>اطلاعات پایه مدرسه خود را مدیریت کنید</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">نام مدرسه</Label>
                  <Input
                    id="schoolName"
                    value={schoolInfo.name}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">آدرس</Label>
                  <Input
                    id="address"
                    value={schoolInfo.address}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">شماره تماس</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={schoolInfo.phone}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">ایمیل</Label>
                    <Input
                      id="email"
                      type="email"
                      value={schoolInfo.email}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">وب‌سایت</Label>
                  <Input
                    id="website"
                    type="url"
                    value={schoolInfo.website}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, website: e.target.value })}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSave('اطلاعات مدرسه')} disabled={isLoading}>
                    {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
                    ذخیره تغییرات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تنظیمات پروفایل</CardTitle>
                <CardDescription>اطلاعات شخصی خود را مدیریت کنید</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">تغییر تصویر</Button>
                    <p className="mt-2 text-xs text-muted-foreground">فرمت JPG، PNG یا GIF. حداکثر ۲ مگابایت.</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileName">نام و نام خانوادگی</Label>
                    <Input
                      id="profileName"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileEmail">ایمیل</Label>
                    <Input
                      id="profileEmail"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">نقش</Label>
                    <Input id="role" value={profile.role} disabled />
                    <p className="text-xs text-muted-foreground">برای تغییر نقش با مدیر سیستم تماس بگیرید.</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSave('پروفایل')} disabled={isLoading}>
                    {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
                    ذخیره تغییرات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تغییر رمز عبور</CardTitle>
                <CardDescription>رمز عبور خود را به‌روز کنید تا امنیت حساب شما حفظ شود</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">رمز عبور جدید</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأیید رمز عبور جدید</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSave('رمز عبور')} disabled={isLoading}>
                    {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
                    به‌روزرسانی رمز عبور
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>جلسات فعال</CardTitle>
                <CardDescription>دستگاه‌هایی که در حال حاضر به حساب شما وارد شده‌اند</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { device: 'مرورگر کروم - ویندوز', location: 'تهران، ایران', current: true },
                    { device: 'مرورگر سافاری - آیفون', location: 'تهران، ایران', current: false },
                  ].map((session, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{session.device}</p>
                        <p className="text-xs text-muted-foreground">{session.location}</p>
                      </div>
                      {session.current ? (
                        <span className="text-xs text-green-600 font-medium">جلسه فعلی</span>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          خروج
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>اعلان‌ها</CardTitle>
                <CardDescription>مدیریت تنظیمات اعلان‌ها</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: 'emailAlerts' as const, label: 'اعلان‌های ایمیلی', description: 'دریافت هشدارهای مهم از طریق ایمیل' },
                  { key: 'scheduleConflicts' as const, label: 'تداخل‌های برنامه', description: 'اطلاع‌رسانی در صورت تداخل در برنامه‌ریزی' },
                  { key: 'newTeachers' as const, label: 'معلمان جدید', description: 'اطلاع‌رسانی هنگام افزودن معلم جدید' },
                  { key: 'weeklyReports' as const, label: 'گزارش هفتگی', description: 'دریافت خلاصه فعالیت‌های هفتگی' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, [item.key]: checked })
                      }
                    />
                  </div>
                ))}
                <Separator />
                <div className="flex justify-end">
                  <Button onClick={() => handleSave('تنظیمات اعلان')} disabled={isLoading}>
                    {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Check className="me-2 h-4 w-4" />}
                    ذخیره تغییرات
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ظاهر</CardTitle>
                <CardDescription>شخصی‌سازی نمای برنامه</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>زبان سیستم</Label>
                  <p className="text-sm text-muted-foreground">فارسی</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>جهت متن</Label>
                  <p className="text-sm text-muted-foreground">راست به چپ (RTL)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
