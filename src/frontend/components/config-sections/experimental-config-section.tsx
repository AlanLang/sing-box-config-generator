import { useExperimentalList } from "@/api/experimental/list";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup } from "@/components/ui/radio-group";
import { IconCheck } from "@tabler/icons-react";
import { RadioCard } from "@/components/radio-card";

interface ExperimentalConfigSectionProps {
	value: string | undefined;
	onChange: (value: string | undefined) => void;
}

export function ExperimentalConfigSection({
	value,
	onChange,
}: ExperimentalConfigSectionProps) {
	const { data: experimentals, isLoading: experimentalsLoading } =
		useExperimentalList();

	return (
		<AccordionItem value="experimental">
			<AccordionTrigger className="hover:no-underline">
				<div className="flex items-center gap-3">
					<IconCheck className="size-5 text-green-500" />
					<span className="font-medium">
						Experimental Configuration
						<span className="text-muted-foreground text-sm font-normal ml-2">
							(Optional)
						</span>
					</span>
					{value && experimentals && (
						<span className="text-sm text-muted-foreground ml-2">
							({experimentals.find((e) => e.uuid === value)?.name})
						</span>
					)}
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="pt-4 space-y-4">
					<p className="text-sm text-muted-foreground">
						Select an experimental configuration (optional). Leave unselected
						if you don't need experimental features.
					</p>

					{experimentalsLoading ? (
						<div className="text-sm text-muted-foreground">
							Loading experimental configs...
						</div>
					) : !experimentals || experimentals.length === 0 ? (
						<div className="p-4 border border-dashed rounded-lg text-center">
							<p className="text-sm text-muted-foreground">
								No experimental configurations found. You can proceed without
								experimental config.
							</p>
						</div>
					) : (
						<RadioGroup
							value={value || "none"}
							onValueChange={(newValue) =>
								onChange(newValue === "none" ? undefined : newValue)
							}
						>
							<div className="grid grid-cols-1 gap-2">
								<RadioCard
									id="experimental-none"
									value="none"
									title="No experimental config"
									description="Skip experimental features"
									selected={!value || value === "none"}
								/>
								{experimentals.map((experimentalItem) => (
									<RadioCard
										key={experimentalItem.uuid}
										id={`experimental-${experimentalItem.uuid}`}
										value={experimentalItem.uuid}
										title={experimentalItem.name}
										description={experimentalItem.json}
										selected={value === experimentalItem.uuid}
									/>
								))}
							</div>
						</RadioGroup>
					)}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
