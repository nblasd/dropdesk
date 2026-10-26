import type { Attribution } from "@/lib/types";

export type RowHandlers = {
  selectedRows: string[];
  allSelected: boolean;
  rowKey: (row: Record<string, any>) => string;
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  onEditRow: (row: Record<string, any>) => void;
  onDeleteRow: (row: Record<string, any>) => void;
  onUpdateCell: (row: Record<string, any>, key: string, value: string) => void;
};

export type AttributionResolver = (createdBy?: string | null) => Attribution;
