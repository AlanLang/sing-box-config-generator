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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

interface SortableGridProps<T extends { uuid: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    dragHandleProps: ReturnType<typeof useSortable>["listeners"],
  ) => ReactNode;
}

export function SortableGrid<T extends { uuid: string }>({
  items,
  onReorder,
  renderItem,
}: SortableGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.uuid === active.id);
      const newIndex = items.findIndex((item) => item.uuid === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.uuid)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item, index) => (
            <SortableItem key={item.uuid} id={item.uuid}>
              {(dragHandleProps) => renderItem(item, index, dragHandleProps)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableItemProps {
  id: string;
  children: (
    dragHandleProps: ReturnType<typeof useSortable>["listeners"],
  ) => ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    // Remove transition to eliminate rubber band effect on drop
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
}
