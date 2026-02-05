import { createDns } from "@/api/dns/create";
import { useDnsDelete } from "@/api/dns/delete";
import { useDnsList } from "@/api/dns/list";
import { useDnsUpdate } from "@/api/dns/update";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { FocusEditor } from "@/components/focus-editor";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { Button } from "@/components/ui/button";
import { IconCubePlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/dns-server/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: dnsList, refetch: refetchList, isLoading } = useDnsList();
  const selectedDns = dnsList?.find((dns) => dns.uuid === selectedUuid);
  const updateDnsMutation = useDnsUpdate();
  const deleteDnsMutation = useDnsDelete();

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedDns && !isCreating) {
      setEditName(selectedDns.name);
      setEditJson(selectedDns.json);
      setEditUuid(selectedDns.uuid);
    }
  }, [selectedDns, isCreating]);

  useEffect(() => {
    if (selectedUuid === null && dnsList && dnsList.length > 0 && !isCreating) {
      setSelectedUuid(dnsList[0].uuid);
    }
  }, [dnsList, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first dns if available
      if (dnsList && dnsList.length > 0) {
        setSelectedUuid(dnsList[0].uuid);
      }
    }
  }, [isCreating, dnsList]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewDns = () => {
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
        // Create new dns
        await createDns({
          uuid: editUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Dns created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created dns
        setSelectedUuid(editUuid);
      } else {
        // Update existing dns
        if (!selectedUuid) return;
        await updateDnsMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: editJson,
        });
        toast.success("Dns updated successfully");
        await refetchList();
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        console.error(error);
        toast.error(
          isCreating ? "Failed to create dns" : "Failed to update dns",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteDnsMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Dns deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete dns");
    }
  };

  return (
    <AppPage
      title="DNS Server"
      description="Design and manage DNS server rules for your sing-box infrastructure"
      actions={
        <Button
          size="sm"
          onClick={handleNewDns}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New DNS Server
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !dnsList || dnsList.length === 0 ? (
        <EmptyState
          title="No DNS Server configured"
          description="Start building your network configuration by creating your first DNS Server. Define DNS rules, servers, and policies."
          actionLabel="Create Your First DNS Server"
          onAction={handleNewDns}
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
              {dnsList.map((dns, index) => {
                return (
                  <ConfigCard
                    key={dns.uuid}
                    name={dns.name}
                    jsonPreview={dns.json}
                    onClick={() => {
                      setSelectedUuid(dns.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={dns.uuid}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Focus Mode Editor - Outside conditional so it works even when no dns */}
      <FocusEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        json={editJson}
        onJsonChange={setEditJson}
        uuid={isCreating ? editUuid : selectedDns?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateDnsMutation.isPending}
        isDeleting={deleteDnsMutation.isPending}
        entityType="DNS Server"
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogChange={setDeleteDialogOpen}
      />
    </AppPage>
  );
}
