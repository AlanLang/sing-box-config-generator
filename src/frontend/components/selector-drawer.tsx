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
}

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

function ItemButton({
	item,
	selected,
	onClick,
}: {
	item: { title: string; description?: string };
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`
				w-full text-left rounded-lg border-2 p-3 transition-all
				${selected
					? "border-primary bg-primary/5"
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
				{selected && (
					<IconCheck className="size-5 text-primary shrink-0" />
				)}
			</div>
		</button>
	);
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

	const isNoneSelected = noneOption && !value;
	const selectedItem = items.find((item) => item.value === value);
	const displayItem = selectedItem || (isNoneSelected ? { title: noneOption.title, description: noneOption.description } : null);

	// Group items by group field
	const grouped = useMemo(() => {
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

	const handleSelect = (val: string) => {
		onSelect(val);
		setOpen(false);
	};

	return (
		<>
			{/* Trigger / Selected Display */}
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

			{/* Drawer */}
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
							{/* None option */}
							{noneOption && (
								<ItemButton
									item={noneOption}
									selected={!value}
									onClick={() => handleSelect("")}
								/>
							)}

							{/* Grouped rendering */}
							{grouped ? (
								Array.from(grouped.entries()).map(([group, groupItems]) => (
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
													selected={value === item.value}
													onClick={() => handleSelect(item.value)}
												/>
											))}
										</div>
									</div>
								))
							) : (
								items.map((item) => (
									<ItemButton
										key={item.value}
										item={item}
										selected={value === item.value}
										onClick={() => handleSelect(item.value)}
									/>
								))
							)}
						</div>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
