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
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconDeviceFloppy, IconTrash, IconX, IconRefresh } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubscribeEditorProps {
  isOpen: boolean;
  isCreating: boolean;
  name: string;
  onNameChange: (name: string) => void;
  subscriptionUrl: string;
  onSubscriptionUrlChange: (url: string) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (url: string) => void;
  content: string;
  lastUpdated: string | null;
  uuid: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  isSaving: boolean;
  isDeleting?: boolean;
  isRefreshing?: boolean;
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
}

export function SubscribeEditor({
  isOpen,
  isCreating,
  name,
  onNameChange,
  subscriptionUrl,
  onSubscriptionUrlChange,
  websiteUrl,
  onWebsiteUrlChange,
  content,
  lastUpdated,
  uuid,
  onClose,
  onSave,
  onDelete,
  onRefresh,
  isSaving,
  isDeleting,
  isRefreshing,
  deleteDialogOpen,
  onDeleteDialogChange,
}: SubscribeEditorProps) {
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
                      placeholder="Subscribe name..."
                    />
                  </div>
                </div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-2"
                >
                  {!isCreating && onRefresh && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onRefresh}
                          disabled={isRefreshing}
                        >
                          <IconRefresh className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh Subscription</TooltipContent>
                    </Tooltip>
                  )}

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
                              <DialogTitle>Delete Subscribe</DialogTitle>
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
                      <TooltipContent>Delete Subscribe</TooltipContent>
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
                      ? "Create Subscribe"
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
              className="flex-1 overflow-auto"
            >
              <div className="p-6 space-y-6">
                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subscription-url">Subscription URL</Label>
                    <Input
                      id="subscription-url"
                      value={subscriptionUrl}
                      onChange={(e) => onSubscriptionUrlChange(e.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website-url">Website URL (Optional)</Label>
                    <Input
                      id="website-url"
                      value={websiteUrl}
                      onChange={(e) => onWebsiteUrlChange(e.target.value)}
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                </div>
              </div>
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
                <span>Subscribe Configuration</span>
              </div>
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
