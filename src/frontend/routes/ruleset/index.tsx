import { useRulesetDelete } from "@/api/ruleset/delete";
import { useRulesetList } from "@/api/ruleset/list";
import { useRulesetUpdate } from "@/api/ruleset/update";
import { createRuleset } from "@/api/ruleset/create";
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
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/ruleset/")({
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

  const { data: rulesets, refetch: refetchList, isLoading } = useRulesetList();
  const selectedRuleset = rulesets?.find(
    (ruleset) => ruleset.uuid === selectedUuid,
  );
  const updateRulesetMutation = useRulesetUpdate();
  const deleteRulesetMutation = useRulesetDelete();

  // 检查资源使用情况
  const { data: usageData } = useResourceUsageCheck(
    pendingDeleteUuid || "",
    "ruleset",
    !!pendingDeleteUuid,
  );

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedRuleset && !isCreating) {
      setEditName(selectedRuleset.name);
      setEditJson(selectedRuleset.json);
      setEditUuid(selectedRuleset.uuid);
    }
  }, [selectedRuleset, isCreating]);

  useEffect(() => {
    if (
      selectedUuid === null &&
      rulesets &&
      rulesets.length > 0 &&
      !isCreating
    ) {
      setSelectedUuid(rulesets[0].uuid);
    }
  }, [rulesets, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first ruleset if available
      if (rulesets && rulesets.length > 0) {
        setSelectedUuid(rulesets[0].uuid);
      }
    }
  }, [isCreating, rulesets]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewRuleset = () => {
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
        // Create new ruleset
        await createRuleset({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Ruleset created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created ruleset
        setSelectedUuid(editUuid);
      } else {
        // Update existing ruleset
        if (!selectedUuid) return;
        await updateRulesetMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Ruleset updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating ? "Failed to create ruleset" : "Failed to update ruleset",
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
      await deleteRulesetMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Ruleset deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete ruleset");
    }
  };

  return (
    <AppPage
      title="RuleSet Configuration"
      description="Design and manage routing rules for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewRuleset}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Ruleset
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !rulesets || rulesets.length === 0 ? (
        <EmptyState
          title="No rulesets configured"
          description="Start building your network configuration by creating your first ruleset. Define routing rules, filters, and policies."
          actionLabel="Create Your First Ruleset"
          onAction={handleNewRuleset}
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
              {rulesets.map((ruleset, index) => {
                return (
                  <ConfigCard
                    key={ruleset.uuid}
                    name={ruleset.name}
                    jsonPreview={ruleset.json}
                    onClick={() => {
                      setSelectedUuid(ruleset.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={ruleset.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no rulesets */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedRuleset?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateRulesetMutation.isPending}
        isDeleting={deleteRulesetMutation.isPending}
        entityType="Ruleset"
        deleteDialogOpen={false}
        onDeleteDialogChange={() => {}}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Ruleset</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{selectedRuleset?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteRulesetMutation.isPending}
            >
              {deleteRulesetMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 使用警告对话框 */}
      <UsageWarningDialog
        open={usageWarningOpen}
        onOpenChange={setUsageWarningOpen}
        itemName={selectedRuleset?.name || ""}
        itemType="Ruleset"
        usedByConfigs={usageData?.used_by_configs || []}
      />
    </AppPage>
  );
}
