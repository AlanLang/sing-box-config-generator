import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconGripVertical,
  IconX,
  IconFilter,
  IconNetwork,
  IconBoxMultiple,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { OutboundOption } from "@/api/outbound-group/types";

// Icon mapping for different source types
const SOURCE_ICONS = {
  outbound: IconNetwork,
  filter: IconFilter,
  outbound_group: IconBoxMultiple,
} as const;

// Display labels for different source types
const SOURCE_LABELS = {
  outbound: "Outbounds",
  filter: "Filters",
  outbound_group: "Outbound Groups",
} as const;

interface SortableMultiSelectProps {
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  options: OutboundOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function SortableMultiSelect({
  selected,
  onSelectedChange,
  options,
  placeholder = "No items selected",
  disabled = false,
}: SortableMultiSelectProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selected.indexOf(active.id as string);
      const newIndex = selected.indexOf(over.id as string);
      onSelectedChange(arrayMove(selected, oldIndex, newIndex));
    }
  };

  const handleRemove = (uuid: string) => {
    onSelectedChange(selected.filter((v) => v !== uuid));
  };

  const handleAdd = (uuid: string) => {
    if (!selected.includes(uuid)) {
      onSelectedChange([...selected, uuid]);
    }
  };

  const selectedOptions = selected
    .map((uuid) => options.find((opt) => opt.uuid === uuid))
    .filter(Boolean) as OutboundOption[];

  const availableOptions = options.filter((opt) => !selected.includes(opt.uuid));

  return (
    <div className="space-y-3">
      {selected.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          {placeholder}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={selected} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {selectedOptions.map((option) => (
                <SortableItem
                  key={option.uuid}
                  id={option.uuid}
                  option={option}
                  onRemove={handleRemove}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddItemDropdown
        options={availableOptions}
        onAdd={handleAdd}
        disabled={disabled}
      />
    </div>
  );
}

interface SortableItemProps {
  id: string;
  option: OutboundOption;
  onRemove: (value: string) => void;
  disabled?: boolean;
}

function SortableItem({ id, option, onRemove, disabled }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const SourceIcon = SOURCE_ICONS[option.source] || IconNetwork;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 border rounded-lg bg-background",
        isDragging && "opacity-50 shadow-lg",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <button
        type="button"
        className={cn(
          "touch-none cursor-grab active:cursor-grabbing shrink-0 p-1",
          "hover:bg-accent rounded transition-colors",
          "min-h-[44px] min-w-[44px] flex items-center justify-center",
          disabled && "cursor-not-allowed",
        )}
        {...attributes}
        {...listeners}
        disabled={disabled}
      >
        <IconGripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <SourceIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium truncate text-sm sm:text-base">{option.label}</span>
        {option.type && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
            {option.type}
          </span>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 min-h-[44px] min-w-[44px]"
        onClick={() => onRemove(id)}
        disabled={disabled}
      >
        <IconX className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface AddItemDropdownProps {
  options: OutboundOption[];
  onAdd: (uuid: string) => void;
  disabled?: boolean;
}

function AddItemDropdown({ options, onAdd, disabled }: AddItemDropdownProps) {
  // Group options by source dynamically
  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.source]) {
      acc[option.source] = [];
    }
    acc[option.source].push(option);
    return acc;
  }, {} as Record<string, OutboundOption[]>);

  // Get sorted source types for consistent ordering
  const sourceTypes = Object.keys(groupedOptions).sort();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px]"
          disabled={disabled || options.length === 0}
        >
          {options.length === 0 ? "No more items available" : "Add Outbound"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {sourceTypes.map((source, index) => {
          const sourceOptions = groupedOptions[source];
          const SourceIcon = SOURCE_ICONS[source as keyof typeof SOURCE_ICONS] || IconNetwork;
          const label = SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] || source;

          return (
            <div key={source}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{label}</DropdownMenuLabel>
                {sourceOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.uuid}
                    onClick={() => onAdd(option.uuid)}
                    className="flex items-center gap-2"
                  >
                    <SourceIcon className="h-4 w-4" />
                    <span className="flex-1">{option.label}</span>
                    {option.type && (
                      <span className="text-xs text-muted-foreground">{option.type}</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
