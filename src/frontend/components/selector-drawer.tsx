import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { IconCheck } from "@tabler/icons-react";
import { useMemo } from "react";

interface SelectorDrawerItem {
	uuid: string;
	name: string;
	json: string;
}

interface SelectorDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	items: SelectorDrawerItem[];
	value: string;
	onSelect: (value: string) => void;
}

function JsonPreview({ json }: { json: string }) {
	const summary = useMemo(() => {
		try {
			const parsed = JSON.parse(json);
			const keys = Object.keys(parsed);
			const parts: string[] = [];
			for (const key of keys.slice(0, 4)) {
				const val = parsed[key];
				if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
					parts.push(`${key}: ${val}`);
				} else if (Array.isArray(val)) {
					parts.push(`${key}: [${val.length}]`);
				} else if (val && typeof val === "object") {
					parts.push(`${key}: {...}`);
				}
			}
			if (keys.length > 4) {
				parts.push(`+${keys.length - 4} more`);
			}
			return parts.join(" · ");
		} catch {
			return json.slice(0, 80);
		}
	}, [json]);

	return (
		<span className="text-xs text-muted-foreground line-clamp-1">
			{summary}
		</span>
	);
}

export function SelectorDrawer({
	open,
	onOpenChange,
	title,
	description,
	items,
	value,
	onSelect,
}: SelectorDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
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
										onOpenChange(false);
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
												{item.name}
											</div>
											<JsonPreview json={item.json} />
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
	);
}
