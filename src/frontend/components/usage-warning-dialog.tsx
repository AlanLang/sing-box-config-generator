import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UsageWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: string;
  usedByConfigs: Array<{ uuid: string; name: string }>;
}

export function UsageWarningDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  usedByConfigs,
}: UsageWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>无法删除</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              "{itemName}" 正在被以下 {usedByConfigs.length} 个配置使用，无法删除：
            </p>
            <div className="max-h-[200px] overflow-y-auto rounded-md border p-3 bg-muted/30">
              <ul className="space-y-1.5">
                {usedByConfigs.map((config) => (
                  <li
                    key={config.uuid}
                    className="text-sm font-medium text-foreground"
                  >
                    • {config.name}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              请先从这些配置中移除对此{itemType}的引用，然后再删除。
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            我知道了
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
