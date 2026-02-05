import { useRulesetDelete } from "@/api/ruleset/delete";
import { useRulesetList } from "@/api/ruleset/list";
import { useRulesetUpdate } from "@/api/ruleset/update";
import { createRuleset } from "@/api/ruleset/create";
import { AppPage } from "@/components/app-page";
import { JsonEditor } from "@/components/json-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconCubePlus,
  IconDeviceFloppy,
  IconTrash,
  IconChevronRight,
  IconCode,
  IconX,
} from "@tabler/icons-react";
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
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: rulesets, refetch: refetchList } = useRulesetList();
  const selectedRuleset = rulesets?.find(
    (ruleset) => ruleset.uuid === selectedUuid,
  );
  const updateRulesetMutation = useRulesetUpdate();
  const deleteRulesetMutation = useRulesetDelete();

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
      {/* Empty State */}
      {!rulesets || rulesets.length === 0 ? (
        <div className="h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center max-w-lg space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl rounded-full" />
              <div className="relative bg-gradient-to-br from-background to-muted border-2 border-border/50 rounded-3xl p-12">
                <IconCode
                  className="size-20 mx-auto text-muted-foreground opacity-40"
                  strokeWidth={1.5}
                />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold tracking-tight">
                No rulesets configured
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                Start building your network configuration by creating your first
                ruleset. Define routing rules, filters, and policies.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleNewRuleset}
              className="gap-2 relative overflow-hidden group mt-4"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <IconCubePlus className="size-5" />
              Create Your First Ruleset
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Grid View */}
          <AnimatePresence mode="wait">
            {!focusMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6"
              >
                {rulesets.map((ruleset, index) => (
                  <motion.div
                    key={ruleset.uuid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <motion.button
                      layoutId={`card-${ruleset.uuid}`}
                      type="button"
                      className="relative h-48 rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-md shadow-black/5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-150 cursor-pointer overflow-hidden w-full text-left group"
                      onClick={() => {
                        setSelectedUuid(ruleset.uuid);
                        setIsCreating(false);
                        setFocusMode(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedUuid(ruleset.uuid);
                          setIsCreating(false);
                          setFocusMode(true);
                        }
                      }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Single gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

                      {/* Top corner accent */}
                      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary/60 transition-all duration-150 shadow-sm shadow-primary/20" />

                      {/* Subtle pattern overlay */}
                      <div
                        className="absolute inset-0 opacity-[0.015] group-hover:opacity-[0.03] transition-opacity duration-150"
                        style={{
                          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)`,
                          backgroundSize: "24px 24px",
                        }}
                      />

                      {/* Card Header */}
                      <div className="relative p-4 border-b border-border/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Icon indicator */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-all duration-150">
                              <IconCode className="size-4 text-primary/60 group-hover:text-primary transition-all duration-150" />
                            </div>
                            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-all duration-150">
                              {ruleset.name}
                            </h3>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150">
                            <IconChevronRight className="size-5 text-primary" />
                          </div>
                        </div>
                      </div>

                      {/* Card Content Preview */}
                      <div className="relative p-3 flex-1 overflow-hidden">
                        {/* Code block container with editor styling */}
                        <div className="h-full rounded-lg bg-muted/40 group-hover:bg-muted/50 transition-all duration-150 border border-border/30 overflow-hidden flex flex-col">
                          {/* Editor header bar */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30 bg-muted/30 flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                            <span className="ml-1.5 text-[9px] text-muted-foreground/60 font-medium">
                              config.json
                            </span>
                          </div>

                          {/* Code content */}
                          <div className="relative flex-1 p-2.5 overflow-hidden">
                            <pre className="text-[11px] font-mono text-muted-foreground/70 group-hover:text-muted-foreground/90 leading-relaxed transition-all duration-150">
                              {formatJson(ruleset.json).substring(0, 150)}...
                            </pre>
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-muted/40 group-hover:from-muted/50 to-transparent pointer-events-none transition-colors duration-150" />
                          </div>
                        </div>
                      </div>

                      {/* Bottom edge accent */}
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/50 to-transparent transition-all duration-150" />
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Focus Mode Editor */}
          <AnimatePresence>
            {focusMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
              >
                <motion.div
                  layoutId={
                    selectedUuid && !isCreating
                      ? `card-${selectedUuid}`
                      : undefined
                  }
                  initial={isCreating ? { scale: 0.9, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 },
                  }}
                  className="h-full flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl"
                >
                  {/* Header Bar */}
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="border-b bg-background/50 backdrop-blur-xl"
                  >
                    <div className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleExitFocus}
                              className="gap-2"
                            >
                              <IconX className="size-4" />
                              <span className="hidden sm:inline">
                                {isCreating ? "Cancel" : "Exit Focus"}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isCreating
                              ? "Cancel creation (Esc)"
                              : "Exit focus mode (Esc)"}
                          </TooltipContent>
                        </Tooltip>

                        <div className="h-6 w-px bg-border" />

                        <div className="flex items-center gap-3">
                          {isCreating && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 25,
                              }}
                              className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                            >
                              New
                            </motion.span>
                          )}
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="max-w-md text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-2"
                            placeholder="Ruleset name..."
                          />
                        </div>
                      </div>

                      <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center gap-2"
                      >
                        {!isCreating && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Dialog
                                open={deleteDialogOpen}
                                onOpenChange={setDeleteDialogOpen}
                              >
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <IconTrash className="size-4 text-destructive" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Ruleset</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete "
                                      {editName}
                                      "? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button
                                      variant="destructive"
                                      onClick={handleDelete}
                                      disabled={deleteRulesetMutation.isPending}
                                    >
                                      {deleteRulesetMutation.isPending
                                        ? "Deleting..."
                                        : "Delete"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TooltipTrigger>
                            <TooltipContent>Delete ruleset</TooltipContent>
                          </Tooltip>
                        )}

                        <Button
                          onClick={handleSave}
                          disabled={
                            updateRulesetMutation.isPending || !editName.trim()
                          }
                          size="sm"
                          className="gap-2"
                        >
                          <IconDeviceFloppy className="size-4" />
                          {isCreating
                            ? "Create Ruleset"
                            : updateRulesetMutation.isPending
                              ? "Saving..."
                              : "Save Changes"}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Editor Area */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 relative"
                  >
                    <JsonEditor
                      className="h-full"
                      value={editJson}
                      onChange={(value) => setEditJson(value)}
                    />
                  </motion.div>

                  {/* Footer Info */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="border-t bg-background/50 backdrop-blur-xl px-6 py-3 flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono">
                        {isCreating ? editUuid : selectedRuleset?.uuid}
                      </span>
                      <span>•</span>
                      <span>JSON Configuration</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>{editJson?.split("\n").length || 0} lines</span>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
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
