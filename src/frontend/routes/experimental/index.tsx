import { useExperimentalDelete } from "@/api/experimental/delete";
import { useExperimentalList } from "@/api/experimental/list";
import { useExperimentalUpdate } from "@/api/experimental/update";
import { createExperimental } from "@/api/experimental/create";
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

export const Route = createFileRoute("/experimental/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: experimentals,
    refetch: refetchList,
    isLoading,
  } = useExperimentalList();
  const selectedExperimental = experimentals?.find(
    (experimental) => experimental.uuid === selectedUuid,
  );
  const updateExperimentalMutation = useExperimentalUpdate();
  const deleteExperimentalMutation = useExperimentalDelete();

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedExperimental && !isCreating) {
      setEditName(selectedExperimental.name);
      setEditJson(selectedExperimental.json);
      setEditUuid(selectedExperimental.uuid);
    }
  }, [selectedExperimental, isCreating]);

  useEffect(() => {
    if (
      selectedUuid === null &&
      experimentals &&
      experimentals.length > 0 &&
      !isCreating
    ) {
      setSelectedUuid(experimentals[0].uuid);
    }
  }, [experimentals, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first experimental if available
      if (experimentals && experimentals.length > 0) {
        setSelectedUuid(experimentals[0].uuid);
      }
    }
  }, [isCreating, experimentals]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewExperimental = () => {
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
        // Create new experimental
        await createExperimental({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Experimental created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created experimental
        setSelectedUuid(editUuid);
      } else {
        // Update existing experimental
        if (!selectedUuid) return;
        await updateExperimentalMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Experimental updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating
            ? "Failed to create experimental"
            : "Failed to update experimental",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteExperimentalMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Experimental deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete experimental");
    }
  };

  return (
    <AppPage
      title="Experimental Configuration"
      description="Configure experimental features and advanced settings for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewExperimental}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Experimental
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !experimentals || experimentals.length === 0 ? (
        <EmptyState
          title="No experimental features configured"
          description="Start exploring advanced features by creating your first experimental configuration. Test cutting-edge functionality and settings."
          actionLabel="Create Your First Experimental"
          onAction={handleNewExperimental}
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
              {experimentals.map((experimental, index) => (
                <ConfigCard
                  key={experimental.uuid}
                  name={experimental.name}
                  jsonPreview={`${formatJson(experimental.json).substring(0, 150)}...`}
                  onClick={() => {
                    setSelectedUuid(experimental.uuid);
                    setIsCreating(false);
                    setFocusMode(true);
                  }}
                  index={index}
                  uuid={experimental.uuid}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional to fix empty state creation bug */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedExperimental?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateExperimentalMutation.isPending}
        isDeleting={deleteExperimentalMutation.isPending}
        entityType="Experimental"
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogChange={setDeleteDialogOpen}
      />
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
