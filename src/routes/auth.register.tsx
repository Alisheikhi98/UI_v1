import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CalendarDays, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const passwordRequirements = [
  { text: 'حداقل ۸ کاراکتر', check: (p: string) => p.length >= 8 },
  { text: 'شامل عدد', check: (p: string) => /\d/.test(p) },
  { text: 'شامل حرف بزرگ', check: (p: string) => /[A-Z]/.test(p) },
]

export const Route = createFileRoute('/auth/register')({
  head: () => ({ meta: [{ title: 'ثبت‌نام - آموزش‌یار' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', schoolName: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    toast.success('حساب کاربری ساخته شد!', { description: 'به آموزش‌یار خوش آمدید. لطفاً ایمیل خود را تأیید کنید.' })
    navigate({ to: '/dashboard' })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

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
          <CardDescription>همین امروز با آموزش‌یار شروع کنید</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام و نام خانوادگی</Label>
              <Input id="name" name="name" placeholder="علی رضایی" value={formData.name} onChange={handleChange} required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input id="email" name="email" type="email" placeholder="admin@school.edu" value={formData.email} onChange={handleChange} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolName">نام مدرسه</Label>
              <Input id="schoolName" name="schoolName" placeholder="دبیرستان شهید رجایی" value={formData.schoolName} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="یک رمز عبور بسازید" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
                <Button type="button" variant="ghost" size="icon" className="absolute left-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              {formData.password && (
                <div className="space-y-1 mt-2">
                  {passwordRequirements.map((req) => (
                    <div key={req.text} className="flex items-center gap-2 text-xs">
                      <Check className={`h-3 w-3 ${req.check(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <span className={req.check(formData.password) ? 'text-green-600' : 'text-muted-foreground'}>{req.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />در حال ثبت‌نام...</> : 'ثبت‌نام'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">قبلاً ثبت‌نام کرده‌اید؟{' '}<Link to="/auth/login" className="text-primary hover:underline">وارد شوید</Link></p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
