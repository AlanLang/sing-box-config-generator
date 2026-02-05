import { useSubscribeDelete } from "@/api/subscribe/delete";
import { useSubscribeList } from "@/api/subscribe/list";
import { useSubscribeUpdate } from "@/api/subscribe/update";
import { useSubscribeRefresh } from "@/api/subscribe/refresh";
import { createSubscribe } from "@/api/subscribe/create";
import { AppPage } from "@/components/app-page";
import { ConfigCard } from "@/components/config-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonGrid } from "@/components/skeleton-grid";
import { SubscribeEditor } from "@/components/subscribe-editor";
import { Button } from "@/components/ui/button";
import {
  IconCubePlus,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import {
  parseSubscriptionJson,
  stringifySubscriptionJson,
} from "@/types/subscribe";
import type { SubscriptionMetadata } from "@/types/subscribe";
import { formatTimeAgo } from "@/lib/time";

export const Route = createFileRoute("/subscribe/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: subscribes,
    refetch: refetchList,
    isLoading,
  } = useSubscribeList();
  const selectedSubscribe = subscribes?.find(
    (subscribe) => subscribe.uuid === selectedUuid,
  );
  const updateSubscribeMutation = useSubscribeUpdate();
  const deleteSubscribeMutation = useSubscribeDelete();
  const refreshSubscribeMutation = useSubscribeRefresh();

  const [editName, setEditName] = useState("");
  const [editMetadata, setEditMetadata] = useState<SubscriptionMetadata>({
    subscription_url: "",
    website_url: "",
    content: "",
    last_updated: null,
  });
  const [editUuid, setEditUuid] = useState("");

  useEffect(() => {
    if (selectedSubscribe && !isCreating) {
      setEditName(selectedSubscribe.name);
      const metadata = parseSubscriptionJson(selectedSubscribe.json);
      setEditMetadata(metadata);
      setEditUuid(selectedSubscribe.uuid);
    }
  }, [selectedSubscribe, isCreating]);

  useEffect(() => {
    if (
      selectedUuid === null &&
      subscribes &&
      subscribes.length > 0 &&
      !isCreating
    ) {
      setSelectedUuid(subscribes[0].uuid);
    }
  }, [subscribes, selectedUuid, isCreating]);

  // ESC to exit focus mode
  const handleExitFocus = useCallback(() => {
    setFocusMode(false);
    if (isCreating) {
      setIsCreating(false);
      // Reset to first subscribe if available
      if (subscribes && subscribes.length > 0) {
        setSelectedUuid(subscribes[0].uuid);
      }
    }
  }, [isCreating, subscribes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode) {
        handleExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleExitFocus]);

  const handleNewSubscribe = () => {
    setIsCreating(true);
    setSelectedUuid(null);
    setEditName("");
    setEditMetadata({
      subscription_url: "",
      website_url: "",
      content: "",
      last_updated: null,
    });
    setEditUuid(uuidv4());
    setFocusMode(true);
  };

  const validateUrl = (url: string) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!editMetadata.subscription_url) {
      toast.error("Subscription URL is required");
      return;
    }

    if (!validateUrl(editMetadata.subscription_url)) {
      toast.error("Invalid subscription URL");
      return;
    }

    if (editMetadata.website_url && !validateUrl(editMetadata.website_url)) {
      toast.error("Invalid website URL");
      return;
    }

    const jsonString = stringifySubscriptionJson(editMetadata);

    try {
      if (isCreating) {
        // Create new subscribe
        await createSubscribe({
          uuid: editUuid,
          name: editName,
          json: jsonString,
        });
        toast.success("Subscribe created successfully");
        setIsCreating(false);
        await refetchList();
        // Switch to the newly created subscribe
        setSelectedUuid(editUuid);
      } else {
        // Update existing subscribe
        if (!selectedUuid) return;
        await updateSubscribeMutation.mutateAsync({
          uuid: selectedUuid,
          name: editName,
          json: jsonString,
        });
        toast.success("Subscribe updated successfully");
        await refetchList();
      }
    } catch (error) {
      console.error(error);
      toast.error(
        isCreating
          ? "Failed to create subscribe"
          : "Failed to update subscribe",
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteSubscribeMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Subscribe deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      setFocusMode(false);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete subscribe");
    }
  };

  const handleRefresh = async (uuid: string) => {
    try {
      await refreshSubscribeMutation.mutateAsync({
        uuid: uuid,
      });
      toast.success("Subscribe refreshed successfully");
      await refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh subscribe");
    }
  };

  const handleRefreshInEditor = async () => {
    if (!selectedUuid) return;
    await handleRefresh(selectedUuid);
    // Update local state with new data
    if (selectedSubscribe) {
      const updated = subscribes?.find((s) => s.uuid === selectedUuid);
      if (updated) {
        const metadata = parseSubscriptionJson(updated.json);
        setEditMetadata(metadata);
      }
    }
  };

  return (
    <AppPage
      title="Subscribe Configuration"
      description="Manage subscription links to fetch and update configurations from your providers"
      actions={
        <Button
          size="sm"
          onClick={handleNewSubscribe}
          className="gap-2 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <IconCubePlus className="size-4" />
          New Subscribe
        </Button>
      }
    >
      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : /* Empty State */
      !subscribes || subscribes.length === 0 ? (
        <EmptyState
          title="No subscriptions configured"
          description="Add your first subscription link to start managing configurations from your providers."
          actionLabel="Create Your First Subscribe"
          onAction={handleNewSubscribe}
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
              {subscribes.map((subscribe, index) => {
                const metadata = parseSubscriptionJson(subscribe.json);
                const timeAgo = formatTimeAgo(metadata.last_updated);
                return (
                  <ConfigCard
                    key={subscribe.uuid}
                    name={subscribe.name}
                    jsonPreview={`URL: ${metadata.subscription_url}\n${metadata.last_updated ? `Updated: ${timeAgo}` : "Not fetched yet"}`}
                    onClick={() => {
                      setSelectedUuid(subscribe.uuid);
                      setIsCreating(false);
                      setFocusMode(true);
                    }}
                    index={index}
                    uuid={subscribe.uuid}
                    actions={
                      <>
                        {metadata.website_url && (
                          <a
                            href={metadata.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-primary/70 hover:text-primary transition-all duration-150"
                            title="Visit website"
                          >
                            <IconExternalLink className="size-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefresh(subscribe.uuid);
                          }}
                          disabled={refreshSubscribeMutation.isPending}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-primary/70 hover:text-primary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh subscription"
                        >
                          <IconRefresh
                            className={`size-4 ${refreshSubscribeMutation.isPending ? "animate-spin" : ""}`}
                          />
                        </button>
                      </>
                    }
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Subscribe Editor - Outside conditional to fix empty state creation bug */}
      <SubscribeEditor
        isOpen={focusMode}
        isCreating={isCreating}
        name={editName}
        onNameChange={setEditName}
        subscriptionUrl={editMetadata.subscription_url}
        onSubscriptionUrlChange={(url) =>
          setEditMetadata({ ...editMetadata, subscription_url: url })
        }
        websiteUrl={editMetadata.website_url || ""}
        onWebsiteUrlChange={(url) =>
          setEditMetadata({ ...editMetadata, website_url: url })
        }
        content={editMetadata.content}
        lastUpdated={editMetadata.last_updated}
        uuid={isCreating ? editUuid : selectedSubscribe?.uuid || ""}
        onClose={handleExitFocus}
        onSave={handleSave}
        onDelete={handleDelete}
        onRefresh={handleRefreshInEditor}
        isSaving={updateSubscribeMutation.isPending}
        isDeleting={deleteSubscribeMutation.isPending}
        isRefreshing={refreshSubscribeMutation.isPending}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogChange={setDeleteDialogOpen}
      />
    </AppPage>
  );
}
