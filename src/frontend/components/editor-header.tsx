import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconX } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EditorHeaderProps {
  /** Close button handler */
  onClose: () => void;
  /** Whether this is a creation flow */
  isCreating: boolean;
  /** Entity type for display (e.g., "Log", "Subscribe") */
  entityType: string;
  /** Name input value */
  name: string;
  /** Name change handler */
  onNameChange: (name: string) => void;
  /** Additional action buttons for desktop (save, delete, etc.) */
  desktopActions?: ReactNode;
}

/**
 * Shared editor header component with mobile-responsive layout.
 *
 * Desktop: Full header with back button, name input, and action buttons.
 * Mobile: Simplified header with back button and name input only.
 */
export function EditorHeader({
  onClose,
  isCreating,
  entityType,
  name,
  onNameChange,
  desktopActions,
}: EditorHeaderProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="border-b bg-background/50 backdrop-blur-xl"
    >
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        {/* Desktop: Full Header with Actions */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="gap-2 shrink-0"
                >
                  <IconX className="size-4" />
                  <span>{isCreating ? "Cancel" : "Exit Focus"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isCreating
                  ? "Cancel creation (Esc)"
                  : "Exit focus mode (Esc)"}
              </TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isCreating && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 25,
                  }}
                  className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0"
                >
                  New
                </motion.span>
              )}
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="flex-1 max-w-md text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-2"
                placeholder={`${entityType} name...`}
              />
            </div>
          </div>

          {desktopActions && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2"
            >
              {desktopActions}
            </motion.div>
          )}
        </div>

        {/* Mobile: Simple Header with Back + Name */}
        <div className="flex sm:hidden items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0"
          >
            <IconX className="size-4" />
          </Button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isCreating && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25,
                }}
                className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0"
              >
                New
              </motion.span>
            )}
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="flex-1 text-base font-semibold border-0 bg-transparent focus-visible:ring-0 px-2"
              placeholder={`${entityType} name...`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
