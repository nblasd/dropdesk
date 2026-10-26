"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { emptyClientData, isLegacyDemoClient, WORKSPACE_SCOPE_ID } from "@/lib/constants";
import { errorText } from "@/lib/errors";
import { isHttpUrl, isoDateToShort, sourceFromUrl } from "@/lib/format";
import { orderDraftTemplate, orderEarnings, orderNetProfit } from "@/lib/orders";
import { parseCsv } from "@/lib/csv";
import type { Attribution, Client, CustomTable, Sheet, UserRole, WorkspaceData } from "@/lib/types";
import type { AuthApi } from "@/hooks/useAuth";
import type { TeamApi } from "@/hooks/useTeam";
import type { WorkspaceDialogsApi } from "@/hooks/useWorkspaceDialogs";

type Options = {
  auth: AuthApi;
  team: TeamApi;
  dialogs: WorkspaceDialogsApi;
  toast: (message: string) => void;
};

export function useWorkspaceData({ auth, team, dialogs, toast }: Options) {
  const { supabase, userId, userEmail, setUserPublicId } = auth;
  const {
    memberships,
    setMemberships,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    setUserWorkspaceId,
    userWorkspaceId,
    userRole,
    setUserRole,
    setWorkspaceMembers,
    setWorkspaceMembersError,
    setWorkspaceMembersWarning,
    refreshWorkspaceMembers,
    setSharedRowsReady,
  } = team;

  const [clients, setClients] = useState<Client[]>([]);
  const [active, setActive] = useState("");
  const [sheet, setSheet] = useState<Sheet>("Overview");
  const [data, setData] = useState<WorkspaceData>({});
  const [customTables, setCustomTables] = useState<Record<string, CustomTable[]>>({});
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const canWriteWorkspace = !userEmail || userRole !== "viewer";
  const visibleClients = selectedWorkspaceId ? clients.filter((c) => c.workspace_id === selectedWorkspaceId) : clients;
  const visibleData: WorkspaceData = selectedWorkspaceId
    ? Object.fromEntries(visibleClients.map((c) => [c.id, data[c.id] ?? emptyClientData()]))
    : data;
  const workspaceScope = active === WORKSPACE_SCOPE_ID;
  const workspaceScopeClient: Client = {
    id: WORKSPACE_SCOPE_ID,
    name: "Workspace products",
    initials: "WP",
    color: "#dfe8e1",
    store: "Shared across the workspace · not tied to a client",
    workspace_id: selectedWorkspaceId ?? undefined,
  };
  const current = workspaceScope ? workspaceScopeClient : (visibleClients.find((c) => c.id === active) ?? visibleClients[0]);
  // Owners always have the shared table; members need an explicit grant (undefined = older DB without the column).
  const sharedTableAccess =
    userRole === "owner" || memberships.find((m) => m.workspace_id === (selectedWorkspaceId ?? userWorkspaceId))?.shared_table_access !== false;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dropdesk-demo");
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedClients: Client[] = Array.isArray(parsed.clients) ? parsed.clients.filter((c: Client) => !isLegacyDemoClient(c.id)) : [];
        const savedClientIds = new Set(savedClients.map((c) => c.id));
        const savedData = Object.fromEntries(Object.entries(parsed.data ?? {}).filter(([id]) => savedClientIds.has(id))) as WorkspaceData;
        const savedTables = Object.fromEntries(Object.entries(parsed.customTables ?? {}).filter(([id]) => savedClientIds.has(id))) as Record<
          string,
          CustomTable[]
        >;
        setClients(savedClients);
        setData(savedData);
        setCustomTables(savedTables);
        const initialActive = savedClientIds.has(parsed.active) ? parsed.active : (savedClients[0]?.id ?? "");
        setActive(initialActive);
        localStorage.setItem(
          "dropdesk-demo",
          JSON.stringify({ clients: savedClients, data: savedData, customTables: savedTables, active: initialActive }),
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    setSelectedRows([]);
  }, [active, sheet]);

  useEffect(() => {
    try {
      localStorage.setItem("dropdesk-demo", JSON.stringify({ clients, data, customTables, active }));
    } catch {}
  }, [clients, data, customTables, active]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const timer = setTimeout(async () => {
      const clientRows = clients.filter((c) => c.workspace_id && c.user_id === userId).map((c) => ({ ...c, user_id: userId }));
      if (clientRows.length) await supabase.from("clients").upsert(clientRows, { onConflict: "id" });
      const workspaceRows = Object.entries(data)
        .flatMap(([clientId, sheets]) =>
          Object.entries(sheets).flatMap(([sheetName, records]) =>
            (records as any[]).map((r) => {
              const { __rowId: _rowId, __createdBy, ...payload } = r;
              const shared = clientId === WORKSPACE_SCOPE_ID;
              return {
                id: String(r.id),
                user_id: __createdBy ?? userId,
                client_id: shared ? null : clientId,
                workspace_id: shared ? (selectedWorkspaceId ?? null) : null,
                sheet: sheetName,
                payload,
                updated_at: new Date().toISOString(),
              };
            }),
          ),
        )
        .filter((row) => row.client_id !== null || row.workspace_id !== null);
      if (workspaceRows.length) {
        const { error: rowsError } = await supabase.from("workspace_rows").upsert(workspaceRows, { onConflict: "id" });
        if (rowsError && (rowsError.code === "42703" || rowsError.code === "PGRST204")) {
          // Shared-table migration not applied yet: save per-client rows the old way.
          const legacyRows = workspaceRows
            .filter((row) => row.client_id !== null)
            .map((row) => ({
              id: row.id,
              user_id: row.user_id,
              client_id: row.client_id,
              sheet: row.sheet,
              payload: row.payload,
              updated_at: row.updated_at,
            }));
          if (legacyRows.length) await supabase.from("workspace_rows").upsert(legacyRows, { onConflict: "id" });
        }
      }
      const tables = Object.entries(customTables).flatMap(([clientId, clientTables]) =>
        clientTables.map((t) => ({
          id: t.id,
          user_id: userId,
          client_id: clientId,
          name: t.name,
          columns: t.columns,
          rows: t.rows,
          updated_at: new Date().toISOString(),
        })),
      );
      if (tables.length) await supabase.from("workspace_tables").upsert(tables, { onConflict: "id" });
    }, 700);
    return () => clearTimeout(timer);
  }, [supabase, userId, selectedWorkspaceId, clients, data, customTables]);

  const loadWorkspace = async (sb: SupabaseClient, uid: string, preferredWorkspaceId?: string | null): Promise<boolean> => {
    const clientResult = await sb.from("clients").select("id,name,initials,color,store,workspace_id,user_id,visibility").is("archived_at", null);
    const [tableResult, membershipResult, profileResult] = await Promise.all([
      sb.from("workspace_tables").select("id,client_id,name,columns,rows").is("deleted_at", null),
      sb.from("workspace_members").select("workspace_id,role,shared_table_access").eq("user_id", uid).order("created_at"),
      sb.from("user_profiles").select("public_id").eq("user_id", uid).maybeSingle(),
    ]);
    let rowResult: any = await sb.from("workspace_rows").select("id,user_id,client_id,workspace_id,sheet,payload").is("deleted_at", null);
    if (rowResult.error && (rowResult.error.code === "42703" || rowResult.error.code === "PGRST204")) {
      // Shared-table migration not applied yet: keep the app working with client rows only.
      rowResult = await sb.from("workspace_rows").select("id,user_id,client_id,sheet,payload").is("deleted_at", null);
      setSharedRowsReady(false);
    }
    if (profileResult.error)
      console.error("[Dropdesk][profile.load] failed", {
        code: profileResult.error.code,
        message: profileResult.error.message,
        details: profileResult.error.details,
        hint: profileResult.error.hint,
      });
    setUserPublicId(profileResult.data?.public_id ?? "");
    if (clientResult.error || rowResult.error || membershipResult.error) {
      console.error("[Dropdesk][workspace.load] failed", {
        userId: uid,
        clients: clientResult.error && {
          code: clientResult.error.code,
          message: clientResult.error.message,
          details: clientResult.error.details,
          hint: clientResult.error.hint,
        },
        rows: rowResult.error && {
          code: rowResult.error.code,
          message: rowResult.error.message,
          details: rowResult.error.details,
          hint: rowResult.error.hint,
        },
        memberships: membershipResult.error && {
          code: membershipResult.error.code,
          message: membershipResult.error.message,
          details: membershipResult.error.details,
          hint: membershipResult.error.hint,
        },
      });
      toast("Could not load your workspace access. Apply the workspace access migrations in Supabase.");
      return false;
    }
    const loadedMemberships = (membershipResult.data ?? []) as { workspace_id: string; role: UserRole; shared_table_access?: boolean }[];
    setMemberships(loadedMemberships);
    const workspaceIds = loadedMemberships.map((m) => m.workspace_id);
    const ownerWorkspace = loadedMemberships.find((m) => m.role === "owner");
    const savedWorkspaceId = typeof window !== "undefined" ? localStorage.getItem("dropdesk-selected-workspace") : null;
    const initialWorkspaceId =
      (preferredWorkspaceId && workspaceIds.includes(preferredWorkspaceId) ? preferredWorkspaceId : null) ??
      (savedWorkspaceId && workspaceIds.includes(savedWorkspaceId) ? savedWorkspaceId : null) ??
      ownerWorkspace?.workspace_id ??
      workspaceIds[0] ??
      null;
    if (!initialWorkspaceId) {
      setWorkspaceMembers([]);
      toast("This account has no workspace yet. Apply the workspace repair migration in Supabase, then reload.");
      return false;
    }
    const initialRole = loadedMemberships.find((m) => m.workspace_id === initialWorkspaceId)?.role ?? "viewer";
    setUserWorkspaceId(initialWorkspaceId);
    setUserRole(initialRole);
    setSelectedWorkspaceId(initialWorkspaceId);
    if (typeof window !== "undefined") localStorage.setItem("dropdesk-selected-workspace", initialWorkspaceId);
    if (tableResult.error) toast("Custom table cloud sync needs the workspace_tables migration in Supabase.");
    const allClients = (clientResult.data ?? []) as Client[];
    if (initialRole === "owner") await refreshWorkspaceMembers(sb, initialWorkspaceId);
    else {
      setWorkspaceMembers([]);
      setWorkspaceMembersError("");
      setWorkspaceMembersWarning("");
    }
    const remoteClients = allClients.map((client) =>
      !client.workspace_id && client.user_id === uid && initialRole === "owner" ? { ...client, workspace_id: initialWorkspaceId } : client,
    );
    const next: WorkspaceData = {};
    remoteClients.forEach((c) => {
      next[c.id] = emptyClientData();
    });
    // Shared workspace table (no client) lives under a sentinel key.
    next[WORKSPACE_SCOPE_ID] = emptyClientData();
    rowResult.data?.forEach((row: any) => {
      if (row.client_id === null || row.client_id === undefined) {
        if (row.workspace_id === initialWorkspaceId && row.sheet === "Product hunting")
          next[WORKSPACE_SCOPE_ID]["Product hunting"].push({ ...row.payload, __rowId: row.id, __createdBy: row.user_id });
        return;
      }
      if (next[row.client_id] && row.sheet in next[row.client_id])
        next[row.client_id][row.sheet as Exclude<Sheet, "Overview">].push({ ...row.payload, __rowId: row.id, __createdBy: row.user_id });
    });
    const nextTables: Record<string, CustomTable[]> = {};
    tableResult.data?.forEach((table: any) => {
      if (next[table.client_id]) {
        (nextTables[table.client_id] ??= []).push({
          id: table.id,
          name: table.name,
          columns: Array.isArray(table.columns) ? table.columns : [],
          rows: Array.isArray(table.rows) ? table.rows : [],
        });
      }
    });
    setClients(remoteClients);
    setData(next);
    setCustomTables(nextTables);
    // With no clients yet, land on the shared table so the workspace is still usable.
    setActive(remoteClients[0]?.id ?? WORKSPACE_SCOPE_ID);
    if (!remoteClients.length) setSheet("Product hunting");
    return true;
  };

  const items = current ? data[current.id] : undefined;
  const activeCustomTables = current ? (customTables[current.id] ?? []) : [];
  const customTable = activeCustomTables.find((t) => t.id === sheet);
  const displaySheet = customTable?.name ?? sheet;
  const rows = customTable?.rows ?? (sheet !== "Overview" && items ? items[sheet] ?? [] : []);
  const rowKey = (row: Record<string, any>) => String(row.__rowId ?? row.id);
  const filtered = useMemo(
    () =>
      rows.filter((r: any) => {
        const text = Object.values(r).join(" ").toLowerCase();
        return text.includes(query.toLowerCase()) && (sourceFilter === "All sources" || r.source === sourceFilter);
      }),
    [rows, query, sourceFilter],
  );
  const allOrders = Object.values(visibleData).flatMap((d) => d.Orders || []);
  const orderProfit = allOrders.reduce((a, r) => a + r.profit, 0);
  const listingsCount = Object.values(visibleData).flatMap((d) => d.Listings || []).length;
  const ordersTotals = useMemo(() => {
    if (sheet !== "Orders" || customTable) return null;
    const list = rows as Record<string, any>[];
    if (!list.length) return null;
    const sum = (pick: (row: Record<string, any>) => unknown) => list.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
    return {
      count: list.length,
      quantity: sum((row) => row.quantity),
      sales: sum((row) => row.sale),
      fees: sum((row) => (Number(row.fee) || 0) + (Number(row.adFees) || 0) + (Number(row.postage) || 0)),
      earnings: sum((row) => (row.earnings !== undefined && row.earnings !== null ? row.earnings : orderEarnings(row))),
      investment: sum((row) => row.cost),
      profit: sum((row) => orderNetProfit(row)),
    };
  }, [sheet, customTable, rows]);

  const attributionFor = (createdBy?: string | null): Attribution => {
    const isYou = !!createdBy && createdBy === userId;
    const known = createdBy ? team.memberLabels[createdBy] : undefined;
    const member = createdBy ? team.workspaceMembers.find((item) => item.user_id === createdBy) : undefined;
    const fallbackName = !userId ? "Guest" : isYou ? userEmail.split("@")[0] || "You" : "Team member";
    const name = known?.display_name || (member?.email ? member.email.split("@")[0] : "") || fallbackName;
    const initials =
      name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "TM";
    return {
      name: isYou && name !== "You" ? `${name} (you)` : name,
      initials,
      isYou,
      title: `Added by ${name}${known?.public_id ? ` · ${known.public_id}` : ""}`,
    };
  };

  const setRows = async (name: string, next: any[]): Promise<boolean> => {
    if (!canWriteWorkspace) {
      toast("Your role is read-only");
      return false;
    }
    if (!(customTable && name === customTable.id) && supabase && userId) {
      const prior = data[active]?.[name] ?? [];
      const remaining = new Set(next.map((row) => String(row.__rowId ?? row.id)));
      const removed = prior.map((row) => String(row.__rowId ?? row.id)).filter((id) => !remaining.has(id));
      if (removed.length) {
        const archived = { deleted_at: new Date().toISOString(), deleted_by: userId };
        // Postgres checks the SELECT policies against the *new* row too, so an
        // archive rejected by RLS must not disappear from the screen. Only drop
        // the row locally after Supabase confirms it.
        let archiveError: { code?: string; message?: string; details?: string; hint?: string } | null = null;
        try {
          const { error } = await (workspaceScope
            ? supabase.from("workspace_rows").update(archived).is("client_id", null).eq("workspace_id", selectedWorkspaceId).in("id", removed)
            : supabase.from("workspace_rows").update(archived).eq("client_id", active).in("id", removed));
          archiveError = error;
        } catch (error) {
          archiveError = { message: error instanceof Error ? error.message : String(error) };
        }
        if (archiveError) {
          console.error("[Dropdesk][rows.archive] failed", {
            workspaceId: selectedWorkspaceId,
            clientId: workspaceScope ? null : active,
            ids: removed,
            code: archiveError.code,
            message: archiveError.message,
            details: archiveError.details,
            hint: archiveError.hint,
          });
          toast(`Could not delete ${removed.length === 1 ? "this row" : "these rows"}: ${errorText(archiveError, "unknown error")}`);
          return false;
        }
      }
    }
    if (customTable && name === customTable.id)
      setCustomTables((prev) => ({ ...prev, [active]: (prev[active] ?? []).map((t) => (t.id === name ? { ...t, rows: next } : t)) }));
    else setData((prev) => ({ ...prev, [active]: { ...prev[active], [name]: next } }));
    return true;
  };

  const addClient = async () => {
    const name = dialogs.clientName.trim();
    if (!name) return;
    if (userEmail && userRole !== "owner") return toast("Only a workspace owner can create clients");
    const workspaceId = current?.workspace_id ?? selectedWorkspaceId ?? userWorkspaceId;
    if (userEmail && !workspaceId) return toast("Could not identify your workspace. Reload after applying the workspace repair migration.");
    const id = crypto.randomUUID();
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
    const client: Client = {
      id,
      name,
      initials,
      color: ["#e6e7dc", "#f3ded8", "#dce8ef"][clients.length % 3],
      store: `${name.split(" ")[0]}’s Store`,
      workspace_id: workspaceId ?? undefined,
      user_id: userId ?? undefined,
      visibility: "selected",
    };
    dialogs.setClientBusy(true);
    try {
      if (supabase && userId) {
        const { error } = await supabase.from("clients").insert(client);
        if (error) throw error;
      }
      setClients([...clients, client]);
      setData({ ...data, [id]: emptyClientData() });
      setActive(id);
      setSheet("Overview");
      dialogs.setClientName("");
      dialogs.setModal(null);
      toast("Client workspace created");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create client workspace");
    } finally {
      dialogs.setClientBusy(false);
    }
  };

  const saveClientSettings = () => {
    if (!dialogs.settingsDraft) return;
    if (userEmail && userRole !== "owner") return toast("Only a workspace owner can edit client settings");
    const name = dialogs.settingsDraft.name.trim();
    if (!name) return toast("Enter a client name");
    const store = dialogs.settingsDraft.store.trim() || `${name.split(" ")[0]}’s Store`;
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
    setClients(clients.map((c) => (c.id === dialogs.settingsDraft!.id ? { ...c, name, store, initials, color: dialogs.settingsDraft!.color } : c)));
    dialogs.setModal(null);
    dialogs.setSettingsDraft(null);
    toast("Client updated");
  };

  const confirmDeleteClient = async () => {
    if (!dialogs.deleteTarget) return;
    const target = dialogs.deleteTarget;
    dialogs.setDeleteBusy(true);
    try {
      if (userEmail && userRole !== "owner") throw new Error("Only a workspace owner can archive clients");
      if (supabase && userId) {
        if (userRole !== "owner") throw new Error("Only a workspace owner can archive clients");
        const clientResult = await supabase
          .from("clients")
          .update({ archived_at: new Date().toISOString(), archived_by: userId })
          .eq("id", target.id)
          .select("id")
          .maybeSingle();
        if (clientResult.error || !clientResult.data) throw new Error("Could not archive this client");
      }
      const remaining = clients.filter((c) => c.id !== target.id);
      setClients(remaining);
      setData((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => id !== target.id)));
      setCustomTables((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => id !== target.id)));
      if (active === target.id) {
        setActive(remaining[0]?.id ?? "");
        setSheet("Overview");
      }
      dialogs.setDeleteTarget(null);
      dialogs.setModal(null);
      toast(`${target.name} was archived`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete this client");
    } finally {
      dialogs.setDeleteBusy(false);
    }
  };

  const addProduct = () => {
    if (!canWriteWorkspace) return toast("Your role is read-only");
    const title = dialogs.productName.trim();
    const sourceUrl = dialogs.productSourceUrl.trim();
    const ebayUrl = dialogs.productEbayUrl.trim();
    const cost = Number(dialogs.supplierCost);
    const price = Number(dialogs.ebayPrice);
    if (!title || !sourceUrl || !active) return;
    if (!ebayUrl) {
      toast("Add the eBay product link");
      return;
    }
    if (!isHttpUrl(ebayUrl)) {
      toast("The eBay link must start with https://");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price < 0) {
      toast("Enter valid supplier and eBay prices");
      return;
    }
    const profit = +(price * 0.87 - cost).toFixed(2);
    const newProduct = {
      id: `P-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      source: dialogs.productSource,
      sourceUrl,
      ebayUrl,
      cost,
      price,
      profit,
      margin: price ? Math.round((profit / price) * 100) : 0,
      status: "Researching",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      __createdBy: userId ?? undefined,
    };
    setRows("Product hunting", [newProduct, ...(data[active]?.["Product hunting"] ?? [])]);
    dialogs.setProductName("");
    dialogs.setProductSourceUrl("");
    dialogs.setProductEbayUrl("");
    dialogs.setProductSource("AliExpress");
    dialogs.setSupplierCost("");
    dialogs.setEbayPrice("");
    dialogs.setModal(null);
    toast("Product added to product hunting");
  };

  const addListing = () => {
    if (!canWriteWorkspace) return toast("Your role is read-only");
    const title = dialogs.listingTitle.trim();
    const sourceUrl = dialogs.listingSourceUrl.trim();
    if (!title || !sourceUrl || !active) return;
    if (!isHttpUrl(sourceUrl)) {
      toast("The source link must start with https://");
      return;
    }
    const listed = isoDateToShort(dialogs.listingListedDate);
    if (!listed) {
      toast("Choose the date the listing went live");
      return;
    }
    const newListing = {
      id: `LST-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      source: sourceFromUrl(sourceUrl),
      sourceUrl,
      date: listed,
    };
    setRows("Listings", [newListing, ...(data[active]?.["Listings"] ?? [])]);
    dialogs.setListingTitle("");
    dialogs.setListingSourceUrl("");
    dialogs.setListingListedDate("");
    dialogs.setModal(null);
    toast("Listing added to the listing table");
  };

  const addOrder = () => {
    if (!canWriteWorkspace) return toast("Your role is read-only");
    if (!active) return;
    const item = dialogs.orderDraft.item.trim();
    if (!item) {
      toast("Add the item name");
      return;
    }
    const quantity = Math.floor(Number(dialogs.orderDraft.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) {
      toast("Quantity must be at least 1");
      return;
    }
    const saleVal = Number(dialogs.orderDraft.subtotal),
      feeVal = Number(dialogs.orderDraft.transFee),
      adVal = Number(dialogs.orderDraft.adFees),
      postVal = Number(dialogs.orderDraft.postage),
      costVal = Number(dialogs.orderDraft.cost);
    if ([saleVal, feeVal, adVal, postVal, costVal].some((value) => !Number.isFinite(value) || value < 0)) {
      toast("Enter valid money amounts");
      return;
    }
    const ebayId = dialogs.orderDraft.orderId.trim();
    if (ebayId && (data[active]?.Orders ?? []).some((row) => String(row.id) === ebayId)) {
      toast("That eBay order ID already exists");
      return;
    }
    const id = ebayId || `23-10601-${Math.floor(10000 + Math.random() * 90000)}`;
    const earnings = +(saleVal - feeVal - adVal - postVal).toFixed(2);
    const order = {
      id,
      item,
      source: "AliExpress",
      sourceId: dialogs.orderDraft.sourceId.trim(),
      tracking: dialogs.orderDraft.tracking.trim(),
      quantity,
      sale: saleVal,
      fee: feeVal,
      adFees: adVal,
      postage: postVal,
      earnings,
      cost: costVal,
      profit: +(earnings - costVal).toFixed(2),
      discount: 0,
      returnFee: 0,
      ebayReturnFee: 0,
      status: "Processing",
      date: isoDateToShort(dialogs.orderDraft.date) || new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    };
    setRows("Orders", [order, ...(data[active]?.Orders ?? [])]);
    dialogs.setOrderDraft(orderDraftTemplate());
    dialogs.setModal(null);
    toast("Order added to the order table");
  };

  const createTableFromImport = async () => {
    if (!canWriteWorkspace) {
      toast("Your role is read-only");
      return;
    }
    if (!active || !current) {
      toast("Create or select a client before importing a table");
      return;
    }
    dialogs.setImportBusy(true);
    try {
      if (!dialogs.importFile) throw new Error("Choose a CSV file to import");
      if (!dialogs.importFile.name.toLowerCase().endsWith(".csv")) throw new Error("Upload a .csv file");
      if (dialogs.importFile.size > 8_000_000) throw new Error("This file is too large to import at once (8 MB limit)");
      const csvText = await dialogs.importFile.text();
      const parsed = parseCsv(csvText);
      if (!parsed.columns.length) throw new Error("The spreadsheet needs a header row");
      const id = `table-${Date.now()}`;
      const table: CustomTable = {
        id,
        name: dialogs.importName.trim() || dialogs.importFile?.name.replace(/\.csv$/i, "") || "Imported table",
        columns: parsed.columns,
        rows: parsed.rows.map((record, index) => ({ __rowId: `${id}-row-${index + 1}`, ...record })),
      };
      setCustomTables((prev) => ({ ...prev, [active]: [...(prev[active] ?? []), table] }));
      setSheet(id);
      dialogs.setImportName("");
      dialogs.setImportFile(null);
      dialogs.setModal(null);
      toast(`Imported ${table.rows.length} rows`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Spreadsheet import failed");
    } finally {
      dialogs.setImportBusy(false);
    }
  };

  const addRow = () => {
    if (!canWriteWorkspace) return toast("Your role is read-only");
    if (sheet === "Overview") return;
    if (sheet === "Product hunting") {
      dialogs.openProduct();
      return;
    }
    if (sheet === "Listings") {
      dialogs.openListing();
      return;
    }
    if (sheet === "Orders") {
      dialogs.openOrder();
      return;
    }
    if (customTable) {
      const row = { __rowId: `${sheet}-row-${Date.now()}`, ...Object.fromEntries(customTable.columns.map((column) => [column, ""])) };
      setRows(sheet, [row, ...rows]);
      toast("New row added");
      return;
    }
  };

  const beginEditRow = (row: Record<string, any>) => {
    if (!canWriteWorkspace) return toast("Your role is read-only");
    dialogs.setEditingRow(row);
    dialogs.setEditDraft({ ...row, ...(sheet === "Product hunting" ? { ebayUrl: row.ebayUrl ?? "" } : {}) });
    dialogs.setModal("edit");
  };

  const saveEditedRow = () => {
    if (!canWriteWorkspace) return toast("Your role is read-only");
    if (!dialogs.editingRow) return;
    const key = rowKey(dialogs.editingRow);
    const nextDraft = { ...dialogs.editDraft };
    if (!customTable && sheet === "Product hunting") {
      if (!String(nextDraft.ebayUrl ?? "").trim()) {
        toast("Add the eBay product link before saving");
        return;
      }
      if (!isHttpUrl(String(nextDraft.ebayUrl))) {
        toast("The eBay link must start with https://");
        return;
      }
    }
    if (!customTable && sheet === "Product hunting") {
      nextDraft.profit = +(nextDraft.price * 0.87 - nextDraft.cost).toFixed(2);
      nextDraft.margin = nextDraft.price ? Math.round((nextDraft.profit / nextDraft.price) * 100) : 0;
    }
    if (!customTable && sheet === "Orders") {
      nextDraft.earnings = orderEarnings(nextDraft);
      nextDraft.profit = +((Number(nextDraft.earnings) || 0) - (Number(nextDraft.cost) || 0)).toFixed(2);
    }
    setRows(
      sheet,
      rows.map((row) => (rowKey(row) === key ? nextDraft : row)),
    );
    setSelectedRows((current) => current.filter((id) => id !== key));
    dialogs.setEditingRow(null);
    dialogs.setEditDraft({});
    dialogs.setModal(null);
    toast("Row updated");
  };

  const deleteSelectedRows = async () => {
    if (!selectedRows.length) return;
    if (!canWriteWorkspace) return toast("Your role is read-only");
    const ok = await setRows(
      sheet,
      rows.filter((row) => !selectedRows.includes(rowKey(row))),
    );
    if (!ok) return;
    setSelectedRows([]);
    toast("Selected rows deleted");
  };

  const toggleRowSelection = (key: string) =>
    setSelectedRows((current) => (current.includes(key) ? current.filter((id) => id !== key) : [...current, key]));

  const allVisibleSelected = filtered.length > 0 && filtered.every((row: any) => selectedRows.includes(rowKey(row)));

  const toggleVisibleSelection = () =>
    setSelectedRows(
      allVisibleSelected
        ? (current) => current.filter((id) => !filtered.some((row: any) => rowKey(row) === id))
        : Array.from(new Set([...selectedRows, ...filtered.map((row: any) => rowKey(row))])),
    );

  const deleteRow = async (row: Record<string, any>) => {
    await setRows(
      sheet,
      rows.filter((candidate) => candidate !== row),
    );
  };

  const updateCell = (rowIndex: number, key: string, value: string) => {
    if (!canWriteWorkspace) return toast("Your role is read-only");
    if (sheet === "Overview") return;
    const targetSheet = sheet;
    const next = [...rows];
    const old = { ...next[rowIndex] };
    if (customTable) {
      old[key] = value;
      next[rowIndex] = old;
      setRows(targetSheet, next);
      return;
    }
    const numeric = ["cost", "price", "sale", "fee", "profit", "margin", "quantity", "adFees", "postage", "discount", "returnFee", "ebayReturnFee"].includes(key);
    old[key] = numeric ? parseFloat(value) || 0 : value;
    if (targetSheet === "Product hunting" && ["cost", "price"].includes(key)) {
      old.profit = +(old.price * 0.87 - old.cost).toFixed(2);
      old.margin = old.price ? Math.round((old.profit / old.price) * 100) : 0;
    }
    if (targetSheet === "Orders") {
      old.earnings = orderEarnings(old);
      old.profit = +((Number(old.earnings) || 0) - (Number(old.cost) || 0)).toFixed(2);
    }
    next[rowIndex] = old;
    setRows(targetSheet, next);
  };

  const exportCsv = () => {
    if (sheet === "Overview") return;
    if (!rows.length) {
      toast("Add some rows before exporting");
      return;
    }
    const headers = customTable ? customTable.columns : Object.keys(rows[0]).filter((h) => h !== "id");
    const csv = [
      headers.join(","),
      ...rows.map((r: any) => headers.map((h) => `"${String(r[h] ?? "").replaceAll('"', '""')}"`).join(",")),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${current?.name ?? "workspace"}-${(customTable?.name ?? sheet).toLowerCase().replaceAll(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Spreadsheet export downloaded");
  };

  const reset = () => {
    setClients([]);
    setData({});
    setCustomTables({});
    setActive("");
    setSheet("Overview");
  };

  return {
    clients,
    active,
    setActive,
    sheet,
    setSheet,
    data,
    customTables,
    query,
    setQuery,
    sourceFilter,
    setSourceFilter,
    selectedRows,
    setSelectedRows,
    canWriteWorkspace,
    visibleClients,
    visibleData,
    workspaceScope,
    current,
    sharedTableAccess,
    items,
    activeCustomTables,
    customTable,
    displaySheet,
    rows,
    rowKey,
    filtered,
    allOrders,
    orderProfit,
    listingsCount,
    ordersTotals,
    allVisibleSelected,
    attributionFor,
    loadWorkspace,
    addClient,
    saveClientSettings,
    confirmDeleteClient,
    addProduct,
    addListing,
    addOrder,
    createTableFromImport,
    addRow,
    beginEditRow,
    saveEditedRow,
    deleteSelectedRows,
    toggleRowSelection,
    toggleVisibleSelection,
    deleteRow,
    updateCell,
    exportCsv,
    reset,
  };
}

export type WorkspaceDataApi = ReturnType<typeof useWorkspaceData>;
