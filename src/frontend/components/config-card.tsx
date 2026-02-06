import { IconChevronRight, IconCode } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ConfigCardProps {
  name: string;
  jsonPreview: string;
  onClick: () => void;
  index: number;
  uuid: string;
  actions?: ReactNode;
}

/**
 * Format and truncate JSON string for preview
 */
function formatJsonPreview(jsonStr: string): string {
  try {
    const formatted = JSON.stringify(JSON.parse(jsonStr), null, 2);
    return formatted.length > 150
      ? `${formatted.substring(0, 150)}...`
      : formatted;
  } catch {
    // If JSON parsing fails, show original string with truncation
    return jsonStr.length > 150 ? `${jsonStr.substring(0, 150)}...` : jsonStr;
  }
}

export function ConfigCard({
  name,
  jsonPreview,
  onClick,
  index,
  actions,
}: ConfigCardProps) {
  const formattedPreview = formatJsonPreview(jsonPreview);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <motion.button
        type="button"
        className="relative flex flex-col h-48 rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-md shadow-black/5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-150 cursor-pointer overflow-hidden w-full text-left group"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        {/* Single gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

        {/* Top corner accent */}
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary/60 transition-all duration-150 shadow-sm shadow-primary/20" />

        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] group-hover:opacity-[0.03] transition-opacity duration-150"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Card Header */}
        <div className="relative flex-shrink-0 p-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Icon indicator */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-all duration-150">
                <IconCode className="size-4 text-primary/60 group-hover:text-primary transition-all duration-150" />
              </div>
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-all duration-150">
                {name}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Action buttons */}
              {actions && (
                <div
                  className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-150"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {actions}
                </div>
              )}
              {/* Arrow indicator - only show when no actions or on hover */}
              {!actions && (
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-150">
                  <IconChevronRight className="size-5 text-primary" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Content Preview */}
        <div className="relative flex flex-col flex-1 min-h-0 pt-3 pl-3">
          {/* Code block container with editor styling */}
          <div className="flex flex-col h-full rounded-tl-lg bg-muted/40 group-hover:bg-muted/50 transition-all duration-150 border border-border/30 overflow-hidden">
            {/* Editor header bar */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30 bg-muted/30 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
              <span className="ml-1.5 text-[9px] text-muted-foreground/60 font-medium">
                config.json
              </span>
            </div>

            {/* Code content */}
            <div className="relative flex-1 min-h-0 p-2.5 overflow-hidden">
              <pre className="text-[11px] font-mono text-muted-foreground/70 group-hover:text-muted-foreground/90 leading-relaxed transition-all duration-150">
                {formattedPreview}
              </pre>
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-muted/40 group-hover:from-muted/50 to-transparent pointer-events-none transition-colors duration-150" />
            </div>
          </div>
        </div>

        {/* Bottom edge accent */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/50 to-transparent transition-all duration-150" />
      </motion.button>
    </motion.div>
  );
}
