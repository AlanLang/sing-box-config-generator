import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDeviceFloppy, IconTrash, IconDotsVertical } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EditorBottomBarProps {
  /** Primary save button handler */
  onSave: () => void;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether save button should be disabled (e.g., validation fails) */
  saveDisabled?: boolean;
  /** Entity type for display (e.g., "Log", "Subscribe") */
  entityType: string;
  /** Whether this is a creation flow */
  isCreating: boolean;
  /** Delete button handler (if not creating) */
  onDelete?: () => void;
  /** Additional menu items to show in dropdown */
  additionalMenuItems?: ReactNode;
}

/**
 * Shared mobile bottom action bar component.
 *
 * Only visible on mobile (sm:hidden).
 * Features large save button and overflow menu with delete action.
 */
export function EditorBottomBar({
  onSave,
  isSaving,
  saveDisabled = false,
  entityType,
  isCreating,
  onDelete,
  additionalMenuItems,
}: EditorBottomBarProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="sm:hidden border-t bg-background/95 backdrop-blur-xl px-4 py-3 safe-area-inset-bottom"
    >
      <div className="flex items-center gap-2">
        {/* Large Save Button */}
        <Button
          onClick={onSave}
          disabled={isSaving || saveDisabled}
          size="lg"
          className="flex-1 gap-2 h-12 text-base font-semibold"
        >
          <IconDeviceFloppy className="size-5" />
          <span>
            {isCreating
              ? `创建 ${entityType}`
              : isSaving
                ? "保存中..."
                : "保存更改"}
          </span>
        </Button>

        {/* More Menu */}
        {!isCreating && (onDelete || additionalMenuItems) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="shrink-0 h-12 w-12 p-0"
              >
                <IconDotsVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {additionalMenuItems}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive gap-2"
                  onClick={onDelete}
                >
                  <IconTrash className="size-4" />
                  <span>删除配置</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}
