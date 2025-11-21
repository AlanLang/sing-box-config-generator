import { useLogDelete } from "@/api/log/delete";
import { useLogList } from "@/api/log/list";
import { useLogUpdate } from "@/api/log/update";
import { AppPage } from "@/components/app-page";
import { JsonEditor } from "@/components/json-editor";
import { SelectableItem } from "@/components/selectable-item";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  IconDeviceFloppy,
  IconFolders,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogAdd } from "./components/log-add";

export const Route = createFileRoute("/log/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);

  const { data: logs, refetch: refetchList } = useLogList();
  const selectedLog = logs?.find((log) => log.uuid === selectedUuid);
  const updateLogMutation = useLogUpdate();
  const deleteLogMutation = useLogDelete();

  const [editName, setEditName] = useState("");
  const [editJson, setEditJson] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (selectedLog) {
      setEditName(selectedLog.name);
      setEditJson(selectedLog.json);
    }
  }, [selectedLog]);

  useEffect(() => {
    if (selectedUuid === null && logs && logs.length > 0) {
      setSelectedUuid(logs[0].uuid);
    }
  }, [logs, selectedUuid]);

  const handleSave = async () => {
    if (!selectedUuid || !editJson) return;
    try {
      await updateLogMutation.mutateAsync({
        uuid: selectedUuid,
        name: editName,
        json: editJson,
      });
      toast.success("Log updated successfully");
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update log");
    }
  };

  const handleDelete = async () => {
    if (!selectedUuid) return;
    try {
      await deleteLogMutation.mutateAsync({
        uuid: selectedUuid,
      });
      toast.success("Log deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedUuid(null);
      refetchList();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete log");
    }
  };

  return (
    <AppPage
      title="Log"
      actions={
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button className="size-8">
              <IconPlus />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full min-h-[90vh] max-h-[90vh]">
            <LogAdd
              onSuccess={() => {
                setOpen(false);
                refetchList();
              }}
            />
          </DrawerContent>
        </Drawer>
      }
    >
      <div className="h-[calc(100vh-120px)] border rounded-lg overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20}>
            {logs?.map((log) => (
              <SelectableItem
                key={log.uuid}
                isActive={selectedUuid === log.uuid}
                onClick={() => setSelectedUuid(log.uuid)}
              >
                <div className="flex flex-col gap-1">
                  <div className="font-medium truncate">{log.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {log.uuid}
                  </div>
                </div>
              </SelectableItem>
            ))}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={75}>
            {selectedUuid ? (
              <div className="h-full flex flex-col gap-2">
                <div className="flex items-center p-4 gap-6">
                  <Input
                    id="name"
                    placeholder="Please enter you dns name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <ButtonGroup>
                    <Dialog
                      open={deleteDialogOpen}
                      onOpenChange={setDeleteDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <IconTrash className="" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Log</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this log? This
                            action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteLogMutation.isPending}
                          >
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm">
                      <IconFolders />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={updateLogMutation.isPending}
                    >
                      <IconDeviceFloppy />
                      Save
                    </Button>
                  </ButtonGroup>
                </div>
                <JsonEditor
                  className="p-0 mb-2"
                  value={formatJson(
                    logs?.find((log) => log.uuid === selectedUuid)?.json ?? "",
                  )}
                  onChange={(value) => setEditJson(value)}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a log to view details
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
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
