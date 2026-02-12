import { createDnsConfig } from "@/api/dns-config/create";
import { useDnsConfigDelete } from "@/api/dns-config/delete";
import { useDnsConfigList } from "@/api/dns-config/list";
import { useDnsConfigUpdate } from "@/api/dns-config/update";
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

export const Route = createFileRoute("/dns-config/")({
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
    data: dnsConfigList,
    refetch: refetchList,
    isLoading,
  } = useDnsConfigList();
  const selectedDnsConfig = dnsConfigList?.find(
    (dnsConfig) => dnsConfig.uuid === selectedUuid,
  );
  const updateDnsConfigMutation = useDnsConfigUpdate();
  const deleteDnsConfigMutation = useDnsConfigDelete();

  // 检查资源使用情况
  const { data: usageData } = useResourceUsageCheck(
    pendingDeleteUuid || "",
    "dns-config",
    !!pendingDeleteUuid,
  );

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedDnsConfig && !isCreating) {
      setEditName(selectedDnsConfig.name);
      setEditJson(selectedDnsConfig.json);
      setEditUuid(selectedDnsConfig.uuid);
    }
  }, [selectedDnsConfig, isCreating]);

  useEffect(() => {
    if (
      selectedUuid === null &&
      dnsConfigList &&
      dnsConfigList.length > 0 &&
      !isCreating
    ) {
      setSelectedUuid(dnsConfigList[0].uuid);
    }
  }, [dnsConfigList, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first dns config if available
      if (dnsConfigList && dnsConfigList.length > 0) {
        setSelectedUuid(dnsConfigList[0].uuid);
      }
    }
  }, [isCreating, dnsConfigList]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewDnsConfig = () => {
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
        // Create new dns config
        await createDnsConfig({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("DNS Config created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created dns config
        setSelectedUuid(editUuid);
      } else {
        // Update existing dns config
        if (!selectedUuid) return;
        await updateDnsConfigMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("DNS Config updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating
            ? "Failed to create DNS Config"
            : "Failed to update DNS Config",
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
    if (pendingDeleteUuid && usageData) {
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
  }, [pendingDeleteUuid, usageData]);

  const handleConfirmDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteDnsConfigMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("DNS Config deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete DNS Config");
    }
  };

  return (
    <AppPage
      title="DNS Config"
      description="Design and manage DNS configuration for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewDnsConfig}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New DNS Config
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !dnsConfigList || dnsConfigList.length === 0 ? (
        <EmptyState
          title="No DNS Config configured"
          description="Start building your network configuration by creating your first DNS Config. Define DNS rules, servers, and policies."
          actionLabel="Create Your First DNS Config"
          onAction={handleNewDnsConfig}
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
              {dnsConfigList.map((dnsConfig, index) => {
                return (
                  <ConfigCard
                    key={dnsConfig.uuid}
                    name={dnsConfig.name}
                    jsonPreview={dnsConfig.json}
                    onClick={() => {
                      setSelectedUuid(dnsConfig.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={dnsConfig.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no dns config */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedDnsConfig?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateDnsConfigMutation.isPending}
        isDeleting={deleteDnsConfigMutation.isPending}
        entityType="DNS Config"
        deleteDialogOpen={false}
        onDeleteDialogChange={() => {}}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 DNS Config</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{selectedDnsConfig?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteDnsConfigMutation.isPending}
            >
              {deleteDnsConfigMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 使用警告对话框 */}
      <UsageWarningDialog
        open={usageWarningOpen}
        onOpenChange={setUsageWarningOpen}
        itemName={selectedDnsConfig?.name || ""}
        itemType="DNS Config"
        usedByConfigs={usageData?.used_by_configs || []}
      />
    </AppPage>
  );
}
