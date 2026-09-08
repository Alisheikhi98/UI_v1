import {
  ChevronDown,
  Download,
  Expand,
  FileSpreadsheet,
  FileText,
  Loader2,
  Minimize2,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TimetablePageActions({
  fullscreen,
  onFullscreenToggle,
  onPrint,
  onExport,
  pdfExportDisabled,
  excelExportDisabled,
  exportPending,
}: {
  fullscreen: boolean;
  onFullscreenToggle: () => void;
  onPrint: () => void;
  onExport: (format: "pdf" | "excel") => void;
  pdfExportDisabled: boolean;
  excelExportDisabled: boolean;
  exportPending: "pdf" | "excel" | null;
}) {
  return (
    <div className="timetable-toolbar-actions grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <Button
        variant="outline"
        size="sm"
        className="col-span-2 sm:col-auto"
        onClick={onFullscreenToggle}
      >
        {fullscreen ? <Minimize2 className="me-2 h-4 w-4" /> : <Expand className="me-2 h-4 w-4" />}
        <span className="timetable-action-label">
          {fullscreen ? "خروج از تمام صفحه" : "نمایش تمام صفحه"}
        </span>
      </Button>
      <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={onPrint}>
        <Printer className="me-2 h-4 w-4" />
        <span className="timetable-action-label">چاپ برنامه</span>
      </Button>
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={(pdfExportDisabled && excelExportDisabled) || exportPending !== null}
          >
            {exportPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="me-2 h-4 w-4" />
            )}
            <span className="timetable-action-label">
              {exportPending ? "در حال آماده‌سازی..." : "دانلود"}
            </span>
            <ChevronDown className="ms-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>دانلود برنامه</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-10 cursor-pointer"
            disabled={pdfExportDisabled || exportPending !== null}
            onSelect={() => onExport("pdf")}
          >
            <FileText className="h-4 w-4" />
            دانلود PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-10 cursor-pointer"
            disabled={excelExportDisabled || exportPending !== null}
            onSelect={() => onExport("excel")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            دانلود Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
