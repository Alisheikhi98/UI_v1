import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { mockTeachers } from '@/lib/data'
import type { Teacher } from '@/lib/types'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Filter,
  Users,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/teachers')({
  head: () => ({
    meta: [
      { title: 'معلمان - آموزش‌یار' },
      { name: 'description', content: 'مدیریت معلمان مدرسه' },
    ],
  }),
  component: TeachersPage,
})

function EmptyState({ onAddTeacher }: { onAddTeacher: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">هنوز معلمی ثبت نشده</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        با افزودن اولین معلم شروع کنید. معلمان می‌توانند به دروس و کلاس‌ها تخصیص داده شوند.
      </p>
      <Button className="mt-6" onClick={onAddTeacher}>
        <Plus className="ml-2 h-4 w-4" />
        افزودن معلم
      </Button>
    </Card>
  )
}

function TeacherDialog({
  open,
  onOpenChange,
  teacher,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: Teacher | null
  onSave: (data: Partial<Teacher>) => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '',
    personnel_code: '',
    phone: '',
    subjects: [],
    status: 'active',
  })

  useEffect(() => {
    if (!open) return

    if (teacher) {
      setFormData({
        name: teacher.name || '',
        personnel_code: teacher.personnel_code || '',
        phone: teacher.phone || '',
        subjects: teacher.subjects || [],
        status: teacher.status || 'active',
      })
    } else {
      setFormData({
        name: '',
        personnel_code: '',
        phone: '',
        subjects: [],
        status: 'active',
      })
    }
  }, [teacher, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 800))

    onSave(formData)
    setIsLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>
            {teacher ? 'ویرایش معلم' : 'افزودن معلم جدید'}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? 'اطلاعات معلم را به‌روز کنید.'
              : 'یک معلم جدید به مدرسه اضافه کنید.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام و نام خانوادگی</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="نام معلم را وارد کنید"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personnel_code">کد پرسنلی</Label>
              <Input
                id="personnel_code"
                value={formData.personnel_code || ''}
                onChange={(e) =>
                  setFormData({ ...formData, personnel_code: e.target.value })
                }
                placeholder="مثلاً 10245"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">شماره تماس</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                required
              />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse justify-start gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : teacher ? (
                'به‌روزرسانی'
              ) : (
                'افزودن معلم'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              انصراف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null)

  const filteredTeachers = teachers.filter((teacher) => {
    const normalizedSearch = search.toLowerCase()

    const matchesSearch =
      teacher.name.toLowerCase().includes(normalizedSearch) ||
      (teacher.personnel_code || '').toLowerCase().includes(normalizedSearch)

    const matchesStatus =
      statusFilter === 'all' || teacher.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleSave = (data: Partial<Teacher>) => {
    if (editingTeacher) {
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher.id === editingTeacher.id ? { ...teacher, ...data } : teacher,
        ),
      )

      toast.success('اطلاعات معلم به‌روز شد', {
        description: `${data.name || editingTeacher.name} با موفقیت ویرایش شد.`,
      })
    } else {
      const newTeacher: Teacher = {
        id: String(Date.now()),
        name: data.name || '',
        personnel_code: data.personnel_code || '',
        phone: data.phone || '',
        subjects: data.subjects || [],
        status: 'active',
      }

      setTeachers((prev) => [...prev, newTeacher])

      toast.success('معلم جدید اضافه شد', {
        description: `${data.name || 'معلم'} با موفقیت به لیست معلمان اضافه شد.`,
      })
    }

    setEditingTeacher(null)
  }

  const openAddDialog = () => {
    setEditingTeacher(null)
    setDialogOpen(true)
  }

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setDialogOpen(true)
  }

  const openDeleteDialog = (teacher: Teacher) => {
    setTeacherToDelete(teacher)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!teacherToDelete) return

    setTeachers((prev) =>
      prev.filter((teacher) => teacher.id !== teacherToDelete.id),
    )

    toast.success('معلم با موفقیت حذف شد', {
      description: `${teacherToDelete.name} از لیست معلمان حذف شد.`,
    })

    setTeacherToDelete(null)
    setDeleteDialogOpen(false)
  }

  return (
    <div className="flex flex-col" dir="rtl">
      <Header title="معلمان" description="مدیریت کادر آموزشی مدرسه" />

      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجوی معلمان یا کد پرسنلی..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="ml-2 h-4 w-4" />
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={openAddDialog}>
            <Plus className="ml-2 h-4 w-4" />
            افزودن معلم
          </Button>
        </div>

        {filteredTeachers.length === 0 && search === '' && statusFilter === 'all' ? (
          <EmptyState onAddTeacher={openAddDialog} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">معلم</TableHead>
                    <TableHead className="text-right">کد پرسنلی</TableHead>
                    <TableHead className="text-right">شماره تماس</TableHead>
                    <TableHead className="text-right">دروس</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="w-12 text-left" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        معلمی یافت نشد
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {teacher.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{teacher.name}</p>
                          </div>
                        </TableCell>

                        <TableCell>
                          {teacher.personnel_code ? (
                            <Badge variant="outline">{teacher.personnel_code}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              ثبت نشده
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {teacher.phone ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {teacher.phone}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              ثبت نشده
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.subjects && teacher.subjects.length > 0 ? (
                              teacher.subjects.map((subject) => (
                                <Badge
                                  key={subject}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {subject}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                بدون درس
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              teacher.status === 'active'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {teacher.status === 'active' ? 'فعال' : 'غیرفعال'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-left">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="text-right">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(teacher)}
                              >
                                <Edit className="ml-2 h-4 w-4" />
                                ویرایش
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDeleteDialog(teacher)}
                              >
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <TeacherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teacher={editingTeacher}
        onSave={handleSave}
      />

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setTeacherToDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تأیید حذف معلم</DialogTitle>
            <DialogDescription>
              آیا مطمئن هستید که می‌خواهید{' '}
              <span className="font-medium text-foreground">
                {teacherToDelete?.name}
              </span>{' '}
              را حذف کنید؟ این عملیات قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row-reverse justify-start gap-2">
            <Button variant="destructive" onClick={confirmDelete}>
              حذف معلم
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
