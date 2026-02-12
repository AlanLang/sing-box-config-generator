import { useInboundDelete } from "@/api/inbound/delete";
import { useInboundList } from "@/api/inbound/list";
import { useInboundUpdate } from "@/api/inbound/update";
import { createInbound } from "@/api/inbound/create";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { FocusEditor } from "@/components/focus-editor";
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

export const Route = createFileRoute("/inbound/")({
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

  const { data: inbounds, refetch: refetchList, isLoading } = useInboundList();
  const selectedInbound = inbounds?.find(
    (inbound) => inbound.uuid === selectedUuid,
  );
  const updateInboundMutation = useInboundUpdate();
  const deleteInboundMutation = useInboundDelete();

  // 检查资源使用情况
  const { data: usageData, isFetching: isCheckingUsage } =
    useResourceUsageCheck(
      pendingDeleteUuid || "",
      "inbound",
      !!pendingDeleteUuid,
    );

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedInbound && !isCreating) {
      setEditName(selectedInbound.name);
      setEditJson(selectedInbound.json);
      setEditUuid(selectedInbound.uuid);
    }
  }, [selectedInbound, isCreating]);

  useEffect(() => {
    if (
      selectedUuid === null &&
      inbounds &&
      inbounds.length > 0 &&
      !isCreating
    ) {
      setSelectedUuid(inbounds[0].uuid);
    }
  }, [inbounds, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first inbound if available
      if (inbounds && inbounds.length > 0) {
        setSelectedUuid(inbounds[0].uuid);
      }
    }
  }, [isCreating, inbounds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewInbound = () => {
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
        // Create new inbound
        await createInbound({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Inbound created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created inbound
        setSelectedUuid(editUuid);
      } else {
        // Update existing inbound
        if (!selectedUuid) return;
        await updateInboundMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Inbound updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating ? "Failed to create inbound" : "Failed to update inbound",
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
      await deleteInboundMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Inbound deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete inbound");
    }
  };

  return (
    <AppPage
      title="Inbound Configuration"
      description="Design and manage inbound connections for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewInbound}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Inbound
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !inbounds || inbounds.length === 0 ? (
        <EmptyState
          title="No inbounds configured"
          description="Start building your network configuration by creating your first inbound. Define connection settings, protocols, and listeners."
          actionLabel="Create Your First Inbound"
          onAction={handleNewInbound}
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
              {inbounds.map((inbound, index) => {
                return (
                  <ConfigCard
                    key={inbound.uuid}
                    name={inbound.name}
                    jsonPreview={inbound.json}
                    onClick={() => {
                      setSelectedUuid(inbound.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={inbound.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no inbounds */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedInbound?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateInboundMutation.isPending}
        entityType="Inbound"
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Inbound</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{selectedInbound?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteInboundMutation.isPending}
            >
              {deleteInboundMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 使用警告对话框 */}
      <UsageWarningDialog
        open={usageWarningOpen}
        onOpenChange={setUsageWarningOpen}
        itemName={selectedInbound?.name || ""}
        itemType="Inbound"
        usedByConfigs={usageData?.used_by_configs || []}
      />
    </AppPage>
  );
}
