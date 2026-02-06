import { RadioGroupItem } from "@/components/ui/radio-group";

interface RadioCardProps {
	id: string;
	value: string;
	title: string;
	description: string;
	selected: boolean;
	disabled?: boolean;
	disabledLabel?: string;
}

export function RadioCard({
	id,
	value,
	title,
	description,
	selected,
	disabled = false,
	disabledLabel,
}: RadioCardProps) {
	return (
		<div
			className={`
				relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all
				${selected
					? "border-primary bg-primary/5"
					: "border-border hover:border-primary/50 hover:bg-muted/30"
				}
				${disabled ? "opacity-50" : "cursor-pointer"}
			`}
		>
			{/* 左侧 Radio */}
			<RadioGroupItem value={value} id={id} disabled={disabled} className="shrink-0" />

			{/* 内容区域 */}
			<label htmlFor={id} className="flex-1 min-w-0 cursor-pointer">
				{/* 标题 - 两行显示 */}
				<div className="font-medium text-sm line-clamp-2">
					{title}
				</div>

				{/* 描述 - 一行显示，超出部分省略 */}
				<div className="text-xs text-muted-foreground line-clamp-1 mt-1">
					{description}
				</div>
			</label>

			{/* 禁用标签 */}
			{disabled && disabledLabel && (
				<div className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded self-start mt-1">
					{disabledLabel}
				</div>
			)}
		</div>
	);
}
