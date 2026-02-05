import { EditorBottomBar } from "@/components/editor-bottom-bar";
import { EditorHeader } from "@/components/editor-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface FormEditorProps {
  isOpen: boolean;
  isCreating: boolean;
  name: string;
  onNameChange: (name: string) => void;
  uuid: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  isDeleting?: boolean;
  entityType: string;
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
  /** Custom form content */
  children: ReactNode;
  /** Optional additional actions for header (e.g., refresh button) */
  additionalHeaderActions?: ReactNode;
  /** Optional additional menu items for mobile bottom bar */
  additionalMenuItems?: ReactNode;
  /** Optional footer content for desktop */
  footerContent?: ReactNode;
}

/**
 * Generic form editor component with full-screen focus mode.
 *
 * This component provides the same UX pattern as FocusEditor and SubscribeEditor,
 * but accepts custom form content via children prop.
 *
 * Features:
 * - Full-screen focus mode with animations
 * - Mobile-responsive layout (EditorHeader + EditorBottomBar)
 * - Delete confirmation dialog
 * - Extensible with additional actions
 */
export function FormEditor({
  isOpen,
  isCreating,
  name,
  onNameChange,
  uuid,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  entityType,
  deleteDialogOpen,
  onDeleteDialogChange,
  children,
  additionalHeaderActions,
  additionalMenuItems,
  footerContent,
}: FormEditorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
        >
          <motion.div
            initial={isCreating ? { scale: 0.9, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 },
            }}
            className="h-full flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl"
          >
            {/* Header Bar */}
            <EditorHeader
              onClose={onClose}
              isCreating={isCreating}
              entityType={entityType}
              name={name}
              onNameChange={onNameChange}
              desktopActions={
                <>
                  {additionalHeaderActions}

                  {!isCreating && onDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog
                          open={deleteDialogOpen}
                          onOpenChange={onDeleteDialogChange}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="shrink-0">
                              <IconTrash className="size-4 text-destructive" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete {entityType}</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete "{name}"? This
                                action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button
                                variant="destructive"
                                onClick={onDelete}
                                disabled={isDeleting}
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>Delete {entityType}</TooltipContent>
                    </Tooltip>
                  )}

                  <Button
                    onClick={onSave}
                    disabled={isSaving || !name.trim()}
                    size="sm"
                    className="gap-2 shrink-0"
                  >
                    <IconDeviceFloppy className="size-4" />
                    {isCreating
                      ? `Create ${entityType}`
                      : isSaving
                        ? "Saving..."
                        : "Save Changes"}
                  </Button>
                </>
              }
            />

            {/* Editor Area - Custom Form Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1 overflow-auto"
            >
              <div className="p-6 space-y-6">{children}</div>
            </motion.div>

            {/* Mobile Bottom Action Bar */}
            <EditorBottomBar
              onSave={onSave}
              isSaving={isSaving}
              saveDisabled={!name.trim()}
              entityType={entityType}
              isCreating={isCreating}
              onDelete={onDelete}
              isDeleting={isDeleting}
              deleteDialogOpen={deleteDialogOpen}
              onDeleteDialogChange={onDeleteDialogChange}
              itemName={name}
              additionalMenuItems={additionalMenuItems}
            />

            {/* Desktop Footer Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="hidden sm:flex border-t bg-background/50 backdrop-blur-xl px-6 py-3 items-center justify-between text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono">{uuid}</span>
                <span>•</span>
                <span>{entityType} Configuration</span>
              </div>
              {footerContent && (
                <div className="flex items-center gap-4">{footerContent}</div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
