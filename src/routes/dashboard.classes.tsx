import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockClasses, mockTeachers } from '@/lib/data'
import type { Class } from '@/lib/types'
import { Plus, Search, MoreHorizontal, Edit, Trash2, GraduationCap, Users, Filter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/classes')({
  head: () => ({ meta: [{ title: 'کلاس‌ها - آموزش‌یار' }, { name: 'description', content: 'مدیریت کلاس‌ها و بخش‌های مدرسه' }] }),
  component: ClassesPage,
})

function EmptyState({ onAddClass }: { onAddClass: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <GraduationCap className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">هنوز کلاسی ثبت نشده</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        با ایجاد اولین کلاس شروع کنید. کلاس‌ها می‌توانند به معلمان و دروس تخصیص داده شوند.
      </p>
      <Button className="mt-6" onClick={onAddClass}>
        <Plus className="me-2 h-4 w-4" />
        افزودن کلاس
      </Button>
    </Card>
  )
}

const sections = ['الف', 'ب', 'ج', 'د', 'ه']

function ClassDialog({
  open,
  onOpenChange,
  classItem,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classItem?: Class | null
  onSave: (data: Partial<Class>) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Class>>(
    classItem || { name: '', grade: '', section: '', studentCount: 0, classTeacher: '' }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    onSave(formData)
    setIsLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{classItem ? 'ویرایش کلاس' : 'افزودن کلاس جدید'}</DialogTitle>
          <DialogDescription>
            {classItem ? 'اطلاعات کلاس را به‌روز کنید.' : 'یک کلاس جدید برای مدرسه ایجاد کنید.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>پایه</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) =>
                    setFormData({ ...formData, grade: value, name: `کلاس ${value}-${formData.section || 'الف'}` })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب پایه" />
                  </SelectTrigger>
                  <SelectContent>
                    {['۶', '۷', '۸', '۹', '۱۰', '۱۱', '۱۲'].map((g) => (
                      <SelectItem key={g} value={g}>پایه {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>بخش</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) =>
                    setFormData({ ...formData, section: value, name: `کلاس ${formData.grade || '۱۰'}-${value}` })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب بخش" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>بخش {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentCount">تعداد دانش‌آموزان</Label>
              <Input
                id="studentCount"
                type="number"
                min="1"
                max="50"
                value={formData.studentCount || ''}
                onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value) || 0 })}
                placeholder="۳۰"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>معلم مسئول</Label>
              <Select
                value={formData.classTeacher}
                onValueChange={(value) => setFormData({ ...formData, classTeacher: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب معلم مسئول" />
                </SelectTrigger>
                <SelectContent>
                  {mockTeachers.filter(t => t.status === 'active').map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.name}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : classItem ? 'به‌روزرسانی' : 'افزودن کلاس'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>(mockClasses)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.classTeacher.toLowerCase().includes(search.toLowerCase())
    const matchesGrade = gradeFilter === 'all' || c.grade === gradeFilter
    return matchesSearch && matchesGrade
  })

  const uniqueGrades = [...new Set(classes.map((c) => c.grade))].sort()

  const handleSave = (data: Partial<Class>) => {
    if (editingClass) {
      setClasses(classes.map((c) => (c.id === editingClass.id ? { ...c, ...data } : c)))
      toast.success('کلاس با موفقیت به‌روز شد')
    } else {
      const newClass: Class = {
        id: String(Date.now()),
        name: data.name || `کلاس ${data.grade}-${data.section}`,
        grade: data.grade || '',
        section: data.section || '',
        studentCount: data.studentCount || 0,
        classTeacher: data.classTeacher || '',
      }
      setClasses([...classes, newClass])
      toast.success('کلاس با موفقیت اضافه شد')
    }
    setEditingClass(null)
  }

  const handleDelete = (classItem: Class) => {
    setClasses(classes.filter((c) => c.id !== classItem.id))
    toast.success('کلاس با موفقیت حذف شد')
  }

  const openAddDialog = () => { setEditingClass(null); setDialogOpen(true) }
  const openEditDialog = (classItem: Class) => { setEditingClass(classItem); setDialogOpen(true) }

  const totalStudents = classes.reduce((acc, c) => acc + c.studentCount, 0)

  return (
    <div className="flex flex-col">
      <Header title="کلاس‌ها" description="مدیریت کلاس‌ها و بخش‌های مدرسه" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">مجموع کلاس‌ها</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{classes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">مجموع دانش‌آموزان</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">پایه‌های تحصیلی</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{uniqueGrades.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجوی کلاس‌ها..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-36">
                <Filter className="me-2 h-4 w-4" />
                <SelectValue placeholder="پایه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه پایه‌ها</SelectItem>
                {uniqueGrades.map((grade) => (
                  <SelectItem key={grade} value={grade}>پایه {grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="me-2 h-4 w-4" />
            افزودن کلاس
          </Button>
        </div>

        {filteredClasses.length === 0 && search === '' && gradeFilter === 'all' ? (
          <EmptyState onAddClass={openAddDialog} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.length === 0 ? (
              <p className="col-span-full text-center py-8 text-muted-foreground">کلاسی یافت نشد</p>
            ) : (
              filteredClasses.map((classItem) => (
                <Card key={classItem.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{classItem.name}</CardTitle>
                          <CardDescription>پایه {classItem.grade} - بخش {classItem.section}</CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(classItem)}>
                            <Edit className="me-2 h-4 w-4" />
                            ویرایش
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(classItem)}>
                            <Trash2 className="me-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classItem.studentCount} دانش‌آموز</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      <span>معلم مسئول: {classItem.classTeacher}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <ClassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classItem={editingClass}
        onSave={handleSave}
      />
    </div>
  )
}
