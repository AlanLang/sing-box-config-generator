import { createOutbound } from "@/api/outbound/create";
import { useOutboundDelete } from "@/api/outbound/delete";
import { useOutboundList } from "@/api/outbound/list";
import { useOutboundUpdate } from "@/api/outbound/update";
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

export const Route = createFileRoute("/outbound/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usageWarningOpen, setUsageWarningOpen] = useState(false);
  const [pendingDeleteUuid, setPendingDeleteUuid] = useState<string | null>(
    null,
  );
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: outbounds,
    refetch: refetchList,
    isLoading,
  } = useOutboundList();
  const selectedOutbound = outbounds?.find(
    (outbound) => outbound.uuid === selectedUuid,
  );
  const updateOutboundMutation = useOutboundUpdate();
  const deleteOutboundMutation = useOutboundDelete();

  // 检查资源使用情况
  const { data: usageData, isFetching: isCheckingUsage } =
    useResourceUsageCheck(
      pendingDeleteUuid || "",
      "outbound",
      !!pendingDeleteUuid,
    );

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedOutbound && !isCreating) {
      setEditName(selectedOutbound.name);
      setEditJson(selectedOutbound.json);
      setEditUuid(selectedOutbound.uuid);
    }
  }, [selectedOutbound, isCreating]);

  useEffect(() => {
    if (
      selectedUuid === null &&
      outbounds &&
      outbounds.length > 0 &&
      !isCreating
    ) {
      setSelectedUuid(outbounds[0].uuid);
    }
  }, [outbounds, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first outbound if available
      if (outbounds && outbounds.length > 0) {
        setSelectedUuid(outbounds[0].uuid);
      }
    }
  }, [isCreating, outbounds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewOutbound = () => {
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
        // Create new outbound
        await createOutbound({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Outbound created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created outbound
        setSelectedUuid(editUuid);
      } else {
        // Update existing outbound
        if (!selectedUuid) return;
        await updateOutboundMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Outbound updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating
            ? "Failed to create outbound"
            : "Failed to update outbound",
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
        // 被使用，显示警告对话框
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
      await deleteOutboundMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Outbound deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete outbound");
    }
  };

  return (
    <AppPage
      title="Outbound Configuration"
      description="Design and manage outbound rules for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewOutbound}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Outbound
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !outbounds || outbounds.length === 0 ? (
        <EmptyState
          title="No outbounds configured"
          description="Start building your network configuration by creating your first outbound. Define routing rules, proxies, and policies."
          actionLabel="Create Your First Outbound"
          onAction={handleNewOutbound}
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
              {outbounds.map((outbound, index) => {
                return (
                  <ConfigCard
                    key={outbound.uuid}
                    name={outbound.name}
                    jsonPreview={outbound.json}
                    onClick={() => {
                      setSelectedUuid(outbound.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={outbound.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no outbounds */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedOutbound?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateOutboundMutation.isPending}
        entityType="Outbound"
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Outbound</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{selectedOutbound?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteOutboundMutation.isPending}
            >
              {deleteOutboundMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 使用警告对话框 */}
      <UsageWarningDialog
        open={usageWarningOpen}
        onOpenChange={setUsageWarningOpen}
        itemName={selectedOutbound?.name || ""}
        itemType="Outbound"
        usedByConfigs={usageData?.used_by_configs || []}
      />
    </AppPage>
  );
}
