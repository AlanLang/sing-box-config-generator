import { FormEditor } from "./form-editor";
import { SortableMultiSelect } from "./sortable-multi-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useOutboundGroupOptions } from "@/api/outbound-group/options";
import type { GroupType } from "@/api/outbound-group/types";

interface OutboundGroupEditorProps {
  isOpen: boolean;
  isCreating: boolean;
  name: string;
  onNameChange: (value: string) => void;
  groupType: GroupType;
  onGroupTypeChange: (value: GroupType) => void;
  outbounds: string[];
  onOutboundsChange: (value: string[]) => void;
  defaultOutbound: string;
  onDefaultOutboundChange: (value: string) => void;
  url: string;
  onUrlChange: (value: string) => void;
  interval: string;
  onIntervalChange: (value: string) => void;
  tolerance: number;
  onToleranceChange: (value: number) => void;
  idleTimeout: string;
  onIdleTimeoutChange: (value: string) => void;
  interruptExisting: boolean;
  onInterruptExistingChange: (value: boolean) => void;
  uuid: string;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
}

export function OutboundGroupEditor({
  isOpen,
  isCreating,
  name,
  onNameChange,
  groupType,
  onGroupTypeChange,
  outbounds,
  onOutboundsChange,
  defaultOutbound,
  onDefaultOutboundChange,
  url,
  onUrlChange,
  interval,
  onIntervalChange,
  tolerance,
  onToleranceChange,
  idleTimeout,
  onIdleTimeoutChange,
  interruptExisting,
  onInterruptExistingChange,
  uuid,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  deleteDialogOpen,
  onDeleteDialogChange,
}: OutboundGroupEditorProps) {
  const { data: options } = useOutboundGroupOptions();

  return (
    <FormEditor
      isOpen={isOpen}
      isCreating={isCreating}
      name={name}
      onNameChange={onNameChange}
      uuid={uuid}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      isSaving={isSaving}
      isDeleting={isDeleting}
      entityType="Outbound Group"
      deleteDialogOpen={deleteDialogOpen}
      onDeleteDialogChange={onDeleteDialogChange}
      footerContent={
        <span className="text-sm text-muted-foreground">
          {groupType === "selector" ? "Selector" : "URL Test"} Group
        </span>
      }
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Group Type */}
        <div className="space-y-2">
          <Label htmlFor="group-type">Group Type</Label>
          <Select value={groupType} onValueChange={onGroupTypeChange}>
            <SelectTrigger id="group-type" className="dark:bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="selector">Selector</SelectItem>
              <SelectItem value="urltest">URL Test</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Name field will be used as the tag in sing-box configuration
          </p>
        </div>

        {/* Outbounds */}
        <div className="space-y-2">
          <Label>Outbounds</Label>
          <SortableMultiSelect
            selected={outbounds}
            onSelectedChange={onOutboundsChange}
            options={options || []}
            placeholder="No outbounds selected. Click 'Add Outbound' to get started."
          />
          <p className="text-sm text-muted-foreground">
            {groupType === "selector"
              ? "Select at least 1 outbound for selector group"
              : "Select at least 2 outbounds for URL test group"}
          </p>
        </div>

        {/* Conditional Fields */}
        {groupType === "selector" ? (
          <div className="space-y-2">
            <Label htmlFor="default">Default Outbound</Label>
            <Select
              value={defaultOutbound}
              onValueChange={onDefaultOutboundChange}
              disabled={outbounds.length === 0}
            >
              <SelectTrigger id="default" className="dark:bg-background">
                <SelectValue placeholder="Select default outbound" />
              </SelectTrigger>
              <SelectContent>
                {outbounds.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The default outbound to use when no manual selection is made
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="url">Test URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://www.gstatic.com/generate_204"
                className="dark:bg-background"
              />
              <p className="text-sm text-muted-foreground">
                URL to test for connectivity checks
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Test Interval</Label>
              <Input
                id="interval"
                value={interval}
                onChange={(e) => onIntervalChange(e.target.value)}
                placeholder="3m"
                className="dark:bg-background"
              />
              <p className="text-sm text-muted-foreground">
                How often to test (e.g., 3m, 30s, 1h)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolerance">Tolerance (ms)</Label>
              <Input
                id="tolerance"
                type="number"
                value={tolerance}
                onChange={(e) => onToleranceChange(Number(e.target.value))}
                placeholder="50"
                className="dark:bg-background"
              />
              <p className="text-sm text-muted-foreground">
                Acceptable latency difference before switching outbounds
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idle-timeout">Idle Timeout</Label>
              <Input
                id="idle-timeout"
                value={idleTimeout}
                onChange={(e) => onIdleTimeoutChange(e.target.value)}
                placeholder="30m"
                className="dark:bg-background"
              />
              <p className="text-sm text-muted-foreground">
                Time before switching to a faster outbound (e.g., 30m, 1h)
              </p>
            </div>
          </>
        )}

        {/* Interrupt Existing Connections */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="interrupt"
            checked={interruptExisting}
            onCheckedChange={(checked) =>
              onInterruptExistingChange(checked === true)
            }
          />
          <Label htmlFor="interrupt" className="cursor-pointer">
            Interrupt existing connections when switching outbounds
          </Label>
        </div>
      </div>
    </FormEditor>
  );
}
