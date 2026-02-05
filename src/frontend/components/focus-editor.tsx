import { JsonEditor } from "@/components/json-editor";
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
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconDeviceFloppy, IconTrash, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface FocusEditorProps {
  isOpen: boolean;
  isCreating: boolean;
  name: string;
  onNameChange: (name: string) => void;
  json: string | undefined;
  onJsonChange: (json: string | undefined) => void;
  uuid: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  isDeleting?: boolean;
  entityType: string; // "Log", "Ruleset", etc.
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
}

export function FocusEditor({
  isOpen,
  isCreating,
  name,
  onNameChange,
  json,
  onJsonChange,
  uuid,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  entityType,
  deleteDialogOpen,
  onDeleteDialogChange,
}: FocusEditorProps) {
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
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="border-b bg-background/50 backdrop-blur-xl"
            >
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="gap-2"
                      >
                        <IconX className="size-4" />
                        <span className="hidden sm:inline">
                          {isCreating ? "Cancel" : "Exit Focus"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isCreating
                        ? "Cancel creation (Esc)"
                        : "Exit focus mode (Esc)"}
                    </TooltipContent>
                  </Tooltip>

                  <div className="h-6 w-px bg-border" />

                  <div className="flex items-center gap-3">
                    {isCreating && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 25,
                        }}
                        className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                      >
                        New
                      </motion.span>
                    )}
                    <Input
                      value={name}
                      onChange={(e) => onNameChange(e.target.value)}
                      className="max-w-md text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-2"
                      placeholder={`${entityType} name...`}
                    />
                  </div>
                </div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-2"
                >
                  {!isCreating && onDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog
                          open={deleteDialogOpen}
                          onOpenChange={onDeleteDialogChange}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
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
                    className="gap-2"
                  >
                    <IconDeviceFloppy className="size-4" />
                    {isCreating
                      ? `Create ${entityType}`
                      : isSaving
                        ? "Saving..."
                        : "Save Changes"}
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Editor Area */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1 relative"
            >
              <JsonEditor
                className="h-full"
                value={json}
                onChange={onJsonChange}
              />
            </motion.div>

            {/* Footer Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="border-t bg-background/50 backdrop-blur-xl px-6 py-3 flex items-center justify-between text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono">{uuid}</span>
                <span>•</span>
                <span>JSON Configuration</span>
              </div>
              <div className="flex items-center gap-4">
                <span>{json?.split("\n").length || 0} lines</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
