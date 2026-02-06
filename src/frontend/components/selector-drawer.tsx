import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import { useMemo, useState } from "react";

export interface SelectorDrawerItem {
	value: string;
	title: string;
	description?: string;
	group?: string;
	disabled?: boolean;
	disabledLabel?: string;
}

// ─── Shared internal components ───

function ItemButton({
	item,
	selected,
	onClick,
}: {
	item: { title: string; description?: string; disabled?: boolean; disabledLabel?: string };
	selected: boolean;
	onClick: () => void;
}) {
	const isDisabled = item.disabled;
	return (
		<button
			type="button"
			onClick={isDisabled ? undefined : onClick}
			className={`
				w-full text-left rounded-lg border-2 p-3 transition-all
				${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
				${selected
					? "border-primary bg-primary/5"
					: isDisabled
						? "border-border"
						: "border-border hover:border-primary/50 hover:bg-muted/30"
				}
			`}
		>
			<div className="flex items-center gap-3">
				<div className="flex-1 min-w-0">
					<div className="font-medium text-sm">{item.title}</div>
					{item.description && (
						<div className="text-xs text-muted-foreground line-clamp-1 mt-1">
							{item.description}
						</div>
					)}
				</div>
				{isDisabled && item.disabledLabel && (
					<span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded shrink-0">
						{item.disabledLabel}
					</span>
				)}
				{selected && !isDisabled && (
					<IconCheck className="size-5 text-primary shrink-0" />
				)}
			</div>
		</button>
	);
}

function useGroupedItems(items: SelectorDrawerItem[]) {
	return useMemo(() => {
		const hasGroups = items.some((item) => item.group);
		if (!hasGroups) return null;

		const groupMap = new Map<string, SelectorDrawerItem[]>();
		for (const item of items) {
			const group = item.group || "";
			if (!groupMap.has(group)) {
				groupMap.set(group, []);
			}
			groupMap.get(group)?.push(item);
		}
		return groupMap;
	}, [items]);
}

function GroupedItemList({
	items,
	grouped,
	isSelected,
	onItemClick,
}: {
	items: SelectorDrawerItem[];
	grouped: Map<string, SelectorDrawerItem[]> | null;
	isSelected: (value: string) => boolean;
	onItemClick: (value: string) => void;
}) {
	if (grouped) {
		return Array.from(grouped.entries()).map(([group, groupItems]) => (
			<div key={group}>
				{group && (
					<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 pt-3 pb-1">
						{group}
					</div>
				)}
				<div className="space-y-2">
					{groupItems.map((item) => (
						<ItemButton
							key={item.value}
							item={item}
							selected={isSelected(item.value)}
							onClick={() => onItemClick(item.value)}
						/>
					))}
				</div>
			</div>
		));
	}

	return items.map((item) => (
		<ItemButton
			key={item.value}
			item={item}
			selected={isSelected(item.value)}
			onClick={() => onItemClick(item.value)}
		/>
	));
}

// ─── Single SelectorDrawer ───

interface SelectorDrawerProps {
	drawerTitle: string;
	drawerDescription?: string;
	placeholder?: string;
	items: SelectorDrawerItem[];
	value: string;
	onSelect: (value: string) => void;
	/** When provided, a "none" option appears at the top. Selecting it calls onSelect(""). */
	noneOption?: {
		title: string;
		description?: string;
	};
}

export function SelectorDrawer({
	drawerTitle,
	drawerDescription,
	placeholder = "Click to select...",
	items,
	value,
	onSelect,
	noneOption,
}: SelectorDrawerProps) {
	const [open, setOpen] = useState(false);
	const grouped = useGroupedItems(items);

	const isNoneSelected = noneOption && !value;
	const selectedItem = items.find((item) => item.value === value);
	const displayItem = selectedItem || (isNoneSelected ? { title: noneOption.title, description: noneOption.description } : null);

	const handleSelect = (val: string) => {
		onSelect(val);
		setOpen(false);
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={`
					w-full text-left rounded-lg border-2 p-3 transition-all cursor-pointer
					${displayItem
						? "border-primary/40 bg-primary/5 hover:border-primary/60"
						: "border-dashed border-border hover:border-primary/50 hover:bg-muted/30"
					}
				`}
			>
				{displayItem ? (
					<div className="flex items-center justify-between gap-2">
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">{displayItem.title}</div>
							{displayItem.description && (
								<div className="text-xs text-muted-foreground line-clamp-1 mt-1">
									{displayItem.description}
								</div>
							)}
						</div>
						<IconSelector className="size-4 text-muted-foreground shrink-0" />
					</div>
				) : (
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm text-muted-foreground">{placeholder}</span>
						<IconSelector className="size-4 text-muted-foreground shrink-0" />
					</div>
				)}
			</button>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{drawerTitle}</DrawerTitle>
						{drawerDescription && (
							<DrawerDescription>{drawerDescription}</DrawerDescription>
						)}
					</DrawerHeader>
					<div className="overflow-y-auto px-4 pb-6">
						<div className="space-y-2">
							{noneOption && (
								<ItemButton
									item={noneOption}
									selected={!value}
									onClick={() => handleSelect("")}
								/>
							)}
							<GroupedItemList
								items={items}
								grouped={grouped}
								isSelected={(v) => value === v}
								onItemClick={handleSelect}
							/>
						</div>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}

// ─── Multi SelectorDrawer ───

interface MultiSelectorDrawerProps {
	drawerTitle: string;
	drawerDescription?: string;
	placeholder?: string;
	items: SelectorDrawerItem[];
	value: string[];
	onChange: (value: string[]) => void;
}

export function MultiSelectorDrawer({
	drawerTitle,
	drawerDescription,
	placeholder = "Click to select...",
	items,
	value,
	onChange,
}: MultiSelectorDrawerProps) {
	const [open, setOpen] = useState(false);
	const grouped = useGroupedItems(items);

	const selectedItems = items.filter(
		(item) => value.includes(item.value) && !item.disabled,
	);

	const handleToggle = (itemValue: string) => {
		if (value.includes(itemValue)) {
			onChange(value.filter((v) => v !== itemValue));
		} else {
			onChange([...value, itemValue]);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={`
					w-full text-left rounded-lg border-2 p-3 transition-all cursor-pointer
					${selectedItems.length > 0
						? "border-primary/40 bg-primary/5 hover:border-primary/60"
						: "border-dashed border-border hover:border-primary/50 hover:bg-muted/30"
					}
				`}
			>
				{selectedItems.length > 0 ? (
					<div>
						<div className="flex items-center justify-between gap-2 mb-2">
							<span className="text-xs text-muted-foreground">
								{selectedItems.length} selected
							</span>
							<IconSelector className="size-4 text-muted-foreground shrink-0" />
						</div>
						<div className="space-y-2">
							{selectedItems.map((item) => (
								<div key={item.value} className="min-w-0">
									<div className="font-medium text-sm truncate">{item.title}</div>
									{item.description && (
										<div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
											{item.description}
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm text-muted-foreground">{placeholder}</span>
						<IconSelector className="size-4 text-muted-foreground shrink-0" />
					</div>
				)}
			</button>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{drawerTitle}</DrawerTitle>
						{drawerDescription && (
							<DrawerDescription>{drawerDescription}</DrawerDescription>
						)}
					</DrawerHeader>
					<div className="overflow-y-auto px-4 pb-6">
						<div className="space-y-2">
							<GroupedItemList
								items={items}
								grouped={grouped}
								isSelected={(v) => value.includes(v)}
								onItemClick={handleToggle}
							/>
						</div>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
