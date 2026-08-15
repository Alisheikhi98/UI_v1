import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.ComponentProps<typeof Input> {
  containerClassName?: string;
  iconClassName?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, iconClassName, type = "search", ...props }, ref) => (
    <div className={cn("relative", containerClassName)}>
      <Search
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute start-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground",
          iconClassName,
        )}
      />
      <Input ref={ref} type={type} className={cn("ps-9 pe-3", className)} {...props} />
    </div>
  ),
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
