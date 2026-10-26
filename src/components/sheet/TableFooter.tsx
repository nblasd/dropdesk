import { ChevronLeft, ChevronRight } from "lucide-react";

export function TableFooter({ filteredCount, totalCount }: { filteredCount: number; totalCount: number }) {
  return (
    <div className="table-footer">
      <span>
        Showing <b>{filteredCount ? 1 : 0}–{filteredCount}</b> of <b>{totalCount}</b> records
      </span>
      <div>
        <button disabled>
          <ChevronLeft size={15} />
        </button>
        <button className="page-number">1</button>
        <button disabled>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
