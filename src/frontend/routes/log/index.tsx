import { createLog } from "@/api/log/create";
import { useLogDelete } from "@/api/log/delete";
import { useLogList } from "@/api/log/list";
import { useLogUpdate } from "@/api/log/update";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { JsonEditor } from "@/components/json-editor";
import { SkeletonGrid } from "@/components/skeleton-grid";
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
import {
  IconCubePlus,
  IconDeviceFloppy,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/log/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: logs, refetch: refetchList, isLoading } = useLogList();
  const selectedLog = logs?.find((log) => log.uuid === selectedUuid);
  const updateLogMutation = useLogUpdate();
  const deleteLogMutation = useLogDelete();

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedLog && !isCreating) {
      setEditName(selectedLog.name);
      setEditJson(selectedLog.json);
      setEditUuid(selectedLog.uuid);
    }
  }, [selectedLog, isCreating]);

  useEffect(() => {
    if (selectedUuid === null && logs && logs.length > 0 && !isCreating) {
      setSelectedUuid(logs[0].uuid);
    }
  }, [logs, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first log if available
      if (logs && logs.length > 0) {
        setSelectedUuid(logs[0].uuid);
      }
    }
  }, [isCreating, logs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewLog = () => {
    setIsCreating(true);
    setSelectedUuid(null);
    setEditName("");
    setEditJson("{}");
    setEditUuid(uuidv4());
    setFocusMode(true);
  };

  const handleSave = async () => {
    if (!editJson) return;

    try {
      JSON.parse(editJson);

      if (isCreating) {
        // Create new log
        await createLog({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Log created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created log
        setSelectedUuid(editUuid);
      } else {
        // Update existing log
        if (!selectedUuid) return;
        await updateLogMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Log updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating ? "Failed to create log" : "Failed to update log",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteLogMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Log deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete log");
    }
  };

  return (
    <AppPage
      title="Log Configuration"
      description="Design and manage logging rules for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewLog}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Log
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !logs || logs.length === 0 ? (
        <EmptyState
          title="No logs configured"
          description="Start building your network configuration by creating your first log. Define logging rules, filters, and policies."
          actionLabel="Create Your First Log"
          onAction={handleNewLog}
        />
      ) : (
        /* Grid View */
        <AnimatePresence mode="wait">
          {!focusMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6"
            >
              {logs.map((log, index) => (
                <ConfigCard
                  key={log.uuid}
                  name={log.name}
                  jsonPreview={`${formatJson(log.json).substring(0, 150)}...`}
                  onClick={() => {
                    setSelectedUuid(log.uuid);
                    setIsCreating(false);
                    setFocusMode(true);
                  }}
                  index={index}
                  uuid={log.uuid}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no logs */}
      <AnimatePresence>
        {focusMode && (
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
                          onClick={handleExitFocus}
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
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="max-w-md text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-2"
                        placeholder="Log name..."
                      />
                    </div>
                  </div>

                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2"
                  >
                    {!isCreating && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Dialog
                            open={deleteDialogOpen}
                            onOpenChange={setDeleteDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <IconTrash className="size-4 text-destructive" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Log</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{editName}
                                  "? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  onClick={handleDelete}
                                  disabled={deleteLogMutation.isPending}
                                >
                                  {deleteLogMutation.isPending
                                    ? "Deleting..."
                                    : "Delete"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TooltipTrigger>
                        <TooltipContent>Delete log</TooltipContent>
                      </Tooltip>
                    )}

                    <Button
                      onClick={handleSave}
                      disabled={updateLogMutation.isPending || !editName.trim()}
                      size="sm"
                      className="gap-2"
                    >
                      <IconDeviceFloppy className="size-4" />
                      {isCreating
                        ? "Create Log"
                        : updateLogMutation.isPending
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
                  value={editJson}
                  onChange={(value) => setEditJson(value)}
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
                  <span className="font-mono">
                    {isCreating ? editUuid : selectedLog?.uuid}
                  </span>
                  <span>•</span>
                  <span>JSON Configuration</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>{editJson?.split("\n").length || 0} lines</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppPage>
  );
}

function formatJson(jsonStr: string) {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch (_) {
    return jsonStr;
  }
}
