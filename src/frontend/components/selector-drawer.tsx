import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import { useState } from "react";

export interface SelectorDrawerItem {
	value: string;
	title: string;
	description?: string;
}

interface SelectorDrawerProps {
	drawerTitle: string;
	drawerDescription?: string;
	placeholder?: string;
	items: SelectorDrawerItem[];
	value: string;
	onSelect: (value: string) => void;
}

export function SelectorDrawer({
	drawerTitle,
	drawerDescription,
	placeholder = "Click to select...",
	items,
	value,
	onSelect,
}: SelectorDrawerProps) {
	const [open, setOpen] = useState(false);
	const selectedItem = items.find((item) => item.value === value);

	return (
		<>
			{/* Trigger / Selected Display */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={`
					w-full text-left rounded-lg border-2 p-3 transition-all cursor-pointer
					${selectedItem
						? "border-primary/40 bg-primary/5 hover:border-primary/60"
						: "border-dashed border-border hover:border-primary/50 hover:bg-muted/30"
					}
				`}
			>
				{selectedItem ? (
					<div className="flex items-center justify-between gap-2">
						<div className="flex-1 min-w-0">
							<div className="font-medium text-sm">{selectedItem.title}</div>
							{selectedItem.description && (
								<div className="text-xs text-muted-foreground line-clamp-1 mt-1">
									{selectedItem.description}
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
							{items.map((item) => {
								const selected = value === item.value;
								return (
									<button
										type="button"
										key={item.value}
										onClick={() => {
											onSelect(item.value);
											setOpen(false);
										}}
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
												<div className="font-medium text-sm">
													{item.title}
												</div>
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
							})}
						</div>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
