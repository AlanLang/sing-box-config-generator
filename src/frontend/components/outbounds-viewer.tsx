import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { IconCode, IconLayoutGrid, IconX } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { OutboundDto } from "@/api/subscribe/outbounds";

interface OutboundsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  outbounds: OutboundDto[];
  isLoading: boolean;
  subscribeName: string;
}

export function OutboundsViewer({
  isOpen,
  onClose,
  outbounds,
  isLoading,
  subscribeName,
}: OutboundsViewerProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "shadowsocks":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "trojan":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "vmess":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "vless":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Subscription Outbounds</DialogTitle>
              <DialogDescription>
                Viewing {outbounds.length} outbound{outbounds.length !== 1 ? "s" : ""} from "{subscribeName}"
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="cards" className="flex-1">
          <div className="px-6 pb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="cards" className="gap-2">
                <IconLayoutGrid className="size-4" />
                Card View
              </TabsTrigger>
              <TabsTrigger value="json" className="gap-2">
                <IconCode className="size-4" />
                JSON View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cards" className="m-0 px-6 pb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading outbounds...
              </div>
            ) : outbounds.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No outbounds found. Try refreshing the subscription first.
              </div>
            ) : (
              <ScrollArea className="h-[calc(80vh-16rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                  {outbounds.map((outbound, index) => (
                    <motion.div
                      key={`${outbound.tag}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="font-medium text-sm truncate flex-1">
                          {outbound.tag}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${getTypeColor(outbound.type)}`}
                        >
                          {outbound.type}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        {outbound.server && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground/70 min-w-[60px]">
                              Server:
                            </span>
                            <span className="truncate">{outbound.server}</span>
                          </div>
                        )}
                        {outbound.server_port && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground/70 min-w-[60px]">
                              Port:
                            </span>
                            <span>{outbound.server_port}</span>
                          </div>
                        )}
                        {outbound.type === "shadowsocks" && outbound.method && typeof outbound.method === "string" ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground/70 min-w-[60px]">
                              Method:
                            </span>
                            <span>{outbound.method}</span>
                          </div>
                        ) : null}
                        {outbound.type === "vmess" && outbound.uuid && typeof outbound.uuid === "string" ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground/70 min-w-[60px]">
                              UUID:
                            </span>
                            <span className="font-mono text-xs truncate">
                              {outbound.uuid.substring(0, 8)}...
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="json" className="m-0 px-6 pb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading outbounds...
              </div>
            ) : (
              <ScrollArea className="h-[calc(80vh-16rem)]">
                <pre className="p-4 rounded-lg bg-muted/50 text-xs font-mono overflow-x-auto">
                  {JSON.stringify(outbounds, null, 2)}
                </pre>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
