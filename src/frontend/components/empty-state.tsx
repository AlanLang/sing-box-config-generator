import { IconCode } from "@tabler/icons-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="h-[calc(100vh-160px)] flex items-center justify-center">
      <div className="text-center max-w-lg space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl rounded-full" />
          <div className="relative bg-gradient-to-br from-background to-muted border-2 border-border/50 rounded-3xl p-12">
            <IconCode
              className="size-20 mx-auto text-muted-foreground opacity-40"
              strokeWidth={1.5}
            />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </div>
        <Button
          size="lg"
          onClick={onAction}
          className="gap-2 relative overflow-hidden group mt-4"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
