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
import {
  getTeacherErrorMessage,
  getTeacherFieldErrors,
  type TeacherFieldErrors,
} from "@/lib/teacher-errors";

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
  onSave: (data: TeacherDetailsInput) => Promise<void>;
}) {
  const [formData, setFormData] = useState<TeacherDetailsInput>({
    name: "",
    personnel_code: "",
    phone: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TeacherFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormData({
      name: teacher?.name || "",
      personnel_code: teacher?.personnel_code || "",
      phone: teacher?.phone || "",
    });
    setFieldErrors({});
    setFormError(null);
  }, [teacher, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (!name) {
      setFieldErrors({ name: "نام معلم الزامی است." });
      return;
    }
    setIsSaving(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await onSave({ ...formData, name });
      onOpenChange(false);
    } catch (error) {
      const errors = getTeacherFieldErrors(error);
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) setFormError(getTeacherErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
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
                onChange={(event) => {
                  setFormData({ ...formData, name: event.target.value });
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="نام معلم را وارد کنید"
                required
                disabled={isSaving}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "teacher-name-error" : undefined}
              />
              {fieldErrors.name && (
                <p id="teacher-name-error" role="alert" className="text-xs text-destructive">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="personnel-code">کد پرسنلی (اختیاری)</Label>
              <Input
                id="personnel-code"
                value={formData.personnel_code || ""}
                onChange={(event) => {
                  setFormData({ ...formData, personnel_code: event.target.value });
                  setFieldErrors((current) => ({ ...current, personnel_code: undefined }));
                }}
                placeholder="مثلاً ۱۰۲۴۵"
                disabled={isSaving}
                aria-invalid={Boolean(fieldErrors.personnel_code)}
                aria-describedby={fieldErrors.personnel_code ? "personnel-code-error" : undefined}
              />
              {fieldErrors.personnel_code && (
                <p id="personnel-code-error" role="alert" className="text-xs text-destructive">
                  {fieldErrors.personnel_code}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-phone">شماره موبایل (اختیاری)</Label>
              <Input
                id="teacher-phone"
                type="tel"
                value={formData.phone}
                onChange={(event) => {
                  setFormData({ ...formData, phone: event.target.value });
                  setFieldErrors((current) => ({ ...current, phone: undefined }));
                }}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                disabled={isSaving}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "teacher-phone-error" : undefined}
              />
              {fieldErrors.phone && (
                <p id="teacher-phone-error" role="alert" className="text-xs text-destructive">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
          </div>
          <DialogFooter className="flex-row-reverse justify-start gap-2">
            <Button type="submit" disabled={!formData.name.trim() || isSaving}>
              {teacher ? "به‌روزرسانی" : "افزودن معلم"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              انصراف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
