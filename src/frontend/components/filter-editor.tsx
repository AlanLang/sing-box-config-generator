import { FormEditor } from "@/components/form-editor";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface FilterEditorProps {
  isOpen: boolean;
  isCreating: boolean;
  name: string;
  onNameChange: (name: string) => void;
  filterType: "simple" | "regex";
  onFilterTypeChange: (type: "simple" | "regex") => void;
  pattern: string;
  onPatternChange: (pattern: string) => void;
  uuid: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  isDeleting?: boolean;
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
}

/**
 * Filter-specific editor component using FormEditor pattern.
 *
 * Provides a full-screen focus mode for editing filter configurations
 * with form-based UI instead of JSON editor.
 */
export function FilterEditor({
  isOpen,
  isCreating,
  name,
  onNameChange,
  filterType,
  onFilterTypeChange,
  pattern,
  onPatternChange,
  uuid,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  deleteDialogOpen,
  onDeleteDialogChange,
}: FilterEditorProps) {
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
      entityType="Filter"
      deleteDialogOpen={deleteDialogOpen}
      onDeleteDialogChange={onDeleteDialogChange}
      footerContent={
        <span>
          {filterType === "simple"
            ? "Simple pattern (use | to separate)"
            : "Regular expression"}
        </span>
      }
    >
      {/* Form Fields */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="space-y-2">
          <Label htmlFor="filter-type">Filter Type</Label>
          <Select value={filterType} onValueChange={onFilterTypeChange}>
            <SelectTrigger id="filter-type" className="dark:bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple (use | to separate)</SelectItem>
              <SelectItem value="regex">Regular Expression</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {filterType === "simple"
              ? "Simple pattern: use | to separate multiple keywords (e.g., 港|香港|HK)"
              : "Regular expression: use regex syntax to match outbound names"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pattern">Pattern</Label>
          <Textarea
            id="pattern"
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            placeholder={filterType === "simple" ? "港|香港|HK" : "^(香港|HK).*"}
            className="font-mono text-sm min-h-[200px] dark:bg-background"
          />
          <p className="text-sm text-muted-foreground">
            {filterType === "simple"
              ? "Enter keywords separated by | character"
              : "Enter a valid regular expression pattern"}
          </p>
        </div>
      </div>
    </FormEditor>
  );
}
