import { useState, useCallback } from "react";
import { useResourceUsageCheck } from "@/api/usage-check";

export interface UseDeleteProtectionOptions {
  uuid: string;
  resourceType: string;
  onConfirmedDelete: () => Promise<void>;
}

export interface DeleteProtectionState {
  isDialogOpen: boolean;
  isUsageDialogOpen: boolean;
  usedByConfigs: Array<{ uuid: string; name: string }>;
  isCheckingUsage: boolean;
  handleDeleteClick: () => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
  handleCloseUsageDialog: () => void;
}

export const useDeleteProtection = ({
  uuid,
  resourceType,
  onConfirmedDelete,
}: UseDeleteProtectionOptions): DeleteProtectionState => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [checkingUuid, setCheckingUuid] = useState<string | null>(null);

  const { data: usageData, isLoading: isCheckingUsage } = useResourceUsageCheck(
    uuid,
    resourceType,
    checkingUuid === uuid,
  );

  const handleDeleteClick = useCallback(() => {
    // 开始检查使用情况
    setCheckingUuid(uuid);
  }, [uuid]);

  // 当检查完成时，根据结果显示相应的对话框
  const handleCheckComplete = useCallback(() => {
    if (!usageData) return;

    if (usageData.is_used) {
      // 被使用，显示警告对话框
      setIsUsageDialogOpen(true);
    } else {
      // 未被使用，显示确认删除对话框
      setIsDialogOpen(true);
    }
    setCheckingUuid(null);
  }, [usageData]);

  // 监听检查完成
  if (checkingUuid === uuid && !isCheckingUsage && usageData) {
    handleCheckComplete();
  }

  const handleConfirmDelete = useCallback(async () => {
    await onConfirmedDelete();
    setIsDialogOpen(false);
  }, [onConfirmedDelete]);

  const handleCancelDelete = useCallback(() => {
    setIsDialogOpen(false);
    setCheckingUuid(null);
  }, []);

  const handleCloseUsageDialog = useCallback(() => {
    setIsUsageDialogOpen(false);
    setCheckingUuid(null);
  }, []);

  return {
    isDialogOpen,
    isUsageDialogOpen,
    usedByConfigs: usageData?.used_by_configs || [],
    isCheckingUsage: checkingUuid === uuid && isCheckingUsage,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete,
    handleCloseUsageDialog,
  };
};
