import type { CustomTable } from "@/lib/types";
import { RowMenu } from "@/components/ui/RowMenu";
import type { RowHandlers } from "./types";

export function CustomTableGrid({ table, rows, handlers }: { table: CustomTable; rows: Record<string, any>[]; handlers: RowHandlers }) {
  return (
    <table className="data-table custom-data-table">
      <thead>
        <tr>
          <th className="select-col">
            <input type="checkbox" aria-label="Select all visible rows" checked={handlers.allSelected} onChange={handlers.onSelectAll} />
          </th>
          {table.columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.__rowId ?? index}>
            <td className="select-cell">
              <input
                type="checkbox"
                aria-label={`Select row ${index + 1}`}
                checked={handlers.selectedRows.includes(String(row.__rowId ?? row.id))}
                onChange={() => handlers.onToggleSelect(String(row.__rowId ?? row.id))}
              />
            </td>
            {table.columns.map((column) => (
              <td key={column}>
                <input readOnly className="cell-input custom-cell-input" aria-label={`${column} value`} value={row[column] ?? ""} />
              </td>
            ))}
            <td>
              <RowMenu onEdit={() => handlers.onEditRow(row)} onDelete={() => handlers.onDeleteRow(row)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
