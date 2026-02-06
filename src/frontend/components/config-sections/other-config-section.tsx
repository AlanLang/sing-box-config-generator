import { useOutboundGroupOptions } from "@/api/outbound-group/options";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

	// 按 source 分组
	const groupedOutboundOptions = useMemo(() => {
		const groups: Record<string, typeof filteredOutboundOptions> = {
			outbound_group: [],
			outbound: [],
		};

		for (const option of filteredOutboundOptions) {
			if (groups[option.source]) {
				groups[option.source].push(option);
			}
		}

		return groups;
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
							<Select
								value={downloadDetour || undefined}
								onValueChange={onDownloadDetourChange}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select an outbound for download detour">
										{downloadDetour && (
											<span>
												{
													filteredOutboundOptions.find(
														(o) => o.uuid === downloadDetour,
													)?.label
												}
												<span className="text-xs text-muted-foreground ml-2">
													(
													{
														filteredOutboundOptions.find(
															(o) => o.uuid === downloadDetour,
														)?.source
													}
													{filteredOutboundOptions.find(
														(o) => o.uuid === downloadDetour,
													)?.type &&
														` - ${filteredOutboundOptions.find((o) => o.uuid === downloadDetour)?.type}`}
													)
												</span>
											</span>
										)}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{groupedOutboundOptions.outbound_group.length > 0 && (
										<SelectGroup>
											<SelectLabel>Outbound Groups</SelectLabel>
											{groupedOutboundOptions.outbound_group.map((outbound) => (
												<SelectItem key={outbound.uuid} value={outbound.uuid}>
													<span className="font-medium">{outbound.label}</span>
													{outbound.type && (
														<span className="text-xs text-muted-foreground ml-2">
															({outbound.type})
														</span>
													)}
												</SelectItem>
											))}
										</SelectGroup>
									)}
									{groupedOutboundOptions.outbound.length > 0 && (
										<SelectGroup>
											<SelectLabel>Outbounds</SelectLabel>
											{groupedOutboundOptions.outbound.map((outbound) => (
												<SelectItem key={outbound.uuid} value={outbound.uuid}>
													<span className="font-medium">{outbound.label}</span>
													{outbound.type && (
														<span className="text-xs text-muted-foreground ml-2">
															({outbound.type})
														</span>
													)}
												</SelectItem>
											))}
										</SelectGroup>
									)}
								</SelectContent>
							</Select>
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
