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
import { mockSubjects, mockTeachers } from '@/lib/data'
import type { Subject } from '@/lib/types'
import { Plus, Search, MoreHorizontal, Edit, Trash2, BookOpen, Clock, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/subjects')({
  head: () => ({ meta: [{ title: 'دروس - آموزش‌یار' }, { name: 'description', content: 'مدیریت دروس برنامه درسی' }] }),
  component: SubjectsPage,
})

const subjectColors = [
  { name: 'آبی', value: '#1E40AF' },
  { name: 'سبز', value: '#059669' },
  { name: 'بنفش', value: '#7C3AED' },
  { name: 'قرمز', value: '#DC2626' },
  { name: 'زمردی', value: '#16A34A' },
  { name: 'کهربایی', value: '#CA8A04' },
  { name: 'فیروزه‌ای', value: '#0891B2' },
  { name: 'صورتی', value: '#DB2777' },
]

function EmptyState({ onAddSubject }: { onAddSubject: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">هنوز درسی ثبت نشده</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        با افزودن اولین درس شروع کنید. دروس می‌توانند به معلمان تخصیص داده شده و برنامه‌ریزی شوند.
      </p>
      <Button className="mt-6" onClick={onAddSubject}>
        <Plus className="me-2 h-4 w-4" />
        افزودن درس
      </Button>
    </Card>
  )
}

function SubjectDialog({
  open,
  onOpenChange,
  subject,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: Subject | null
  onSave: (data: Partial<Subject>) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Subject>>(
    subject || { name: '', code: '', weeklyHours: 4, assignedTeacher: '', color: '#1E40AF' }
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
          <DialogTitle>{subject ? 'ویرایش درس' : 'افزودن درس جدید'}</DialogTitle>
          <DialogDescription>
            {subject ? 'اطلاعات درس را به‌روز کنید.' : 'یک درس جدید به برنامه درسی اضافه کنید.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام درس</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ریاضی"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">کد درس</Label>
                <Input
                  id="code"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="MATH"
                  required
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeklyHours">ساعت هفتگی</Label>
                <Input
                  id="weeklyHours"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.weeklyHours || ''}
                  onChange={(e) => setFormData({ ...formData, weeklyHours: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>معلم مسئول</Label>
              <Select
                value={formData.assignedTeacher}
                onValueChange={(value) => setFormData({ ...formData, assignedTeacher: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب معلم" />
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
            <div className="space-y-2">
              <Label>رنگ درس</Label>
              <div className="flex flex-wrap gap-2">
                {subjectColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`h-8 w-8 rounded-full transition-all ${
                      formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
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
              ) : subject ? 'به‌روزرسانی' : 'افزودن درس'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.assignedTeacher.toLowerCase().includes(search.toLowerCase())
  )

  const totalWeeklyHours = subjects.reduce((acc, s) => acc + s.weeklyHours, 0)

  const handleSave = (data: Partial<Subject>) => {
    if (editingSubject) {
      setSubjects(subjects.map((s) => (s.id === editingSubject.id ? { ...s, ...data } : s)))
      toast.success('درس با موفقیت به‌روز شد')
    } else {
      const newSubject: Subject = {
        id: String(Date.now()),
        name: data.name || '',
        code: data.code || '',
        weeklyHours: data.weeklyHours || 4,
        assignedTeacher: data.assignedTeacher || '',
        color: data.color || '#1E40AF',
      }
      setSubjects([...subjects, newSubject])
      toast.success('درس با موفقیت اضافه شد')
    }
    setEditingSubject(null)
  }

  const handleDelete = (subject: Subject) => {
    setSubjects(subjects.filter((s) => s.id !== subject.id))
    toast.success('درس با موفقیت حذف شد')
  }

  const openAddDialog = () => { setEditingSubject(null); setDialogOpen(true) }
  const openEditDialog = (subject: Subject) => { setEditingSubject(subject); setDialogOpen(true) }

  return (
    <div className="flex flex-col">
      <Header title="دروس" description="مدیریت دروس برنامه درسی" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">مجموع دروس</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{subjects.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ساعت هفتگی</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalWeeklyHours}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">معلمان تخصیص‌یافته</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{new Set(subjects.map((s) => s.assignedTeacher)).size}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی دروس..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="me-2 h-4 w-4" />
            افزودن درس
          </Button>
        </div>

        {filteredSubjects.length === 0 && search === '' ? (
          <EmptyState onAddSubject={openAddDialog} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSubjects.length === 0 ? (
              <p className="col-span-full text-center py-8 text-muted-foreground">درسی یافت نشد</p>
            ) : (
              filteredSubjects.map((subject) => (
                <Card key={subject.id} className="transition-all hover:shadow-md overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: subject.color }} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${subject.color}20` }}>
                          <BookOpen className="h-4 w-4" style={{ color: subject.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{subject.name}</CardTitle>
                          <CardDescription className="text-xs">{subject.code}</CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(subject)}>
                            <Edit className="me-2 h-4 w-4" />
                            ویرایش
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(subject)}>
                            <Trash2 className="me-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{subject.weeklyHours} ساعت در هفته</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{subject.assignedTeacher}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={editingSubject}
        onSave={handleSave}
      />
    </div>
  )
}
