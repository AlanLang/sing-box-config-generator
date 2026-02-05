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
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconDeviceFloppy, IconTrash, IconRefresh } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTimeAgo, formatDateTime } from "@/lib/time";

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
            <EditorHeader
              onClose={onClose}
              isCreating={isCreating}
              entityType="Subscribe"
              name={name}
              onNameChange={onNameChange}
              desktopActions={
                <>
                  {!isCreating && onRefresh && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onRefresh}
                          disabled={isRefreshing}
                          className="shrink-0"
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
                            <Button variant="ghost" size="sm" className="shrink-0">
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
                    className="gap-2 shrink-0"
                  >
                    <IconDeviceFloppy className="size-4" />
                    {isCreating
                      ? "Create Subscribe"
                      : isSaving
                        ? "Saving..."
                        : "Save Changes"}
                  </Button>
                </>
              }
            />

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

            {/* Mobile Bottom Action Bar */}
            <EditorBottomBar
              onSave={onSave}
              isSaving={isSaving}
              saveDisabled={!name.trim()}
              entityType="Subscribe"
              isCreating={isCreating}
              onDelete={onDelete}
              isDeleting={isDeleting}
              deleteDialogOpen={deleteDialogOpen}
              onDeleteDialogChange={onDeleteDialogChange}
              itemName={name}
              additionalMenuItems={
                !isCreating && onRefresh ? (
                  <DropdownMenuItem
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    <IconRefresh className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>刷新订阅</span>
                  </DropdownMenuItem>
                ) : undefined
              }
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
                <span>Subscribe Configuration</span>
              </div>
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        Last updated: {formatTimeAgo(lastUpdated)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatDateTime(lastUpdated)}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
