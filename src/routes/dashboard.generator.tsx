import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { mockClasses, mockTimeSlots } from '@/lib/data'
import { Sparkles, Settings2, Clock, CheckCircle, Loader2, ArrowLeft, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/generator')({
  head: () => ({ meta: [{ title: 'تولید برنامه - آموزش‌یار' }, { name: 'description', content: 'تولید خودکار برنامه هفتگی بهینه' }] }),
  component: ScheduleGeneratorPage,
})

type GeneratorState = 'idle' | 'generating' | 'success' | 'error'

const constraints = [
  { id: 'noConsecutive', label: 'جلوگیری از تکرار پشت‌سرهم یک درس', description: 'یک درس نمی‌تواند در دو ساعت متوالی برنامه‌ریزی شود' },
  { id: 'teacherAvailability', label: 'رعایت در دسترس بودن معلم', description: 'معلمان فقط در ساعات مجاز خود برنامه‌ریزی می‌شوند' },
  { id: 'breakPeriods', label: 'درج زنگ تفریح', description: 'به صورت خودکار زنگ‌های تفریح بین جلسات اضافه می‌شود' },
  { id: 'balanceSubjects', label: 'توزیع متوازن دروس در هفته', description: 'دروس به‌طور یکنواخت در روزهای هفته پخش می‌شوند' },
  { id: 'prioritySlots', label: 'استفاده از ساعات اولویت‌دار', description: 'دروس مهم در ساعات بهینه قرار می‌گیرند' },
]

function ScheduleGeneratorPage() {
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(mockTimeSlots.map(t => t.id))
  const [selectedConstraints, setSelectedConstraints] = useState<string[]>(['noConsecutive', 'teacherAvailability', 'breakPeriods'])
  const [generatorState, setGeneratorState] = useState<GeneratorState>('idle')
  const [progress, setProgress] = useState(0)

  const uniqueGrades = [...new Set(mockClasses.map((c) => c.grade))].sort()
  const classesForGrade = mockClasses.filter((c) => c.grade === selectedGrade)

  const handleTimeSlotToggle = (slotId: string) => {
    setSelectedTimeSlots(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  const handleConstraintToggle = (constraintId: string) => {
    setSelectedConstraints(prev =>
      prev.includes(constraintId) ? prev.filter(id => id !== constraintId) : [...prev, constraintId]
    )
  }

  const handleGenerate = async () => {
    if (!selectedGrade || !selectedClass) {
      toast.error('لطفاً پایه و کلاس را انتخاب کنید')
      return
    }
    setGeneratorState('generating')
    setProgress(0)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100 }
        return prev + Math.random() * 15
      })
    }, 200)

    await new Promise(resolve => setTimeout(resolve, 3000))
    clearInterval(interval)
    setProgress(100)
    await new Promise(resolve => setTimeout(resolve, 500))
    setGeneratorState('success')
    toast.success('برنامه با موفقیت تولید شد!')
  }

  const resetGenerator = () => {
    setGeneratorState('idle')
    setProgress(0)
  }

  return (
    <div className="flex flex-col">
      <Header title="تولید برنامه" description="تولید خودکار برنامه هفتگی بهینه" />
      <div className="p-6 space-y-6">
        {generatorState === 'success' ? (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">برنامه با موفقیت تولید شد</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                برنامه هفتگی {classesForGrade.find(c => c.id === selectedClass)?.name} تولید شده و آماده بررسی است.
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={resetGenerator}>
                  تولید برنامه دیگر
                </Button>
                <Link to="/dashboard/timetable">
                  <Button>
                    مشاهده برنامه
                    <ArrowLeft className="ms-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : generatorState === 'generating' ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">در حال تولید برنامه</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                بهینه‌سازی ساعات و رفع تداخل‌ها...
              </p>
              <div className="mt-6 w-full max-w-md">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  {Math.round(progress)}٪ تکمیل شده
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    انتخاب کلاس
                  </CardTitle>
                  <CardDescription>پایه و کلاس را برای تولید برنامه انتخاب کنید</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>پایه</Label>
                      <Select value={selectedGrade} onValueChange={(value) => { setSelectedGrade(value); setSelectedClass('') }}>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب پایه" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueGrades.map((grade) => (
                            <SelectItem key={grade} value={grade}>پایه {grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>کلاس</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedGrade}>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب کلاس" />
                        </SelectTrigger>
                        <SelectContent>
                          {classesForGrade.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.studentCount} دانش‌آموز)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    ساعات درسی
                  </CardTitle>
                  <CardDescription>ساعاتی که باید در برنامه گنجانده شوند را انتخاب کنید</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {mockTimeSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedTimeSlots.includes(slot.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleTimeSlotToggle(slot.id)}
                      >
                        <Checkbox
                          checked={selectedTimeSlots.includes(slot.id)}
                          onCheckedChange={() => handleTimeSlotToggle(slot.id)}
                        />
                        <span className="text-sm font-medium">{slot.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    محدودیت‌های برنامه‌ریزی
                  </CardTitle>
                  <CardDescription>قوانین و الزاماتی که باید در تولید برنامه رعایت شوند</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {constraints.map((constraint) => (
                      <div key={constraint.id} className="flex items-start gap-3">
                        <Checkbox
                          id={constraint.id}
                          checked={selectedConstraints.includes(constraint.id)}
                          onCheckedChange={() => handleConstraintToggle(constraint.id)}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <Label htmlFor={constraint.id} className="cursor-pointer font-medium">
                            {constraint.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{constraint.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">خلاصه تنظیمات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">کلاس انتخاب‌شده</p>
                    <p className="text-sm mt-1">
                      {selectedClass ? classesForGrade.find(c => c.id === selectedClass)?.name : 'انتخاب نشده'}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ساعات انتخاب‌شده</p>
                    <p className="text-sm mt-1">{selectedTimeSlots.length} از {mockTimeSlots.length} ساعت</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">محدودیت‌های فعال</p>
                    <p className="text-sm mt-1">{selectedConstraints.length} محدودیت</p>
                  </div>
                  <Separator />
                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={!selectedGrade || !selectedClass || selectedTimeSlots.length === 0}
                  >
                    <Sparkles className="me-2 h-4 w-4" />
                    تولید برنامه
                  </Button>
                  {(!selectedGrade || !selectedClass) && (
                    <p className="text-xs text-muted-foreground text-center">
                      لطفاً پایه و کلاس را انتخاب کنید
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
