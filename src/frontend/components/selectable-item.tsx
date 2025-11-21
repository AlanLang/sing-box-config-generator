import { Slot } from "@radix-ui/react-slot";

interface SelectableItemProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function SelectableItem({ isActive, onClick, children }: SelectableItemProps) {
  return <Slot
    className="p-4 active:bg-accent cursor-pointer data-[active=true]:bg-accent hover:bg-accent/50"
    data-active={isActive}
    onClick={onClick}
  >
    {children}
  </Slot>
}