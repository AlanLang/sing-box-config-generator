import { Checkbox } from "@/components/ui/checkbox";

interface SelectableCardProps {
	id: string;
	title: string;
	description: string;
	selected: boolean;
	disabled?: boolean;
	disabledLabel?: string;
	onToggle: (selected: boolean) => void;
}

export function SelectableCard({
	id,
	title,
	description,
	selected,
	disabled = false,
	disabledLabel,
	onToggle,
}: SelectableCardProps) {
	return (
		<div
			className={`
				relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all
				${
					selected
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/50 hover:bg-muted/30"
				}
				${disabled ? "opacity-50" : "cursor-pointer"}
			`}
			onClick={() => !disabled && onToggle(!selected)}
		>
			{/* 左侧 Checkbox */}
			<Checkbox
				id={id}
				checked={selected}
				disabled={disabled}
				onCheckedChange={(checked) => !disabled && onToggle(!!checked)}
				className="shrink-0"
				onClick={(e) => e.stopPropagation()}
			/>

			{/* 内容区域 */}
			<div className="flex-1 min-w-0">
				{/* 标题 - 两行显示 */}
				<div className="font-medium text-sm line-clamp-2">
					{title}
				</div>

				{/* 描述 - 一行显示，超出部分省略 */}
				<div className="text-xs text-muted-foreground line-clamp-1 mt-1">
					{description}
				</div>
			</div>

			{/* 禁用标签 */}
			{disabled && disabledLabel && (
				<div className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded self-start mt-1">
					{disabledLabel}
				</div>
			)}
		</div>
	);
}
