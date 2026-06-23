import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { CalendarDays, ArrowRight, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export const Route = createFileRoute('/auth/forgot-password')({
  head: () => ({ meta: [{ title: 'فراموشی رمز عبور - آموزش‌یار' }] }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitted(true)
    setIsLoading(false)
    toast.success('ایمیل ارسال شد!', { description: 'صندوق ورودی خود را برای دستورالعمل بازنشانی رمز بررسی کنید.' })
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">ایمیل خود را بررسی کنید</CardTitle>
            <CardDescription>دستورالعمل بازنشانی رمز به <strong>{email}</strong> ارسال شد</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">ایمیل دریافت نکردید؟ پوشه اسپم را بررسی کنید یا با ایمیل دیگری تلاش کنید.</p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>با ایمیل دیگری تلاش کنید</Button>
            <Link to="/auth/login" className="w-full">
              <Button variant="ghost" className="w-full gap-2"><ArrowRight className="h-4 w-4" />بازگشت به ورود</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl font-bold">فراموشی رمز عبور؟</CardTitle>
          <CardDescription>ایمیل خود را وارد کنید تا دستورالعمل بازنشانی ارسال شود</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input id="email" type="email" placeholder="admin@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />در حال ارسال...</> : 'ارسال دستورالعمل بازنشانی'}
            </Button>
            <Link to="/auth/login" className="w-full">
              <Button variant="ghost" className="w-full gap-2"><ArrowRight className="h-4 w-4" />بازگشت به ورود</Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
