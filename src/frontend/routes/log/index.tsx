import { createLog } from "@/api/log/create";
import { useLogDelete } from "@/api/log/delete";
import { useLogList } from "@/api/log/list";
import { useLogUpdate } from "@/api/log/update";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { FocusEditor } from "@/components/focus-editor";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { UsageWarningDialog } from "@/components/usage-warning-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useResourceUsageCheck } from "@/api/usage-check";
import { IconCubePlus } from "@tabler/icons-react";
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
  const [usageWarningOpen, setUsageWarningOpen] = useState(false);
  const [usedByConfigs, setUsedByConfigs] = useState<
    Array<{ uuid: string; name: string }>
  >([]);
  const [pendingDeleteUuid, setPendingDeleteUuid] = useState<string | null>(
    null,
  );
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: logs, refetch: refetchList, isLoading } = useLogList();
  const selectedLog = logs?.find((log) => log.uuid === selectedUuid);
  const updateLogMutation = useLogUpdate();
  const deleteLogMutation = useLogDelete();

  // 检查资源使用情况
  const { data: usageData, isFetching: isCheckingUsage } =
    useResourceUsageCheck(pendingDeleteUuid || "", "log", !!pendingDeleteUuid);

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

    // 触发使用情况检查
    setPendingDeleteUuid(selectedUuid);
  };

  // 监听使用情况检查结果
  useEffect(() => {
    // 只有当有待删除的UUID、不在加载中、且有数据时才处理
    if (pendingDeleteUuid && !isCheckingUsage && usageData) {
      if (usageData.is_used) {
        // 被使用，缓存使用信息并显示警告对话框
        setUsedByConfigs(usageData.used_by_configs);
        setUsageWarningOpen(true);
        setPendingDeleteUuid(null);
      } else {
        // 未被使用，显示确认删除对话框
        setDeleteDialogOpen(true);
        setPendingDeleteUuid(null);
      }
    }
  }, [pendingDeleteUuid, usageData, isCheckingUsage]);

  const handleConfirmDelete = async () => {
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
              {logs.map((log, index) => {
                return (
                  <ConfigCard
                    key={log.uuid}
                    name={log.name}
                    jsonPreview={log.json}
                    onClick={() => {
                      setSelectedUuid(log.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={log.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no logs */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedLog?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateLogMutation.isPending}
        entityType="Log"
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Log</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{selectedLog?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLogMutation.isPending}
            >
              {deleteLogMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 使用警告对话框 */}
      <UsageWarningDialog
        open={usageWarningOpen}
        onOpenChange={setUsageWarningOpen}
        itemName={selectedLog?.name || ""}
        itemType="Log"
        usedByConfigs={usedByConfigs}
      />
    </AppPage>
  );
}
