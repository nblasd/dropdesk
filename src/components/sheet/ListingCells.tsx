import { shortDate } from "@/lib/format";
import { RowMenu } from "@/components/ui/RowMenu";
import { Source } from "@/components/ui/Source";
import { SourceLinkCell } from "./SourceLinkCell";
import type { RowHandlers } from "./types";

export function ListingHeader() {
  return (
    <>
      <th>LISTING TITLE</th>
      <th>SOURCE</th>
      <th>SOURCE LINK</th>
      <th>LISTED</th>
      <th />
    </>
  );
}

export function ListingCells({ row, handlers }: { row: Record<string, any>; handlers: RowHandlers }) {
  const { onUpdateCell, onEditRow, onDeleteRow } = handlers;

  return (
    <>
      <td>
        <div className="listing-title">
          <b className="listing-id">{row.id}</b>
          <input readOnly className="cell-input title-input" value={row.title} onChange={(e) => onUpdateCell(row, "title", e.target.value)} />
        </div>
      </td>
      <td>
        <Source source={row.source} />
      </td>
      <td>
        <SourceLinkCell
          value={row.sourceUrl}
          placeholder="Paste source link"
          ariaLabel="Open source link"
          onChange={(value) => onUpdateCell(row, "sourceUrl", value)}
        />
      </td>
      <td className="date-cell">{shortDate(row.date)}</td>
      <td>
        <RowMenu onEdit={() => onEditRow(row)} onDelete={() => onDeleteRow(row)} />
      </td>
    </>
  );
}
