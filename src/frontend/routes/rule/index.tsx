import { useRuleDelete } from "@/api/rule/delete";
import { useRuleList } from "@/api/rule/list";
import { useRuleUpdate } from "@/api/rule/update";
import { createRule } from "@/api/rule/create";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { FocusEditor } from "@/components/focus-editor";
import { Button } from "@/components/ui/button";
import { IconCubePlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/rule/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: rules, refetch: refetchList, isLoading } = useRuleList();
  const selectedRule = rules?.find((rule) => rule.uuid === selectedUuid);
  const updateRuleMutation = useRuleUpdate();
  const deleteRuleMutation = useRuleDelete();

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedRule && !isCreating) {
      setEditName(selectedRule.name);
      setEditJson(selectedRule.json);
      setEditUuid(selectedRule.uuid);
    }
  }, [selectedRule, isCreating]);

  useEffect(() => {
    if (selectedUuid === null && rules && rules.length > 0 && !isCreating) {
      setSelectedUuid(rules[0].uuid);
    }
  }, [rules, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first rule if available
      if (rules && rules.length > 0) {
        setSelectedUuid(rules[0].uuid);
      }
    }
  }, [isCreating, rules]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewRule = () => {
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
        // Create new rule
        await createRule({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Rule created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created rule
        setSelectedUuid(editUuid);
      } else {
        // Update existing rule
        if (!selectedUuid) return;
        await updateRuleMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Rule updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating ? "Failed to create rule" : "Failed to update rule",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteRuleMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Rule deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete rule");
    }
  };

  return (
    <AppPage
      title="Rule Configuration"
      description="Design and manage routing rules for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewRule}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Rule
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !rules || rules.length === 0 ? (
        <EmptyState
          title="No rules configured"
          description="Start building your network configuration by creating your first rule. Define routing rules, filters, and policies."
          actionLabel="Create Your First Rule"
          onAction={handleNewRule}
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
              {rules.map((rule, index) => {
                return (
                  <ConfigCard
                    key={rule.uuid}
                    name={rule.name}
                    jsonPreview={rule.json}
                    onClick={() => {
                      setSelectedUuid(rule.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={rule.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no rules */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedRule?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateRuleMutation.isPending}
        isDeleting={deleteRuleMutation.isPending}
        entityType="Rule"
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogChange={setDeleteDialogOpen}
      />
    </AppPage>
  );
}
