import { useInboundList } from "@/api/inbound/list";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { SelectableCard } from "@/components/selectable-card";

interface InboundsConfigSectionProps {
	value: string[];
	onChange: (value: string[]) => void;
}

export function InboundsConfigSection({
	value,
	onChange,
}: InboundsConfigSectionProps) {
	const { data: inbounds, isLoading: inboundsLoading } = useInboundList();

	const handleToggle = (inboundUuid: string, selected: boolean) => {
		if (selected) {
			onChange([...value, inboundUuid]);
		} else {
			onChange(value.filter((id) => id !== inboundUuid));
		}
	};

	const isValid = value.length > 0;

	return (
		<AccordionItem value="inbounds">
			<AccordionTrigger className="hover:no-underline">
				<div className="flex items-center gap-3">
					{isValid ? (
						<IconCheck className="size-5 text-green-500" />
					) : (
						<IconAlertCircle className="size-5 text-destructive" />
					)}
					<span className="font-medium">
						Inbounds Configuration
						<span className="text-destructive ml-1">*</span>
					</span>
					{value.length > 0 && (
						<span className="text-sm text-muted-foreground ml-2">
							({value.length} selected)
						</span>
					)}
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="pt-4 space-y-4">
					<p className="text-sm text-muted-foreground">
						Select at least one inbound configuration. You can select multiple
						inbounds.
					</p>

					{inboundsLoading ? (
						<div className="text-sm text-muted-foreground">
							Loading inbounds...
						</div>
					) : !inbounds || inbounds.length === 0 ? (
						<div className="p-4 border border-dashed rounded-lg text-center">
							<p className="text-sm text-destructive">
								No inbound configurations found. Please create inbound
								configurations first.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-2">
							{inbounds.map((inbound) => (
								<SelectableCard
									key={inbound.uuid}
									id={`inbound-${inbound.uuid}`}
									title={inbound.name}
									description={inbound.json}
									selected={value.includes(inbound.uuid)}
									onToggle={(selected) => handleToggle(inbound.uuid, selected)}
								/>
							))}
						</div>
					)}
					{value.length === 0 && inbounds && inbounds.length > 0 && (
						<p className="text-sm text-destructive">
							Please select at least one inbound
						</p>
					)}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
