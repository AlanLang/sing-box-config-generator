import { createFilter } from "@/api/filter/create";
import { useFilterDelete } from "@/api/filter/delete";
import { useFilterList } from "@/api/filter/list";
import { useFilterUpdate } from "@/api/filter/update";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { FilterEditor } from "@/components/filter-editor";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { Button } from "@/components/ui/button";
import { IconFilter } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/subscribe/filter/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: filters, refetch: refetchList, isLoading } = useFilterList();
  const selectedFilter = filters?.find(
    (filter) => filter.uuid === selectedUuid,
  );
  const updateFilterMutation = useFilterUpdate();
  const deleteFilterMutation = useFilterDelete();

  const [editName, setEditName] = useState("");
  const [editFilterType, setEditFilterType] = useState<"simple" | "regex">(
    "simple",
  );
  const [editPattern, setEditPattern] = useState("");
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedFilter && !isCreating) {
      setEditName(selectedFilter.name);
      setEditFilterType(selectedFilter.filter_type);
      setEditPattern(selectedFilter.pattern);
      setEditUuid(selectedFilter.uuid);
    }
  }, [selectedFilter, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first filter if available
      if (filters && filters.length > 0) {
        setSelectedUuid(filters[0].uuid);
      }
    }
  }, [isCreating, filters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewFilter = () => {
    setIsCreating(true);
    setSelectedUuid(null);
    setEditName("");
    setEditFilterType("simple");
    setEditPattern("");
    setEditUuid(uuidv4());
    setFocusMode(true);
  };

  const handleEditFilter = (uuid: string) => {
    setIsCreating(false);
    setSelectedUuid(uuid);
    setFocusMode(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (!editPattern.trim()) {
      toast.error("Pattern cannot be empty");
      return;
    }

    try {
      if (isCreating) {
        await createFilter({
          uuid: editUuid,
          name: editName,
          filter_type: editFilterType,
          pattern: editPattern,
        });
        toast.success("Filter created successfully");
        setIsCreating(false);
        await refetchList();
        setSelectedUuid(editUuid);
      } else {
        if (!selectedUuid) return;
        await updateFilterMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          filter_type: editFilterType,
          pattern: editPattern,
        });
        toast.success("Filter updated successfully");
        await refetchList();
      }
    } catch (error) {
      console.error(error);
      toast.error(
        isCreating ? "Failed to create filter" : "Failed to update filter",
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteFilterMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Filter deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete filter");
    }
  };

  return (
    <AppPage
      title="Filter Configuration"
      description="Create filters to match outbound names using simple patterns or regular expressions"
      actions={
        <Button
          size="sm"
          onClick={handleNewFilter}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconFilter className="size-4" />
          New Filter
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !filters || filters.length === 0 ? (
        <EmptyState
          title="No filters configured"
          description="Start filtering your outbound connections by creating your first filter. Use simple patterns (港|香港) or regular expressions."
          actionLabel="Create Your First Filter"
          onAction={handleNewFilter}
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
              {filters.map((filter, index) => {
                const preview = JSON.stringify(
                  {
                    type: filter.filter_type,
                    pattern:
                      filter.pattern.length > 50
                        ? `${filter.pattern.substring(0, 50)}...`
                        : filter.pattern,
                  },
                  null,
                  2,
                );
                return (
                  <ConfigCard
                    key={filter.uuid}
                    name={filter.name}
                    jsonPreview={preview}
                    onClick={() => handleEditFilter(filter.uuid)}
                    index={index}
                    uuid={filter.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Filter Editor - Outside conditional to fix empty state creation bug */}
      <FilterEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        filterType={editFilterType}
        onFilterTypeChange={(type) =>
          setEditFilterType(type as "simple" | "regex")
        }
        pattern={editPattern}
        onPatternChange={setEditPattern}
        uuid={isCreating ? editUuid : selectedFilter?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateFilterMutation.isPending}
        isDeleting={deleteFilterMutation.isPending}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogChange={setDeleteDialogOpen}
      />
    </AppPage>
  );
}
