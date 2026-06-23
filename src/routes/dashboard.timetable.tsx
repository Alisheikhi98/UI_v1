import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { mockClasses, mockTimeSlots, mockSubjects, weekDays, generateMockSchedule } from '@/lib/data'
import { Download, Edit, Eye, GraduationCap, User } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/timetable')({
  head: () => ({ meta: [{ title: 'برنامه هفتگی - آموزش‌یار' }, { name: 'description', content: 'مشاهده و مدیریت برنامه هفتگی کلاس‌ها' }] }),
  component: TimetablePage,
})

function TimetablePage() {
  const [selectedGrade, setSelectedGrade] = useState<string>('10')
  const [selectedClass, setSelectedClass] = useState<string>('1')
  const [editMode, setEditMode] = useState(false)

  const schedule = useMemo(() => generateMockSchedule(), [])

  const uniqueGrades = [...new Set(mockClasses.map((c) => c.grade))].sort()
  const classesForGrade = mockClasses.filter((c) => c.grade === selectedGrade)
  const selectedClassData = mockClasses.find(c => c.id === selectedClass)

  const handleExport = () => {
    toast.success('در حال صادر کردن برنامه...', {
      description: 'فایل PDF به زودی آماده می‌شود.',
    })
  }

  return (
    <div className="flex flex-col">
      <Header title="برنامه هفتگی" description="مشاهده و مدیریت برنامه کلاس‌ها" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Select value={selectedGrade} onValueChange={(value) => {
              setSelectedGrade(value)
              const firstClass = mockClasses.find(c => c.grade === value)
              if (firstClass) setSelectedClass(firstClass.id)
            }}>
              <SelectTrigger className="w-36">
                <GraduationCap className="me-2 h-4 w-4" />
                <SelectValue placeholder="پایه" />
              </SelectTrigger>
              <SelectContent>
                {uniqueGrades.map((grade) => (
                  <SelectItem key={grade} value={grade}>پایه {grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="انتخاب کلاس" />
              </SelectTrigger>
              <SelectContent>
                {classesForGrade.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? (
                <>
                  <Eye className="me-2 h-4 w-4" />
                  حالت نمایش
                </>
              ) : (
                <>
                  <Edit className="me-2 h-4 w-4" />
                  حالت ویرایش
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="me-2 h-4 w-4" />
              صادر کردن PDF
            </Button>
          </div>
        </div>

        {selectedClassData && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{selectedClassData.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedClassData.studentCount} دانش‌آموز</Badge>
                  <Badge variant="outline">
                    <User className="me-1 h-3 w-3" />
                    {selectedClassData.classTeacher}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[800px]">
                <TooltipProvider>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky right-0 z-10 bg-muted/50 border-b border-l p-3 text-right text-sm font-medium text-muted-foreground w-28">
                          زمان
                        </th>
                        {weekDays.map((day) => (
                          <th key={day} className="border-b p-3 text-center text-sm font-medium text-muted-foreground">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mockTimeSlots.map((slot) => (
                        <tr key={slot.id}>
                          <td className="sticky right-0 z-10 bg-muted/50 border-b border-l p-3 text-sm font-medium text-right">
                            {slot.label}
                          </td>
                          {weekDays.map((day) => {
                            const entry = schedule[day]?.[slot.id]
                            if (!entry) {
                              return (
                                <td key={`${day}-${slot.id}`} className={`border-b p-2 text-center ${editMode ? 'hover:bg-muted/50 cursor-pointer' : ''}`}>
                                  {editMode && (
                                    <div className="flex items-center justify-center h-16 border-2 border-dashed border-muted-foreground/20 rounded-lg text-muted-foreground text-xs">
                                      + افزودن
                                    </div>
                                  )}
                                </td>
                              )
                            }
                            return (
                              <td key={`${day}-${slot.id}`} className={`border-b p-2 ${editMode ? 'cursor-pointer' : ''}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="rounded-lg p-3 h-16 flex flex-col justify-center transition-all hover:scale-[1.02]"
                                      style={{ backgroundColor: `${entry.subject.color}15`, borderRight: `3px solid ${entry.subject.color}` }}
                                    >
                                      <p className="text-sm font-medium truncate" style={{ color: entry.subject.color }}>
                                        {entry.subject.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">{entry.teacher}</p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <div className="space-y-1">
                                      <p className="font-medium">{entry.subject.name}</p>
                                      <p className="text-xs text-muted-foreground">معلم: {entry.teacher}</p>
                                      <p className="text-xs text-muted-foreground">کد: {entry.subject.code}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">راهنمای دروس</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {mockSubjects.map((subject) => (
                <div key={subject.id} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                  <span className="text-sm">{subject.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
