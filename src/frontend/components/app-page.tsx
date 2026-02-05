import { cn } from "@/lib/utils";

interface AppPageProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AppPage({ children, className, title, description, actions }: AppPageProps) {
  return <div className={cn("flex flex-col gap-4 py-4 md:gap-6 md:py-6 p-4", className)}>
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex justify-end">{actions}</div>}
    </div>
    {children}
  </div>
}