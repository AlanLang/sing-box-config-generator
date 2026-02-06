import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import { useMemo, useState } from "react";

interface SelectorDrawerItem {
	uuid: string;
	name: string;
	json: string;
}

interface SelectorDrawerProps {
	title: string;
	description?: string;
	placeholder?: string;
	items: SelectorDrawerItem[];
	value: string;
	onSelect: (value: string) => void;
}

function parseJsonEntries(json: string): [string, string][] {
	try {
		const parsed = JSON.parse(json);
		return Object.entries(parsed).slice(0, 6).map(([key, val]) => {
			if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
				return [key, String(val)];
			}
			if (Array.isArray(val)) {
				return [key, `[${val.length}]`];
			}
			if (val && typeof val === "object") {
				return [key, "{...}"];
			}
			return [key, "null"];
		});
	} catch {
		return [];
	}
}

function JsonTags({ json }: { json: string }) {
	const entries = useMemo(() => parseJsonEntries(json), [json]);

	if (entries.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-1.5 mt-2">
			{entries.map(([key, val]) => (
				<span
					key={key}
					className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-md"
				>
					<span className="text-muted-foreground">{key}:</span>
					<span className="font-medium">{val}</span>
				</span>
			))}
		</div>
	);
}

export function SelectorDrawer({
	title,
	description,
	placeholder = "Click to select...",
	items,
	value,
	onSelect,
}: SelectorDrawerProps) {
	const [open, setOpen] = useState(false);
	const selectedItem = items.find((item) => item.uuid === value);

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
					<div>
						<div className="flex items-center justify-between gap-2">
							<span className="font-medium text-sm">{selectedItem.name}</span>
							<IconSelector className="size-4 text-muted-foreground shrink-0" />
						</div>
						<JsonTags json={selectedItem.json} />
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
						<DrawerTitle>{title}</DrawerTitle>
						{description && (
							<DrawerDescription>{description}</DrawerDescription>
						)}
					</DrawerHeader>
					<div className="overflow-y-auto px-4 pb-6">
						<div className="space-y-2">
							{items.map((item) => {
								const selected = value === item.uuid;
								return (
									<button
										type="button"
										key={item.uuid}
										onClick={() => {
											onSelect(item.uuid);
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
										<div className="flex items-start gap-3">
											<div className="flex-1 min-w-0">
												<div className="font-medium text-sm">
													{item.name}
												</div>
												<JsonTags json={item.json} />
											</div>
											{selected && (
												<IconCheck className="size-5 text-primary shrink-0 mt-0.5" />
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
