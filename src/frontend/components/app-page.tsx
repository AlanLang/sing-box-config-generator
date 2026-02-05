import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppPageProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AppPage({ children, className, title, description, actions }: AppPageProps) {
  return <div className={cn("flex flex-col gap-4 py-4 md:gap-6 md:py-6 p-4", className)}>
    <div className="flex flex-col gap-3 md:gap-0">
      {/* Top row: Sidebar trigger and actions */}
      <div className="flex justify-between items-center">
        <SidebarTrigger />
        {actions && <div className="flex justify-end">{actions}</div>}
      </div>
      {/* Title row: Full width on mobile, inline with trigger on desktop */}
      <div className="flex flex-col gap-1 md:ml-10">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
    {children}
  </div>
}