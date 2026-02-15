import { Loader2 } from "lucide-react";

export function Spinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
    </div>
  );
}
