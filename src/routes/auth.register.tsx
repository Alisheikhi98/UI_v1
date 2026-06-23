import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CalendarDays, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export const Route = createFileRoute('/auth/register')({
  head: () => ({ meta: [{ title: 'ثبت‌نام - آموزش‌یار' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    personnel_code: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Register failed')
      }

      toast.success('ثبت‌نام با موفقیت انجام شد', {
        description: 'اکنون می‌توانید وارد حساب کاربری خود شوید.',
      })

      navigate({ to: '/auth/login' })
    } catch (error: any) {
      toast.error('ثبت‌نام ناموفق بود', {
        description: error.message || 'خطایی رخ داده است',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const passwordRequirements = [
    {
      text: 'حداقل ۸ کاراکتر',
      met: formData.password.length >= 8,
    },
    {
      text: 'شامل عدد باشد',
      met: /\d/.test(formData.password),
    },
    {
      text: 'شامل حرف بزرگ باشد',
      met: /[A-Z]/.test(formData.password),
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <CalendarDays className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">ایجاد حساب کاربری</CardTitle>
          <CardDescription>
            برای شروع، اطلاعات خود را وارد کنید
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="full_name">نام و نام خانوادگی</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="علی رضایی"
                value={formData.full_name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ali@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">شماره تلفن</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="09123456789"
                value={formData.phone}
                onChange={handleChange}
                required
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personnel_code">کد پرسنلی</Label>
              <Input
                id="personnel_code"
                name="personnel_code"
                type="text"
                placeholder="ABC1234"
                value={formData.personnel_code}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="رمز عبور خود را وارد کنید"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {passwordRequirements.map((req, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-2 gap-2 text-sm ${
                    req.met ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <Check className={`h-4 w-4 ${req.met ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span>{req.text}</span>
                </div>
              ))}
            </div>

          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ثبت‌نام...
                </>
              ) : (
                'ثبت‌نام'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              قبلاً حساب ساخته‌اید؟{' '}
              <Link to="/auth/login" className="text-primary hover:underline">
                ورود
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}