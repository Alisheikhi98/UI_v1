import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TeacherDetailsInput {
  name: string;
  personnel_code?: string;
  phone: string;
}

export function TeacherDetailsDialog({
  open,
  onOpenChange,
  teacher,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: TeacherDetailsInput | null;
  onSave: (data: TeacherDetailsInput) => void;
}) {
  const [formData, setFormData] = useState<TeacherDetailsInput>({
    name: "",
    personnel_code: "",
    phone: "",
  });

  useEffect(() => {
    if (!open) return;
    setFormData({
      name: teacher?.name || "",
      personnel_code: teacher?.personnel_code || "",
      phone: teacher?.phone || "",
    });
  }, [teacher, open]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (!name) return;
    onSave({ ...formData, name });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>{teacher ? "ویرایش معلم" : "افزودن معلم جدید"}</DialogTitle>
          <DialogDescription>
            {teacher ? "اطلاعات فردی معلم را به‌روز کنید." : "اطلاعات معلم جدید را ثبت کنید."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">نام معلم</Label>
              <Input
                id="teacher-name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="نام معلم را وارد کنید"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personnel-code">کد پرسنلی (اختیاری)</Label>
              <Input
                id="personnel-code"
                value={formData.personnel_code || ""}
                onChange={(event) =>
                  setFormData({ ...formData, personnel_code: event.target.value })
                }
                placeholder="مثلاً ۱۰۲۴۵"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-phone">شماره موبایل (اختیاری)</Label>
              <Input
                id="teacher-phone"
                type="tel"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse justify-start gap-2">
            <Button type="submit" disabled={!formData.name.trim()}>
              {teacher ? "به‌روزرسانی" : "افزودن معلم"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
