import { ArrowDownToLine, FileSpreadsheet, Plus } from "lucide-react";
import type { Client, CustomTable, Sheet } from "@/lib/types";

type PageHeadingProps = {
  sheet: Sheet;
  userEmail: string;
  clientsCount: number;
  workspaceScope: boolean;
  displaySheet: string;
  current?: Client;
  customTable?: CustomTable;
  isOwner: boolean;
  clientBusy: boolean;
  onExport: () => void;
  onImport: () => void;
  onAddClient: () => void;
  onAddRow: () => void;
};

export function PageHeading({
  sheet,
  userEmail,
  clientsCount,
  workspaceScope,
  displaySheet,
  current,
  customTable,
  isOwner,
  clientBusy,
  onExport,
  onImport,
  onAddClient,
  onAddRow,
}: PageHeadingProps) {
  const isTable = sheet !== "Overview" && sheet !== "Settings";

  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {sheet === "Overview"
            ? "YOUR WORKSPACE"
            : sheet === "Settings"
              ? "WORKSPACE"
              : workspaceScope
                ? "SHARED WORKSPACE TABLE"
                : "CLIENT WORKSPACE"}{" "}
          <span className="eyebrow-line" />
        </div>
        <h1>
          {sheet === "Overview"
            ? userEmail
              ? `Welcome back, ${userEmail.split("@")[0]} `
              : "Your dropshipping workspace "
            : sheet === "Settings"
              ? "Settings"
              : displaySheet}
          {sheet === "Overview" && <span className="wave">✳</span>}
        </h1>
        <p className="subheading">
          {sheet === "Overview"
            ? clientsCount
              ? "Here’s what’s happening across your client accounts today."
              : "Add your first client to start organizing your work."
            : sheet === "Settings"
              ? "Rename a client, update their store details, or remove a client and everything stored for them."
              : `${current?.name} · ${current?.store}`}
        </p>
      </div>

      <div className="heading-actions">
        {isTable && (
          <button className="button secondary" onClick={onExport}>
            <ArrowDownToLine size={15} /> Export
          </button>
        )}
        {current && sheet !== "Settings" && (
          <button className="button secondary" onClick={onImport}>
            <FileSpreadsheet size={15} /> Import CSV
          </button>
        )}
        {isOwner && (sheet === "Overview" || sheet === "Settings") && (
          <button className="button primary" onClick={onAddClient} disabled={clientBusy}>
            <Plus size={16} /> Add client
          </button>
        )}
        {isTable && (
          <button className="button primary" onClick={onAddRow}>
            <Plus size={16} />
            {customTable ? "Add row" : sheet === "Listings" ? "Add listing" : sheet === "Orders" ? "Add order" : "Add product"}
          </button>
        )}
      </div>
    </div>
  );
}
