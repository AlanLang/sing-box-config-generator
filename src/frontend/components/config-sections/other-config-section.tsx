import { useOutboundGroupOptions } from "@/api/outbound-group/options";
import {
	SelectorDrawer,
	type SelectorDrawerItem,
} from "@/components/selector-drawer";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useMemo } from "react";

interface OtherConfigSectionProps {
	downloadDetour: string;
	onDownloadDetourChange: (value: string) => void;
}

export function OtherConfigSection({
	downloadDetour,
	onDownloadDetourChange,
}: OtherConfigSectionProps) {
	const { data: outboundOptions, isLoading: outboundsLoading } =
		useOutboundGroupOptions();

	// 过滤掉 filter 类型，只保留 outbound 和 outbound_group
	const filteredOutboundOptions = useMemo(() => {
		if (!outboundOptions) return [];
		return outboundOptions.filter((option) => option.source !== "filter");
	}, [outboundOptions]);

	// 构建 SelectorDrawer items（带分组）
	const outboundDrawerItems: SelectorDrawerItem[] = useMemo(() => {
		return filteredOutboundOptions.map((o) => ({
			value: o.uuid,
			title: o.label,
			description: o.type ? `(${o.type})` : undefined,
			group:
				o.source === "outbound_group" ? "Outbound Groups" : "Outbounds",
		}));
	}, [filteredOutboundOptions]);

	const isValid = !!downloadDetour;

	return (
		<AccordionItem value="other">
			<AccordionTrigger className="hover:no-underline">
				<div className="flex items-center gap-3">
					{isValid ? (
						<IconCheck className="size-5 text-green-500" />
					) : (
						<IconAlertCircle className="size-5 text-destructive" />
					)}
					<span className="font-medium">
						Other Configuration
						<span className="text-destructive ml-1">*</span>
					</span>
					{downloadDetour && filteredOutboundOptions.length > 0 && (
						<span className="text-sm text-muted-foreground ml-2">
							(
							{
								filteredOutboundOptions.find(
									(o) => o.uuid === downloadDetour,
								)?.label
							}
							)
						</span>
					)}
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="pt-4 space-y-6">
					{/* Download Detour */}
					<div className="space-y-3">
						<div>
							<Label className="text-base">
								Download Detour{" "}
								<span className="text-destructive">*</span>
							</Label>
							<p className="text-sm text-muted-foreground mt-1">
								Select an outbound for downloading remote resources. Used as{" "}
								<code className="text-xs bg-muted px-1 py-0.5 rounded">
									download_detour
								</code>{" "}
								for remote rule_set and{" "}
								<code className="text-xs bg-muted px-1 py-0.5 rounded">
									experimental.clash_api.external_ui_download_detour
								</code>
								.
							</p>
						</div>

						{outboundsLoading ? (
							<div className="text-sm text-muted-foreground">
								Loading outbounds...
							</div>
						) : filteredOutboundOptions.length === 0 ? (
							<div className="p-4 border border-dashed rounded-lg text-center">
								<p className="text-sm text-destructive">
									No outbounds found. Please create outbounds or outbound groups
									first.
								</p>
							</div>
						) : (
							<SelectorDrawer
								drawerTitle="Select Download Detour"
								placeholder="Select an outbound for download detour"
								items={outboundDrawerItems}
								value={downloadDetour}
								onSelect={onDownloadDetourChange}
							/>
						)}
						{!downloadDetour && filteredOutboundOptions.length > 0 && (
							<p className="text-sm text-destructive">
								Please select a download detour
							</p>
						)}
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
