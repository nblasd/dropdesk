"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowDownToLine, ArrowLeftRight, ArrowUpRight, BadgeCheck, Bell, Menu, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Command, Copy, CreditCard, FileSpreadsheet, Filter, LayoutDashboard, ListPlus, LogOut, MoreHorizontal, Package, Pencil, Plus, Search, Settings2, ShoppingBag, Sparkles, Store, TrendingUp, Users, UserPlus, Trash2, X, type LucideIcon } from "lucide-react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Client = { id: string; name: string; initials: string; color: string; store: string; workspace_id?: string; user_id?: string; visibility?: "workspace"|"selected"|"private" };
type Product = { id: string; title: string; source: string; sourceUrl?: string; cost: number; price: number; profit: number; margin: number; status: string; date: string };
type Listing = { id: string; title: string; source: string; price: number; sku: string; status: string; date: string };
type Order = { id: string; sourceId: string; source: string; item: string; cost: number; sale: number; fee: number; profit: number; status: string; date: string };
type Sheet = "Overview" | string;
type BuiltInTable = "Product hunting" | "Listings" | "Orders";
type CustomTable = { id: string; name: string; columns: string[]; rows: Record<string, any>[] };
type WorkspaceMember = { user_id: string; email: string; role: "owner"|"manager"|"va"|"viewer"; client_ids: string[]; shared_table_access?: boolean; joined_at: string };
type InviteRecipient = { user_id: string; public_id: string; display_name: string };
type IncomingInvitation = { id: string; workspace_id: string; workspace_name: string; inviter_name: string; role: "manager"|"va"|"viewer"; client_ids: string[]; shared_table?: boolean; created_at: string; expires_at: string };
type WorkspaceData = Record<string, Record<string, any[]>>;
const emptyClientData = (): WorkspaceData[string] => ({ "Product hunting": [], Listings: [], Orders: [] });
const isLegacyDemoClient = (id: string) => /^c[123]$/.test(id) || /-c[123]$/.test(id);
const tabs: Sheet[] = ["Overview", "Product hunting", "Listings", "Orders"];
// Sentinel "client" id that holds rows belonging to the workspace itself (no client).
const WORKSPACE_SCOPE_ID = "__workspace__";
const money = (n:number) => `$${n.toFixed(2)}`;
const shortDate = (s:string) => s;
 const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [active, setActive] = useState("");
  const [sheet, setSheet] = useState<Sheet>("Overview");
  const [data, setData] = useState<WorkspaceData>({});
  const [customTables, setCustomTables] = useState<Record<string, CustomTable[]>>({});
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"client"|"row"|"auth"|"import"|"product"|"edit"|"clientSettings"|"deleteClient"|"invite"|null>(null);
  const [clientName, setClientName] = useState("");
  const [productName, setProductName] = useState("");
  const [productSourceUrl, setProductSourceUrl] = useState("");
  const [productEbayUrl, setProductEbayUrl] = useState("");
  const [productSource, setProductSource] = useState("AliExpress");
  const [supplierCost, setSupplierCost] = useState("");
  const [ebayPrice, setEbayPrice] = useState("");
  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File|null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup"|"login">("signup");
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [supabase, setSupabase] = useState<SupabaseClient|null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string|null>(null);
  const [userPublicId, setUserPublicId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [incomingInvitations, setIncomingInvitations] = useState<IncomingInvitation[]>([]);
  const [invitationActionId, setInvitationActionId] = useState<string|null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingRow, setEditingRow] = useState<Record<string,any>|null>(null);
  const [editDraft, setEditDraft] = useState<Record<string,any>>({});
  const [settingsDraft, setSettingsDraft] = useState<{id:string;name:string;store:string;color:string}|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client|null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clientBusy, setClientBusy] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceMembersError, setWorkspaceMembersError] = useState("");
  const [workspaceMembersWarning, setWorkspaceMembersWarning] = useState("");
  const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [userWorkspaceId, setUserWorkspaceId] = useState<string|null>(null);
  const [userRole, setUserRole] = useState<"owner"|"manager"|"va"|"viewer">("viewer");
  const [memberships,setMemberships]=useState<{workspace_id:string;role:"owner"|"manager"|"va"|"viewer";shared_table_access?:boolean}[]>([]);
  const [selectedWorkspaceId,setSelectedWorkspaceId]=useState<string|null>(null);
  const [invitePublicId,setInvitePublicId]=useState("");
  const [inviteRecipient,setInviteRecipient]=useState<InviteRecipient|null>(null);
  const [inviteLookupBusy,setInviteLookupBusy]=useState(false);
  const [inviteRole,setInviteRole]=useState<"manager"|"va"|"viewer">("va");
  const [inviteClients,setInviteClients]=useState<string[]>([]);
  const [inviteBusy,setInviteBusy]=useState(false);
  const [inviteError,setInviteError]=useState("");
  const [inviteSharedTable,setInviteSharedTable]=useState(true);
  const [sharedRowsReady,setSharedRowsReady]=useState(true);
  const canWriteWorkspace = !userEmail || userRole !== "viewer";
  const inviteRecipientIsMember = !!inviteRecipient && workspaceMembers.some(member=>member.user_id===inviteRecipient.user_id);
  const visibleClients = selectedWorkspaceId ? clients.filter(c=>c.workspace_id===selectedWorkspaceId) : clients;
  const visibleData:WorkspaceData = selectedWorkspaceId ? Object.fromEntries(visibleClients.map(c=>[c.id,data[c.id]??emptyClientData()])) : data;
  const workspaceScope = active === WORKSPACE_SCOPE_ID;
  const workspaceScopeClient: Client = { id: WORKSPACE_SCOPE_ID, name: "Workspace products", initials: "WP", color: "#dfe8e1", store: "Shared across the workspace · not tied to a client", workspace_id: selectedWorkspaceId ?? undefined };
  const current = workspaceScope ? workspaceScopeClient : (visibleClients.find(c=>c.id===active) ?? visibleClients[0]);
  // Owners always have the shared table; members need an explicit grant (undefined = older DB without the column).
  const sharedTableAccess = userRole === "owner" || memberships.find(m=>m.workspace_id===(selectedWorkspaceId??userWorkspaceId))?.shared_table_access !== false;
  useEffect(()=>{if(current&&current.id!==active)setActive(current.id)},[current?.id,active]);
  useEffect(()=>{const workspaceId=current?.workspace_id??selectedWorkspaceId;const membership=memberships.find(m=>m.workspace_id===workspaceId);if(membership){setUserWorkspaceId(membership.workspace_id);setUserRole(membership.role);if(workspaceId!==selectedWorkspaceId)setSelectedWorkspaceId(workspaceId)}},[current?.workspace_id,selectedWorkspaceId,memberships]);
  const refreshWorkspaceMembers=useCallback(async(sb:SupabaseClient,workspaceId:string)=>{
    setWorkspaceMembersLoading(true);
    setWorkspaceMembersError("");
    setWorkspaceMembersWarning("");
    try{
      const {data,error}=await sb.rpc("list_workspace_members",{p_workspace_id:workspaceId});
      if(!error&&Array.isArray(data)&&data.length){
        setWorkspaceMembers(data as WorkspaceMember[]);
        return;
      }
      // Keep the owner panel usable if an older deployed RPC returns no rows.
      const {data:rows,error:membersError}=await sb.from("workspace_members")
        .select("user_id,role,created_at").eq("workspace_id",workspaceId).order("created_at");
      if(!membersError&&rows?.length){
        setWorkspaceMembers(rows.map((member:any)=>({user_id:member.user_id,email:"",role:member.role,client_ids:[],joined_at:member.created_at})) as WorkspaceMember[]);
        setWorkspaceMembersWarning(error?`Limited member details loaded (RPC error ${error.code??"unknown"}).`:"The member details RPC returned no rows; showing basic memberships.");
        return;
      }
      setWorkspaceMembers([]);
      setWorkspaceMembersError(membersError?.message??error?.message??"No members were returned for this workspace.");
    }catch(error){
      setWorkspaceMembers([]);
      setWorkspaceMembersError(error instanceof Error?error.message:"Could not load workspace members.");
    }finally{setWorkspaceMembersLoading(false)}
  },[]);

  useEffect(()=>{
    try {
      const saved = localStorage.getItem("dropdesk-demo");
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedClients: Client[] = Array.isArray(parsed.clients) ? parsed.clients.filter((c: Client) => !isLegacyDemoClient(c.id)) : [];
        const savedClientIds = new Set(savedClients.map((c) => c.id));
        const savedData = Object.fromEntries(Object.entries(parsed.data ?? {}).filter(([id]) => savedClientIds.has(id))) as WorkspaceData;
        const savedTables = Object.fromEntries(Object.entries(parsed.customTables ?? {}).filter(([id]) => savedClientIds.has(id))) as Record<string, CustomTable[]>;
        setClients(savedClients);
        setData(savedData);
        setCustomTables(savedTables);
        const initialActive = savedClientIds.has(parsed.active) ? parsed.active : savedClients[0]?.id ?? "";
        setActive(initialActive);
        localStorage.setItem("dropdesk-demo", JSON.stringify({ clients: savedClients, data: savedData, customTables: savedTables, active: initialActive }));
      }
      const u=process.env.NEXT_PUBLIC_SUPABASE_URL, k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if(!u||!k){setAuthReady(true);return}
      const sb=createClient(u,k); setSupabase(sb);
      (async()=>{
        try{
          const {data:{session}}=await sb.auth.getSession();
          // No stored session: this is a normal signed-out visitor, not an error.
          if(!session)return;
          const {data,error}=await sb.auth.getUser();
          const user=data?.user;
          if(!user||error){
            const detail={code:(error as {code?:string}|null)?.code,name:(error as {name?:string}|null)?.name,status:(error as {status?:number}|null)?.status,message:(error as {message?:string}|null)?.message};
            // 401/403 means the stored token is dead (expired, or the account was deleted).
            // Drop it so the visitor can sign in instead of being stuck erroring on every load.
            if(detail.status===401||detail.status===403){
              console.warn("[Dropdesk][auth.restore] stale session cleared",detail);
              try{await sb.auth.signOut({scope:"local"})}catch{}
            }else console.warn("[Dropdesk][auth.restore] could not verify session",detail);
            return;
          }
          if(user.email){setUserEmail(user.email);if(await loadWorkspace(sb,user.id))setUserId(user.id)}
        }catch(error){
          console.warn("[Dropdesk][auth.restore] failed",{name:(error as {name?:string})?.name,message:error instanceof Error?error.message:String(error)});
        }finally{setAuthReady(true)}
      })();
    } catch { setAuthReady(true); }
  },[]);
  useEffect(()=>{setSelectedRows([])},[active,sheet]);
  useEffect(()=>{
    // Keep the page behind a dialog still: scrolling should move the dialog, never the page.
    if(!modal)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=previous};
  },[modal]);
  useEffect(()=>{try{localStorage.setItem("dropdesk-demo",JSON.stringify({clients,data,customTables,active}))}catch{}},[clients,data,customTables,active]);
  useEffect(()=>{
    if(!supabase||!userId)return;
    const timer=setTimeout(async()=>{
      const clientRows=clients.filter(c=>c.workspace_id&&c.user_id===userId).map(c=>({...c,user_id:userId}));
      if(clientRows.length) await supabase.from("clients").upsert(clientRows,{onConflict:"id"});
      const workspaceRows=Object.entries(data).flatMap(([clientId,sheets])=>Object.entries(sheets).flatMap(([sheet,records])=>(records as any[]).map(r=>{const {__rowId,__createdBy,...payload}=r;const shared=clientId===WORKSPACE_SCOPE_ID;return {id:String(r.id),user_id:__createdBy??userId,client_id:shared?null:clientId,workspace_id:shared?(selectedWorkspaceId??null):null,sheet,payload,updated_at:new Date().toISOString()}}))).filter(row=>row.client_id!==null||row.workspace_id!==null);
      if(workspaceRows.length){
        const {error:rowsError}=await supabase.from("workspace_rows").upsert(workspaceRows,{onConflict:"id"});
        if(rowsError&&(rowsError.code==="42703"||rowsError.code==="PGRST204")){
          // Shared-table migration not applied yet: save per-client rows the old way.
          const legacyRows=workspaceRows.filter(row=>row.client_id!==null).map(row=>({id:row.id,user_id:row.user_id,client_id:row.client_id,sheet:row.sheet,payload:row.payload,updated_at:row.updated_at}));
          if(legacyRows.length) await supabase.from("workspace_rows").upsert(legacyRows,{onConflict:"id"});
        }
      }
      const tables=Object.entries(customTables).flatMap(([clientId,clientTables])=>clientTables.map(t=>({id:t.id,user_id:userId,client_id:clientId,name:t.name,columns:t.columns,rows:t.rows,updated_at:new Date().toISOString()})));
      if(tables.length) await supabase.from("workspace_tables").upsert(tables,{onConflict:"id"});
    },700);
    return ()=>clearTimeout(timer);
  },[supabase,userId,selectedWorkspaceId,clients,data,customTables]);
  const loadWorkspace=async(sb:SupabaseClient, uid:string, preferredWorkspaceId?:string|null):Promise<boolean>=>{
    const clientResult=await sb.from("clients").select("id,name,initials,color,store,workspace_id,user_id,visibility").is("archived_at",null);
    const [tableResult,membershipResult,profileResult]=await Promise.all([sb.from("workspace_tables").select("id,client_id,name,columns,rows").is("deleted_at",null),sb.from("workspace_members").select("workspace_id,role,shared_table_access").eq("user_id",uid).order("created_at"),sb.from("user_profiles").select("public_id").eq("user_id",uid).maybeSingle()]);
    let rowResult:any=await sb.from("workspace_rows").select("id,user_id,client_id,workspace_id,sheet,payload").is("deleted_at",null);
    if(rowResult.error&&(rowResult.error.code==="42703"||rowResult.error.code==="PGRST204")){
      // Shared-table migration not applied yet: keep the app working with client rows only.
      rowResult=await sb.from("workspace_rows").select("id,user_id,client_id,sheet,payload").is("deleted_at",null);
      setSharedRowsReady(false);
    }
    if(profileResult.error)console.error("[Dropdesk][profile.load] failed",{code:profileResult.error.code,message:profileResult.error.message,details:profileResult.error.details,hint:profileResult.error.hint});
    setUserPublicId(profileResult.data?.public_id??"");
    if(clientResult.error||rowResult.error||membershipResult.error){console.error("[Dropdesk][workspace.load] failed",{userId:uid,clients:clientResult.error&&{code:clientResult.error.code,message:clientResult.error.message,details:clientResult.error.details,hint:clientResult.error.hint},rows:rowResult.error&&{code:rowResult.error.code,message:rowResult.error.message,details:rowResult.error.details,hint:rowResult.error.hint},memberships:membershipResult.error&&{code:membershipResult.error.code,message:membershipResult.error.message,details:membershipResult.error.details,hint:membershipResult.error.hint}});toast("Could not load your workspace access. Apply the workspace access migrations in Supabase.");return false}
    const loadedMemberships=(membershipResult.data??[]) as {workspace_id:string;role:"owner"|"manager"|"va"|"viewer";shared_table_access?:boolean}[];
    setMemberships(loadedMemberships);
    const workspaceIds=loadedMemberships.map(m=>m.workspace_id);
    const ownerWorkspace=loadedMemberships.find(m=>m.role==="owner");
    const savedWorkspaceId=typeof window!=="undefined"?localStorage.getItem("dropdesk-selected-workspace"):null;
    const initialWorkspaceId=(preferredWorkspaceId&&workspaceIds.includes(preferredWorkspaceId)?preferredWorkspaceId:null)??(savedWorkspaceId&&workspaceIds.includes(savedWorkspaceId)?savedWorkspaceId:null)??ownerWorkspace?.workspace_id??workspaceIds[0]??null;
    if(!initialWorkspaceId){setWorkspaceMembers([]);toast("This account has no workspace yet. Apply the workspace repair migration in Supabase, then reload.");return false}
    const initialRole=loadedMemberships.find(m=>m.workspace_id===initialWorkspaceId)?.role??"viewer";
    setUserWorkspaceId(initialWorkspaceId);setUserRole(initialRole);setSelectedWorkspaceId(initialWorkspaceId);if(typeof window!=="undefined")localStorage.setItem("dropdesk-selected-workspace",initialWorkspaceId);
    if(tableResult.error)toast("Custom table cloud sync needs the workspace_tables migration in Supabase.");
    const allClients = (clientResult.data ?? []) as Client[];
    if(initialRole==="owner") await refreshWorkspaceMembers(sb,initialWorkspaceId);
    else {setWorkspaceMembers([]);setWorkspaceMembersError("");setWorkspaceMembersWarning("")}
      const remoteClients = allClients.map(client=>!client.workspace_id&&client.user_id===uid&&initialRole==="owner"?{...client,workspace_id:initialWorkspaceId}:client);
      const next: WorkspaceData = {};
      remoteClients.forEach((c) => { next[c.id] = emptyClientData(); });
      // Shared workspace table (no client) lives under a sentinel key.
      next[WORKSPACE_SCOPE_ID] = emptyClientData();
      rowResult.data?.forEach((row: any) => {
        if (row.client_id === null || row.client_id === undefined) {
          if (row.workspace_id === initialWorkspaceId && row.sheet === "Product hunting") next[WORKSPACE_SCOPE_ID]["Product hunting"].push({...row.payload,__rowId:row.id,__createdBy:row.user_id});
          return;
        }
        if (next[row.client_id] && row.sheet in next[row.client_id]) next[row.client_id][row.sheet as Exclude<Sheet, "Overview">].push({...row.payload,__rowId:row.id,__createdBy:row.user_id});
      });
      const nextTables:Record<string,CustomTable[]>={};
      tableResult.data?.forEach((table:any)=>{if(next[table.client_id]){(nextTables[table.client_id]??=[]).push({id:table.id,name:table.name,columns:Array.isArray(table.columns)?table.columns:[],rows:Array.isArray(table.rows)?table.rows:[]})}});
      setClients(remoteClients);setData(next);setCustomTables(nextTables);
      // With no clients yet, land on the shared table so the workspace is still usable.
      setActive(remoteClients[0]?.id ?? WORKSPACE_SCOPE_ID);
      if(!remoteClients.length)setSheet("Product hunting");
      return true;
  };
  const refreshIncomingInvitations=useCallback(async()=>{
    if(!supabase||!userId)return;
    const {data,error}=await supabase.rpc("list_my_workspace_invitations");
    if(error){console.error("[Dropdesk][notifications.load] failed",{code:error.code,message:error.message,details:error.details,hint:error.hint});return}
    setIncomingInvitations((data??[]) as IncomingInvitation[]);
  },[supabase,userId]);
  useEffect(()=>{
    if(!supabase||!userId)return;
    void refreshIncomingInvitations();
    const timer=window.setInterval(()=>void refreshIncomingInvitations(),30000);
    return()=>window.clearInterval(timer);
  },[supabase,userId,refreshIncomingInvitations]);
  useEffect(()=>{
    if(sheet==="Settings"&&userRole==="owner"&&supabase&&selectedWorkspaceId){
      void refreshWorkspaceMembers(supabase,selectedWorkspaceId);
    }
  },[sheet,userRole,supabase,selectedWorkspaceId,refreshWorkspaceMembers]);
  const items = current ? data[current.id] : undefined;
  const activeCustomTables=current?customTables[current.id]??[]:[];
  const customTable=activeCustomTables.find(t=>t.id===sheet);
  const displaySheet=customTable?.name??sheet;
  const rows = customTable?.rows ?? (sheet!=="Overview" && items ? (items[sheet] ?? []) : []);
  const rowKey=(row:Record<string,any>)=>String(row.__rowId??row.id);
  const filtered = useMemo(()=>rows.filter((r:any)=>{
    const text=Object.values(r).join(" ").toLowerCase();
    return text.includes(query.toLowerCase()) && (sourceFilter==="All sources" || r.source===sourceFilter);
  }),[rows,query,sourceFilter]);
  const allOrders = Object.values(visibleData).flatMap(d=>d.Orders||[]);
  const orderProfit = allOrders.reduce((a,r)=>a+r.profit,0);
  const setRows = async(name:string, next:any[]):Promise<boolean>=>{
    if(!canWriteWorkspace){toast("Your role is read-only");return false}
    if(!(customTable&&name===customTable.id)&&supabase&&userId){
      const prior=data[active]?.[name]??[];const remaining=new Set(next.map(row=>String(row.__rowId??row.id)));
      const removed=prior.map(row=>String(row.__rowId??row.id)).filter(id=>!remaining.has(id));
      if(removed.length){
        const archived={deleted_at:new Date().toISOString(),deleted_by:userId};
        // Postgres checks the SELECT policies against the *new* row too, so an
        // archive rejected by RLS must not disappear from the screen. Only drop
        // the row locally after Supabase confirms it.
        let archiveError:{code?:string;message?:string;details?:string;hint?:string}|null=null;
        try{
          const {error}=await (workspaceScope
            ? supabase.from("workspace_rows").update(archived).is("client_id",null).eq("workspace_id",selectedWorkspaceId).in("id",removed)
            : supabase.from("workspace_rows").update(archived).eq("client_id",active).in("id",removed));
          archiveError=error;
        }catch(error){archiveError={message:error instanceof Error?error.message:String(error)}}
        if(archiveError){
          console.error("[Dropdesk][rows.archive] failed",{workspaceId:selectedWorkspaceId,clientId:workspaceScope?null:active,ids:removed,code:archiveError.code,message:archiveError.message,details:archiveError.details,hint:archiveError.hint});
          toast(`Could not delete ${removed.length===1?"this row":"these rows"}: ${errorText(archiveError,"unknown error")}`);
          return false;
        }
      }
    }
    customTable&&name===customTable.id?setCustomTables(prev=>({...prev,[active]:(prev[active]??[]).map(t=>t.id===name?{...t,rows:next}:t)})):setData(prev=>({...prev,[active]:{...prev[active], [name]:next}}));
    return true;
  };
  const addClient = async()=>{
    const name=clientName.trim(); if(!name)return;
    if(userEmail&&userRole!=="owner")return toast("Only a workspace owner can create clients");
    const workspaceId=current?.workspace_id??selectedWorkspaceId??userWorkspaceId;
    if(userEmail&&!workspaceId)return toast("Could not identify your workspace. Reload after applying the workspace repair migration.");
    const id=crypto.randomUUID(); const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    const client:Client={id,name,initials,color:["#e6e7dc","#f3ded8","#dce8ef"][clients.length%3],store:`${name.split(" ")[0]}’s Store`,workspace_id:workspaceId??undefined,user_id:userId??undefined,visibility:"selected"};
    setClientBusy(true);
    try{
      if(supabase&&userId){const {error}=await supabase.from("clients").insert(client);if(error)throw error;}
      setClients([...clients,client]); setData({...data,[id]:emptyClientData()}); setActive(id); setSheet("Overview"); setClientName(""); setModal(null); toast("Client workspace created");
    }catch(error){toast(error instanceof Error?error.message:"Could not create client workspace")}finally{setClientBusy(false)}
  };
  const openClientSettings=(client:Client)=>{setSettingsDraft({id:client.id,name:client.name,store:client.store,color:client.color});setModal("clientSettings")};
  const saveClientSettings=()=>{
    if(!settingsDraft)return;
    if(userEmail&&userRole!=="owner")return toast("Only a workspace owner can edit client settings");
    const name=settingsDraft.name.trim();
    if(!name)return toast("Enter a client name");
    const store=settingsDraft.store.trim()||`${name.split(" ")[0]}’s Store`;
    const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    setClients(clients.map(c=>c.id===settingsDraft.id?{...c,name,store,initials,color:settingsDraft.color}:c));
    setModal(null);setSettingsDraft(null);toast("Client updated");
  };
  const requestDeleteClient=(client:Client)=>{setDeleteTarget(client);setModal("deleteClient")};
  const confirmDeleteClient=async()=>{
    if(!deleteTarget)return;
    const target=deleteTarget;
    setDeleteBusy(true);
    try{
      if(userEmail&&userRole!=="owner")throw new Error("Only a workspace owner can archive clients");
      if(supabase&&userId){
        if(userRole!=="owner")throw new Error("Only a workspace owner can archive clients");
        const clientResult=await supabase.from("clients").update({archived_at:new Date().toISOString(),archived_by:userId}).eq("id",target.id).select("id").maybeSingle();
        if(clientResult.error||!clientResult.data)throw new Error("Could not archive this client");
      }
      const remaining=clients.filter(c=>c.id!==target.id);
      setClients(remaining);
      setData(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>id!==target.id)));
      setCustomTables(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>id!==target.id)));
      if(active===target.id){setActive(remaining[0]?.id??"");setSheet("Overview")}
      setDeleteTarget(null);setModal(null);toast(`${target.name} was archived`);
    }catch(error){toast(error instanceof Error?error.message:"Could not delete this client")}finally{setDeleteBusy(false)}
  };
  const toast=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(""),2600)};
  // Supabase returns PostgrestError as a plain object, so `error instanceof Error`
  // is false and the real reason was replaced by a generic message.
  const errorText=(error:unknown,fallback:string)=>{
    const detail=error as {message?:string;details?:string;hint?:string}|null|undefined;
    return detail?.message?.trim()||detail?.details?.trim()||(error instanceof Error&&error.message.trim())||fallback;
  };
  const addProduct=()=>{
    if(!canWriteWorkspace)return toast("Your role is read-only");
    const title=productName.trim();
    const sourceUrl=productSourceUrl.trim();
    const ebayUrl=productEbayUrl.trim();
    const cost=Number(supplierCost);
    const price=Number(ebayPrice);
    if(!title||!sourceUrl||!active)return;
    if(!ebayUrl){toast("Add the eBay product link");return}
    if(!isHttpUrl(ebayUrl)){toast("The eBay link must start with https://");return}
    if(!Number.isFinite(cost)||cost<0||!Number.isFinite(price)||price<0){toast("Enter valid supplier and eBay prices");return}
    const profit=+(price*.87-cost).toFixed(2);
    const newProduct={id:`P-${Math.floor(1000+Math.random()*9000)}`,title,source:productSource,sourceUrl,ebayUrl,cost,price,profit,margin:price?Math.round(profit/price*100):0,status:"Researching",date:new Date().toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"})};
    setRows("Product hunting",[newProduct,...(data[active]?.["Product hunting"]??[])]);
    setProductName("");setProductSourceUrl("");setProductEbayUrl("");setProductSource("AliExpress");setSupplierCost("");setEbayPrice("");setModal(null);toast("Product added to product hunting");
  };
  const createTableFromImport=async()=>{
    if(!canWriteWorkspace){toast("Your role is read-only");return}
    if(!active||!current){toast("Create or select a client before importing a table");return}
    setImportBusy(true);
    try{
      if(!importFile) throw new Error("Choose a CSV file to import");
      if(!importFile.name.toLowerCase().endsWith(".csv")) throw new Error("Upload a .csv file");
      if(importFile.size>8_000_000) throw new Error("This file is too large to import at once (8 MB limit)");
      const csvText=await importFile.text();
      const parsed=parseCsv(csvText);
      if(!parsed.columns.length) throw new Error("The spreadsheet needs a header row");
      const id=`table-${Date.now()}`;
      const table:CustomTable={id,name:importName.trim()||importFile?.name.replace(/\.csv$/i,"")||"Imported table",columns:parsed.columns,rows:parsed.rows.map((record,index)=>({__rowId:`${id}-row-${index+1}`,...record}))};
      setCustomTables(prev=>({...prev,[active]:[...(prev[active]??[]),table]}));
      setSheet(id);setImportName("");setImportFile(null);setModal(null);toast(`Imported ${table.rows.length} rows`);
    }catch(error){toast(error instanceof Error?error.message:"Spreadsheet import failed")}finally{setImportBusy(false)}
  };
  const addRow=()=>{
    if(!canWriteWorkspace)return toast("Your role is read-only");
    if(sheet==="Overview")return;
    if(sheet==="Product hunting"){setModal("product");return}
    if(customTable){const row={__rowId:`${sheet}-row-${Date.now()}`,...Object.fromEntries(customTable.columns.map(column=>[column,""]))};setRows(sheet,[row,...rows]);toast("New row added");return}
    const targetSheet=sheet;
    const id=`${targetSheet==="Listings"?"LST":targetSheet==="Orders"?"23-10601":"P"}-${Math.floor(1000+Math.random()*9000)}`;
    const date="Oct 17, 2026";
    const newRow = targetSheet==="Product hunting" ? {id,title:"New product idea",source:"AliExpress",cost:0,price:0,profit:0,margin:0,status:"Researching",date} : targetSheet==="Listings" ? {id,title:"New eBay listing",source:"AliExpress",price:0,sku:"NEW-001",status:"Draft",date} : {id,sourceId:"",source:"AliExpress",item:"New order",cost:0,sale:0,fee:0,profit:0,status:"Processing",date};
    setRows(targetSheet,[newRow,...rows]); toast("New row added");
  };
  const beginEditRow=(row:Record<string,any>)=>{if(!canWriteWorkspace)return toast("Your role is read-only");setEditingRow(row);setEditDraft({...row,...(sheet==="Product hunting"?{ebayUrl:row.ebayUrl??""}:{})});setModal("edit")};
  const saveEditedRow=()=>{
    if(!canWriteWorkspace)return toast("Your role is read-only");
    if(!editingRow)return;
    const key=rowKey(editingRow);const nextDraft={...editDraft};
    if(!customTable&&sheet==="Product hunting"){
      if(!String(nextDraft.ebayUrl??"").trim()){toast("Add the eBay product link before saving");return}
      if(!isHttpUrl(String(nextDraft.ebayUrl))){toast("The eBay link must start with https://");return}
    }
    if(!customTable&&sheet==="Product hunting"){nextDraft.profit=+(nextDraft.price*.87-nextDraft.cost).toFixed(2);nextDraft.margin=nextDraft.price?Math.round(nextDraft.profit/nextDraft.price*100):0}
    if(!customTable&&sheet==="Orders")nextDraft.profit=+(nextDraft.sale-nextDraft.cost-nextDraft.fee).toFixed(2);
    setRows(sheet,rows.map(row=>rowKey(row)===key?nextDraft:row));setSelectedRows(current=>current.filter(id=>id!==key));setEditingRow(null);setEditDraft({});setModal(null);toast("Row updated");
  };
  const deleteSelectedRows=async()=>{if(!selectedRows.length)return;if(!canWriteWorkspace)return toast("Your role is read-only");const ok=await setRows(sheet,rows.filter(row=>!selectedRows.includes(rowKey(row))));if(!ok)return;setSelectedRows([]);toast("Selected rows deleted")};
  const toggleRowSelection=(key:string)=>setSelectedRows(current=>current.includes(key)?current.filter(id=>id!==key):[...current,key]);
  const allVisibleSelected=filtered.length>0&&filtered.every((row:any)=>selectedRows.includes(rowKey(row)));
  const toggleVisibleSelection=()=>setSelectedRows(allVisibleSelected?current=>current.filter(id=>!filtered.some((row:any)=>rowKey(row)===id)):Array.from(new Set([...selectedRows,...filtered.map((row:any)=>rowKey(row))])));
  const updateCell=(rowIndex:number,key:string,value:string)=>{
    if(!canWriteWorkspace)return toast("Your role is read-only");
    if(sheet==="Overview")return;
    const targetSheet=sheet;
    const next=[...rows]; const old={...next[rowIndex]};
    if(customTable){old[key]=value;next[rowIndex]=old;setRows(targetSheet,next);return}
    const numeric=["cost","price","sale","fee","profit","margin"].includes(key);
    old[key]=numeric ? (parseFloat(value)||0) : value;
    if(targetSheet==="Product hunting" && ["cost","price"].includes(key)){old.profit=+(old.price*.87-old.cost).toFixed(2);old.margin=old.price?Math.round(old.profit/old.price*100):0;}
    if(targetSheet==="Orders" && ["cost","sale","fee"].includes(key)) old.profit=+(old.sale-old.cost-old.fee).toFixed(2);
    next[rowIndex]=old; setRows(targetSheet,next);
  };
  const exportCsv=()=>{
    if(sheet==="Overview")return;
    if(!rows.length){toast("Add some rows before exporting");return;}
    const headers=customTable?customTable.columns:Object.keys(rows[0]).filter(h=>h!=="id"); const csv=[headers.join(","),...rows.map((r:any)=>headers.map(h=>`"${String(r[h]??"").replaceAll('"','""')}"`).join(","))].join("\r\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${current?.name??"workspace"}-${(customTable?.name??sheet).toLowerCase().replaceAll(" ","-")}.csv`;a.click();URL.revokeObjectURL(a.href);toast("Spreadsheet export downloaded");
  };
  const submitAuth=async(e:React.FormEvent)=>{e.preventDefault();if(!authEmail.includes("@"))return toast("Enter a valid email address");if(authPassword.length<8)return toast("Use a password with at least 8 characters");if(authMode==="signup"&&!authName.trim())return toast("Enter your name");if(!supabase)return toast("Connect Supabase to create a secure account");setAuthBusy(true);try{const result=authMode==="signup"?await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{full_name:authName.trim(),name:authName.trim()},emailRedirectTo:window.location.origin}}):await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});if(result.error){console.error("[Dropdesk][auth.submit] failed",{mode:authMode,message:result.error.message,status:result.error.status,code:result.error.code,email:authEmail});return toast(result.error.message)}const user=result.data.user;if(result.data.session&&user){setUserEmail(user.email??authEmail);if(await loadWorkspace(supabase,user.id))setUserId(user.id);setModal(null);toast(authMode==="signup"?"Your account is ready":"You’re signed in");}else if(authMode==="signup"){setModal(null);toast("Account created. If email confirmation is enabled, use the link in your inbox.");}else toast("Sign-in did not return an active session");}finally{setAuthBusy(false);}};
  const continueWithGoogle=async()=>{if(!supabase)return toast("Connect Supabase to enable Google sign-in");const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});if(error)toast(error.message);};
  const findInviteRecipient=async()=>{
    if(!supabase)return toast("Connect Supabase to look up a user");
    const code=invitePublicId.trim().toUpperCase();if(!code)return toast("Enter their Dropdesk ID");
    setInviteLookupBusy(true);setInviteRecipient(null);setInviteError("");
    try{
      const {data,error}=await supabase.rpc("lookup_user_by_public_id",{p_public_id:code});
      if(error)throw error;
      const recipient=Array.isArray(data)?data[0] as InviteRecipient|undefined:undefined;
      if(!recipient){setInviteError("No user was found with that Dropdesk ID");return}
      setInviteRecipient(recipient);
    }catch(error){console.error("[Dropdesk][invite.lookup] failed",{code:(error as {code?:string})?.code,message:(error as {message?:string})?.message,details:(error as {details?:string})?.details,hint:(error as {hint?:string})?.hint});setInviteError(errorText(error,"Could not find that user"))}
    finally{setInviteLookupBusy(false)}
  };
  const createInvitation=async()=>{
    const workspaceId=current?.workspace_id??selectedWorkspaceId??userWorkspaceId;
    const workspaceClientIds=new Set(visibleClients.filter(client=>client.workspace_id===workspaceId).map(client=>client.id));
    const selectedClientIds=inviteClients.filter(clientId=>workspaceClientIds.has(clientId));
    if(userRole!=="owner"){setInviteError("Only a workspace owner can invite teammates");return}
    if(!supabase||!workspaceId){setInviteError("Could not identify the workspace for this invitation");return}
    if(!inviteRecipient){setInviteError("Find a user by their Dropdesk ID first");return}
    if(inviteRecipientIsMember){setInviteError(`${inviteRecipient.display_name} is already a member of this workspace.`);return}
    setInviteError("");setInviteBusy(true);
    const recipient=inviteRecipient;
    try{
      const send=(targetWorkspaceId:string,withShared:boolean)=>supabase.rpc("send_workspace_invitation",withShared?{p_workspace_id:targetWorkspaceId,p_recipient_public_id:recipient.public_id,p_role:inviteRole,p_client_ids:selectedClientIds,p_shared_table:inviteSharedTable}:{p_workspace_id:targetWorkspaceId,p_recipient_public_id:recipient.public_id,p_role:inviteRole,p_client_ids:selectedClientIds});
      let {error}=await send(workspaceId,true);
      // Migration 20261026 not applied yet: retry with the older 4-argument RPC.
      if(error&&(error.code==="PGRST202"||error.code==="42883")) ({error}=await send(workspaceId,false));
      // A client row can carry a stale workspace id, which makes the RPC answer
      // "not authorized" even for the real owner. Fall back to the owned workspace once.
      if(error&&/not authorized/i.test(error.message)&&userWorkspaceId&&userWorkspaceId!==workspaceId){
        ({error}=await send(userWorkspaceId,true));
        if(error&&(error.code==="PGRST202"||error.code==="42883")) ({error}=await send(userWorkspaceId,false));
      }
      if(error)throw error;
      setModal(null);toast(`Invitation sent to ${recipient.display_name}`);
    }
    catch(error){
      console.error("[Dropdesk][invite.create] failed",{code:(error as {code?:string})?.code,message:(error as {message?:string})?.message,details:(error as {details?:string})?.details,hint:(error as {hint?:string})?.hint,workspaceId,recipientPublicId:inviteRecipient.public_id,role:inviteRole,clientIds:selectedClientIds});
      setInviteError(errorText(error,"Could not send invitation"));
    }
    finally{setInviteBusy(false)}
  };
  const respondToInvitation=async(invitation:IncomingInvitation,action:"accept"|"decline")=>{
    if(!supabase||!userId)return;
    setInvitationActionId(invitation.id);
    try{
      const {data,error}=await supabase.rpc(action==="accept"?"accept_workspace_invitation":"decline_workspace_invitation",{p_invitation_id:invitation.id});
      if(error)throw error;
      setIncomingInvitations(previous=>previous.filter(item=>item.id!==invitation.id));
      if(action==="accept"){
        if(typeof data!=="string"||!await loadWorkspace(supabase,userId,data))throw new Error("You joined, but the workspace could not be loaded. Reload the page.");
        toast(`Joined ${invitation.workspace_name}`);
      }else toast("Invitation declined");
    }catch(error){console.error(`[Dropdesk][invite.${action}] failed`,{code:(error as {code?:string})?.code,message:(error as {message?:string})?.message,details:(error as {details?:string})?.details,hint:(error as {hint?:string})?.hint,invitationId:invitation.id});toast(errorText(error,`Could not ${action} invitation`))}
    finally{setInvitationActionId(null)}
  };
  const copyPublicId=async()=>{if(!userPublicId)return toast("Your Dropdesk ID is not available yet");try{await navigator.clipboard.writeText(userPublicId);toast("Your Dropdesk ID was copied")}catch{toast(`Your Dropdesk ID is ${userPublicId}`)}};
  const toggleSharedAccess=async(member:WorkspaceMember)=>{
    const workspaceId=selectedWorkspaceId??userWorkspaceId;
    if(!supabase||!workspaceId)return toast("Could not identify the workspace");
    if(userRole!=="owner")return toast("Only a workspace owner can change shared table access");
    const next=member.shared_table_access===false;
    try{
      const {error}=await supabase.rpc("set_shared_table_access",{p_workspace_id:workspaceId,p_user_id:member.user_id,p_enabled:next});
      if(error)throw error;
      setWorkspaceMembers(previous=>previous.map(existing=>existing.user_id===member.user_id?{...existing,shared_table_access:next}:existing));
      toast(next?"Shared table access granted":"Shared table access removed");
    }catch(error){console.error("[Dropdesk][shared.access] failed",{code:(error as {code?:string})?.code,message:(error as {message?:string})?.message});toast(errorText(error,"Could not change shared table access"))}
  };
  const revokeMember=async(member:WorkspaceMember)=>{
    const workspaceId=selectedWorkspaceId??userWorkspaceId;
    if(!supabase||!workspaceId)return toast("Could not identify the workspace");
    if(member.role==="owner")return toast("The workspace owner cannot be removed");
    if(!window.confirm(`Remove ${member.email||member.user_id} from this workspace and revoke all client access?`))return;
    try{
      const {error}=await supabase.rpc("revoke_workspace_member",{p_workspace_id:workspaceId,p_user_id:member.user_id});
      if(error)throw error;
      setWorkspaceMembers(previous=>previous.filter(existing=>existing.user_id!==member.user_id));
      toast("Workspace access removed");
    }catch(error){toast(error instanceof Error?error.message:"Could not remove workspace access")}
  };
  const signOut=async()=>{if(supabase)await supabase.auth.signOut();setUserId(null);setUserEmail("");setUserPublicId("");setIncomingInvitations([]);setClients([]);setData({});setCustomTables({});setWorkspaceMembers([]);setMemberships([]);setUserWorkspaceId(null);setSelectedWorkspaceId(null);setUserRole("viewer");setActive("");setSheet("Overview");setMenuOpen(false);setNotificationsOpen(false);toast("Signed out");};

  if (!authReady) return <main className="landing-loading"><span className="brand-mark"><ArrowLeftRight size={19} strokeWidth={2.4}/></span><b>dropdesk<span className="brand-dot">.</span></b></main>;

  return <main className={userEmail ? "app-shell" : "landing-shell"}>
    {!userEmail ? <LandingPage onStart={()=>{setAuthMode("signup");setModal("auth")}} onLogin={()=>{setAuthMode("login");setModal("auth")}}/> : <>
    {navOpen&&<button className="nav-scrim" aria-label="Close menu" onClick={()=>setNavOpen(false)}/>}
    <aside className={`sidebar ${navOpen?"nav-open":""}`} onClick={(event)=>{const target=event.target as HTMLElement;if(target.closest(".nav-link,.client-link,.new-client,.settings-link"))setNavOpen(false)}}>
      <div className="brand"><span className="brand-mark"><ArrowLeftRight size={19} strokeWidth={2.4}/></span><span>dropdesk<span className="brand-dot">.</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-switch"><span className="workspace-avatar">{userEmail?userEmail.slice(0,1).toUpperCase():"G"}</span><span className="workspace-text"><b>{userEmail?`${userEmail.split("@")[0]}’s workspace`:"Guest workspace"}</b><small>{userEmail?"Your workspace":"Guest preview"}</small></span></div>
      <div className="nav-group"><div className="nav-caption">MENU</div>
        <button className={`nav-link ${sheet==="Overview"?"active":""}`} onClick={()=>setSheet("Overview")}><LayoutDashboard size={17}/>Overview</button>
        {!workspaceScope&&<div className="workspace-table-menu">{(["Product hunting","Listings","Orders"] as BuiltInTable[]).map(name=><button key={name} className={`nav-link ${sheet===name?"active":""}`} disabled={!current} onClick={()=>{if(!current)return;setSheet(name)}}>{name==="Product hunting"?<Package size={17}/>:name==="Listings"?<ClipboardList size={17}/>:<ShoppingBag size={17}/>}<span>{name}</span></button>)}</div>}
        {sharedTableAccess&&<button className={`nav-link ${workspaceScope?"active":""}`} title="Product research that is not tied to a client" onClick={()=>{setActive(WORKSPACE_SCOPE_ID);setSheet("Product hunting");setQuery("")}}><Package size={17}/>Product hunting <span className="nav-shared-tag">shared</span></button>}
        {userRole==="owner"&&<button className="nav-link invite-nav" onClick={()=>{setInvitePublicId("");setInviteRecipient(null);setInviteError("");setInviteSharedTable(true);setInviteRole("va");setInviteClients([]);setModal("invite")}}><UserPlus size={17}/>Invite teammate</button>}
        {userRole==="owner"&&<button className={`nav-link ${sheet==="Settings"?"active":""}`} onClick={()=>setSheet("Settings")}><Users size={17}/>Team &amp; access</button>}
        <div className="nav-caption clients-caption"><span>YOUR CLIENTS</span>{userRole==="owner"&&<button className="tiny-add" onClick={()=>setModal("client")} aria-label="Add client"><Plus size={15}/></button>}</div>
        <div className="client-list">{visibleClients.map(c=><div className="client-nav-group" key={c.id}><button className={`client-link ${active===c.id?"selected":""}`} onClick={()=>{setActive(c.id);setSheet("Overview");setQuery("")}}><span className="client-avatar" style={{background:c.color}}>{c.initials}</span><span className="client-link-name">{c.name}</span></button></div>)}</div>
        {userRole==="owner"&&<button className="new-client" onClick={()=>setModal("client")}><Plus size={15}/> Add a client</button>}
      </div>
      <div className="sidebar-bottom">
        <button className={`nav-link settings-link ${sheet==="Settings"?"active":""}`} onClick={()=>{setSheet("Settings");setMenuOpen(false)}}><Settings2 size={17}/>Settings</button>
        <div className="profile-wrap"><button className="profile" onClick={()=>setMenuOpen(!menuOpen)}><span className="profile-avatar">{userEmail?userEmail.slice(0,2).toUpperCase():"G"}</span><span className="profile-copy"><b>{userEmail?userEmail.split("@")[0]:"Guest preview"}</b><small>{userEmail||"Sign in to save your workspace"}</small></span><MoreHorizontal size={17}/></button>{menuOpen&&<div className="profile-menu">{userEmail?<><div className="profile-public-id"><small>YOUR DROPDESK ID</small><b>{userPublicId||"Unavailable"}</b></div><button onClick={copyPublicId}><Copy size={15}/> Copy Dropdesk ID</button><button onClick={signOut}><LogOut size={15}/> Sign out</button></>:<button onClick={()=>{setModal("auth");setMenuOpen(false)}}><BadgeCheck size={15}/> Sign in / create account</button>}</div>}</div>
      </div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><button className="nav-toggle" aria-label="Open menu" aria-expanded={navOpen} onClick={()=>setNavOpen(true)}><Menu size={17}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><span>{sheet==="Overview"?"Overview":sheet==="Settings"?"Settings":workspaceScope?"Shared table":current?.name}</span>{sheet!=="Overview"&&sheet!=="Settings"&&<><ChevronRight size={14}/><b>{displaySheet}</b></>}</div><div className="top-actions"><div className="search-box"><Search size={16}/><input placeholder="Search anything..." value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><div className="notification-wrap"><button className="icon-button" onClick={()=>{const opening=!notificationsOpen;setNotificationsOpen(opening);if(opening)void refreshIncomingInvitations()}} aria-label={`Notifications${incomingInvitations.length?`, ${incomingInvitations.length} pending`:""}`} aria-expanded={notificationsOpen}><Bell size={17}/>{incomingInvitations.length>0&&<span className="notification-count">{incomingInvitations.length>9?"9+":incomingInvitations.length}</span>}</button>{notificationsOpen&&<div className="notifications-menu"><div className="notifications-heading"><div><b>Notifications</b><small>{incomingInvitations.length?`${incomingInvitations.length} pending invitation${incomingInvitations.length===1?"":"s"}`:"You're all caught up"}</small></div><button onClick={()=>void refreshIncomingInvitations()} aria-label="Refresh notifications">Refresh</button></div>{incomingInvitations.length?incomingInvitations.map(invitation=><article className="invitation-notification" key={invitation.id}><b>{invitation.inviter_name} invited you</b><span>{invitation.workspace_name} · {invitation.role}</span><small>{invitation.client_ids.length?`${invitation.client_ids.length} selected client${invitation.client_ids.length===1?"":"s"}`:"No selected clients"}{invitation.shared_table?" · shared table":""}</small><div><button className="button secondary" disabled={invitationActionId===invitation.id} onClick={()=>void respondToInvitation(invitation,"decline")}>Decline</button><button className="button primary" disabled={invitationActionId===invitation.id} onClick={()=>void respondToInvitation(invitation,"accept")}>{invitationActionId===invitation.id?"Working…":"Accept"}</button></div></article>):<p className="notifications-empty">Workspace invitations will appear here.</p>}</div>}</div><span className="top-divider"/><button className="help-button" onClick={()=>toast("Help center coming soon")}><CircleHelp size={16}/>Help</button></div></header>
      <div className="content">
        {!userEmail&&<div className="guest-banner"><span className="guest-badge"><Sparkles size={14}/> PREVIEW</span><span className="guest-message"><b>Your workspace starts empty.</b> Create a free account to save the clients, listings, and orders you add.</span><button className="button primary guest-cta" onClick={()=>setModal("auth")}>Create free account <ArrowUpRight size={14}/></button></div>}
        <div className="page-heading"><div><div className="eyebrow">{sheet==="Overview"?"YOUR WORKSPACE":sheet==="Settings"?"WORKSPACE":workspaceScope?"SHARED WORKSPACE TABLE":"CLIENT WORKSPACE"} <span className="eyebrow-line"/></div><h1>{sheet==="Overview"?(userEmail?`Welcome back, ${userEmail.split("@")[0]} `:"Your dropshipping workspace "):sheet==="Settings"?"Settings":displaySheet}{sheet==="Overview"&&<span className="wave">✳</span>}</h1><p className="subheading">{sheet==="Overview"?(clients.length?"Here’s what’s happening across your client accounts today.":"Add your first client to start organizing your work."):sheet==="Settings"?"Rename a client, update their store details, or remove a client and everything stored for them.":`${current?.name} · ${current?.store}`}</p></div><div className="heading-actions">{sheet!=="Overview"&&sheet!=="Settings"&&<button className="button secondary" onClick={exportCsv}><ArrowDownToLine size={15}/> Export</button>}{current&&sheet!=="Settings"&&<button className="button secondary" onClick={()=>{setImportName("");setImportFile(null);setModal("import")}}><FileSpreadsheet size={15}/> Import CSV</button>}{userRole==="owner"&&(sheet==="Overview"||sheet==="Settings")&&<button className="button primary" onClick={()=>setModal("client")} disabled={clientBusy}><Plus size={16}/> Add client</button>}{sheet!=="Overview"&&sheet!=="Settings"&&<button className="button primary" onClick={addRow}><Plus size={16}/>{customTable?"Add row":sheet==="Listings"?"Add listing":sheet==="Orders"?"Add order":"Add product"}</button>}</div></div>
        {sheet==="Overview"?<>
          {current && !workspaceScope && !Object.values(visibleData[current.id]??{}).some(rows=>rows.length) ? <ClientSetup clientName={current.name} customTables={activeCustomTables} onOpenTable={id=>setSheet(id)} onChoose={(table)=>setSheet(table)} onImport={()=>{setImportName("");setImportFile(null);setModal("import")}}/> : visibleClients.length?<section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14}/> YOUR BUSINESS, AT A GLANCE</span><h2>Everything in its right place.</h2><p>Your clients, products, listings, and orders—all together, finally.</p><button onClick={()=>setSheet("Orders")}>View your orders <ArrowUpRight size={14}/></button></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card art-card-back"><span className="art-mini-icon mint"><Package size={14}/></span><span className="art-lines"><i/><i/></span><span className="art-check">✓</span></div><div className="art-card art-card-front"><span className="art-mini-icon peach"><ShoppingBag size={14}/></span><span className="art-lines"><i/><i/></span></div><div className="art-spark">✳</div><div className="art-dot"/></div></section>:<section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14}/> YOUR WORKSPACE IS READY</span><h2>No client workspaces yet.</h2><p>Create your first client to start tracking product ideas, listings, and orders.</p><button onClick={()=>setModal("client")}>Add your first client <ArrowUpRight size={14}/></button></div></section>}

          <div className="section-title-row"><div><h2>Overview</h2><p>A snapshot of your operation across all clients.</p></div><button className="period-select" onClick={()=>toast("Showing this month")}><span className="period-dot"/> This month <ChevronDown size={14}/></button></div>
          <div className="stats-grid"><StatCard label="Active clients" value={String(visibleClients.length).padStart(2,"0")} change="All accounts" icon={<Users size={17}/>} tone="mint"/><StatCard label="Orders this month" value={String(allOrders.length).padStart(2,"0")} change="Across all clients" icon={<ShoppingBag size={17}/>} tone="peach"/><StatCard label="Net profit" value={money(orderProfit)} change="After marketplace fees" icon={<TrendingUp size={17}/>} tone="lavender"/><StatCard label="Active listings" value={String(Object.values(visibleData).flatMap(d=>d.Listings||[]).length).padStart(2,"0")} change="Across all stores" icon={<Store size={17}/>} tone="yellow"/></div>
          <div className="dashboard-grid"><section className="panel clients-panel"><div className="panel-heading"><div><h3>Your clients</h3><p>Open a client workspace.</p></div><button className="text-button" onClick={()=>setModal("client")}>Add client <Plus size={14}/></button></div><div className="client-table-wrap">{visibleClients.length?<table className="client-table"><thead><tr><th>CLIENT</th><th>STORE</th><th>ORDERS</th><th>NET PROFIT</th><th/></tr></thead><tbody>{visibleClients.slice(0,4).map((c,i)=>{const d=visibleData[c.id];const ord=d?.Orders?.length??0;const prof=d?.Orders?.reduce((a:any,o:any)=>a+o.profit,0)??0;return <tr key={c.id} onClick={()=>{setActive(c.id);setSheet("Overview");setQuery("")}}><td><span className="table-client"><span className="client-avatar" style={{background:c.color}}>{c.initials}</span><span><b>{c.name}</b><small>Open workspace</small></span></span></td><td className="store-cell"><span className="store-icon"><Store size={14}/></span>{c.store}</td><td>{ord||"—"}</td><td className="profit-cell">{prof?money(prof):"—"}</td><td><button className="row-more" aria-label="Open client workspace" onClick={e=>{e.stopPropagation();setActive(c.id);setSheet("Overview")}}><ArrowUpRight size={15}/></button></td></tr>})}</tbody></table>:<EmptyState title="No clients yet" text="Create your first client workspace to get started." actionLabel="Add a client" onClick={()=>setModal("client")}/>}</div><button className="add-client-row" onClick={()=>setModal("client")}><Plus size={15}/> Add another client</button></section>
            <section className="panel activity-panel"><div className="panel-heading"><div><h3>Recent activity</h3><p>Latest across your accounts.</p></div><button className="more-round" onClick={()=>toast("Activity history coming soon")}><MoreHorizontal size={17}/></button></div><div className="activity-list"><div className="empty-state"><span className="empty-icon"><FileSpreadsheet size={18}/></span><b>No activity yet</b><p>Your updates will appear here after you add clients and orders.</p></div></div>{clients.length>0&&<button className="activity-footer" onClick={()=>setSheet("Orders")}>See all activity <ArrowUpRight size={14}/></button>}</section></div>
        </>:sheet==="Settings"?<SettingsPage clients={visibleClients} data={visibleData} customTables={customTables} members={workspaceMembers} memberError={workspaceMembersError} memberWarning={workspaceMembersWarning} membersLoading={workspaceMembersLoading} isOwner={userRole==="owner"} publicId={userPublicId} onCopyPublicId={copyPublicId} onInvite={()=>{setInvitePublicId("");setInviteRecipient(null);setInviteError("");setInviteSharedTable(true);setInviteRole("va");setInviteClients([]);setModal("invite")}} onRevoke={revokeMember} onToggleShared={toggleSharedAccess} onOpen={id=>{setActive(id);setSheet("Overview")}} onEdit={openClientSettings} onDelete={requestDeleteClient} onAdd={()=>setModal("client")}/>:<>
          <div className="client-context"><span className="context-avatar" style={{background:current?.color}}>{current?.initials}</span><div><b>{current?.name}</b><span><Store size={13}/>{current?.store}<span className="context-sep">·</span><span className="live-dot"/> Connected</span></div><button aria-label="Client settings" onClick={()=>current&&openClientSettings(current)}><MoreHorizontal size={18}/></button></div>
          <div className="sheet-tabs">{[...(workspaceScope?(["Product hunting"] as Sheet[]):tabs),...activeCustomTables.map(t=>t.id)].map(t=>{const custom=activeCustomTables.find(x=>x.id===t);return <button key={t} className={sheet===t?"tab-active":""} onClick={()=>setSheet(t)}>{custom?<FileSpreadsheet size={15}/>:t==="Product hunting"?<Package size={15}/>:t==="Listings"?<ClipboardList size={15}/>:t==="Orders"?<ShoppingBag size={15}/>:<LayoutDashboard size={15}/>} {custom?.name??t}{t!=="Overview"&&<span className="tab-count">{custom?custom.rows.length:items?.[t]?.length??0}</span>}</button>})}<button className="add-table-tab" onClick={()=>{setImportName("");setImportFile(null);setModal("import")}}><Plus size={14}/> Import CSV</button></div>
           <>
            <div className="sheet-summary"><div><h2>{displaySheet}</h2><p>{customTable?`${customTable.columns.length} columns imported from your spreadsheet.`:sheet==="Product hunting"?<>Find products worth listing. Add source costs, target price, and links.{workspaceScope&&!sharedRowsReady&&<b className="inline-warning"> Rows here will not save until migration 20261025 is applied in Supabase.</b>}</>:sheet==="Listings"?"Keep your client’s live and draft eBay listings in one place.":"Track fulfillment and see your profit per sale."}</p></div><span className="last-saved"><span/> Saved locally</span></div>
             <div className="table-toolbar"><div className="toolbar-left"><div className="filter-chip"><Filter size={14}/><select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option>All sources</option><option>AliExpress</option><option>Amazon</option><option>Alibaba</option></select><ChevronDown size={13}/></div><button className="toolbar-filter" onClick={()=>toast("More filters coming soon")}><Settings2 size={14}/> Filters</button><button className="toolbar-filter" onClick={()=>{setQuery("");setSourceFilter("All sources")}}>Clear</button></div><div className="toolbar-right"><span className="row-count">{filtered.length} {filtered.length===1?"record":"records"}</span>{selectedRows.length>0&&<button className="button danger compact" onClick={deleteSelectedRows}><X size={14}/> Delete {selectedRows.length} selected</button>}<button className="button secondary compact" onClick={exportCsv}><ArrowDownToLine size={14}/> Export CSV</button><button className="button primary compact" onClick={addRow}><Plus size={15}/> Add {customTable?"row":sheet==="Listings"?"listing":sheet==="Orders"?"order":"product"}</button></div></div>
            <div className="data-table-wrap">{customTable?<CustomTableGrid table={customTable} rows={filtered} selectedRows={selectedRows} onToggleSelect={toggleRowSelection} onSelectAll={toggleVisibleSelection} allSelected={allVisibleSelected} onEditRow={beginEditRow} onDelete={(row)=>setRows(sheet,rows.filter(r=>r!==row))}/>:<table className="data-table"><thead><tr><th className="select-col"><input type="checkbox" aria-label="Select all visible rows" checked={allVisibleSelected} onChange={toggleVisibleSelection}/></th>{sheet==="Product hunting"?<><th>PRODUCT</th><th>SOURCE</th><th>SUPPLIER LINK</th><th>EBAY LINK</th><th>SUPPLIER COST</th><th>EBAY PRICE</th><th>EST. PROFIT</th><th>MARGIN</th><th>STATUS</th><th>DATE ADDED</th><th/></>:sheet==="Listings"?<><th>LISTING TITLE</th><th>SOURCE</th><th>EBAY PRICE</th><th>SKU</th><th>STATUS</th><th>LISTED</th><th/></>:<><th>EBAY ORDER ID</th><th>ITEM</th><th>SOURCE / ORDER ID</th><th>SOURCE COST</th><th>SALE PRICE</th><th>EBAY FEES</th><th>NET PROFIT</th><th>STATUS</th><th>ORDER DATE</th><th/></>}</tr></thead><tbody>{filtered.map((r:any,index:number)=><tr key={r.id}><td className="select-cell"><input type="checkbox" aria-label={`Select ${r.title??r.item??r.id}`} checked={selectedRows.includes(rowKey(r))} onChange={()=>toggleRowSelection(rowKey(r))}/></td><td>{sheet==="Product hunting"?<div className="product-name"><span className="product-thumbnail"><Package size={16}/></span><input readOnly className="cell-input title-input" value={r.title} onChange={e=>updateCell(rows.indexOf(r),"title",e.target.value)}/></div>:sheet==="Listings"?<div className="listing-title"><b className="listing-id">{r.id}</b><input readOnly className="cell-input title-input" value={r.title} onChange={e=>updateCell(rows.indexOf(r),"title",e.target.value)}/></div>:<span className="order-id">{r.id}</span>}</td>{sheet==="Product hunting"?<><td><Source source={r.source}/></td><td><div className="source-link-cell"><input readOnly className="cell-input source-url-input" value={r.sourceUrl??""} onChange={e=>updateCell(rows.indexOf(r),"sourceUrl",e.target.value)} placeholder="Paste source link"/>{/^https?:\/\//i.test(r.sourceUrl??"")&&<a href={r.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open source link"><ArrowUpRight size={13}/></a>}</div></td><td><div className="source-link-cell"><input readOnly className="cell-input source-url-input" value={r.ebayUrl??""} onChange={e=>updateCell(rows.indexOf(r),"ebayUrl",e.target.value)} placeholder="Paste eBay link"/>{isHttpUrl(r.ebayUrl??"")&&<a href={r.ebayUrl} target="_blank" rel="noreferrer" aria-label="Open eBay link"><ArrowUpRight size={13}/></a>}</div></td><td><MoneyInput value={r.cost} onChange={v=>updateCell(rows.indexOf(r),"cost",v)}/></td><td><MoneyInput value={r.price} onChange={v=>updateCell(rows.indexOf(r),"price",v)}/></td><td className="green-money">{money(r.profit)}</td><td><span className="margin-pill">{r.margin}%</span></td><td><Status value={r.status}/></td><td className="date-cell">{shortDate(r.date)}</td><td><RowMenu onEdit={()=>beginEditRow(r)} onDelete={()=>setRows(sheet,rows.filter((_:any,i:number)=>i!==rows.indexOf(r)))}/></td></>:sheet==="Listings"?<><td><Source source={r.source}/></td><td><MoneyInput value={r.price} onChange={v=>updateCell(rows.indexOf(r),"price",v)}/></td><td><input readOnly className="cell-input sku-input" value={r.sku} onChange={e=>updateCell(rows.indexOf(r),"sku",e.target.value)}/></td><td><Status value={r.status}/></td><td className="date-cell">{r.date}</td><td><RowMenu onEdit={()=>beginEditRow(r)} onDelete={()=>setRows(sheet,rows.filter((_:any,i:number)=>i!==rows.indexOf(r)))}/></td></>:<><td><span className="order-id">{r.id}</span></td><td><input readOnly className="cell-input item-input" value={r.item} onChange={e=>updateCell(rows.indexOf(r),"item",e.target.value)}/></td><td><div className="source-id"><Source source={r.source}/><input readOnly className="cell-input sourceid-input" value={r.sourceId} onChange={e=>updateCell(rows.indexOf(r),"sourceId",e.target.value)} placeholder="Add order ID"/></div></td><td><MoneyInput value={r.cost} onChange={v=>updateCell(rows.indexOf(r),"cost",v)}/></td><td><MoneyInput value={r.sale} onChange={v=>updateCell(rows.indexOf(r),"sale",v)}/></td><td><MoneyInput value={r.fee} onChange={v=>updateCell(rows.indexOf(r),"fee",v)}/></td><td className={r.profit>=0?"green-money":"negative-money"}>{money(r.profit)}</td><td><Status value={r.status}/></td><td className="date-cell">{r.date}</td><td><RowMenu onEdit={()=>beginEditRow(r)} onDelete={()=>setRows(sheet,rows.filter((_:any,i:number)=>i!==rows.indexOf(r)))}/></td></>}</tr>)}</tbody></table>}{!filtered.length&&<EmptyState title={query?"No matching rows":"A clean slate"} text={query?"Try another search or clear the filters.":`Add your first ${customTable?"row":sheet==="Product hunting"?"product idea":sheet==="Listings"?"listing":"order"} to start tracking.`} onClick={addRow}/>}</div>
            <div className="table-footer"><span>Showing <b>{filtered.length?1:0}–{filtered.length}</b> of <b>{rows.length}</b> records</span><div><button disabled><ChevronLeft size={15}/></button><button className="page-number">1</button><button disabled><ChevronRight size={15}/></button></div></div>
           </>
        </>}
        <footer className="app-footer"><span>Made for the moving parts.</span><span><a onClick={()=>toast("Help center coming soon")}>Help center</a><span className="footer-sep">·</span><a onClick={()=>toast("Shortcuts: ⌘ K to search")}>Keyboard shortcuts</a><span className="footer-sep">·</span>v1.0.0</span></footer>
      </div>
    </section>
    </>}
    {notice&&<div className="toast"><span className="toast-check">✓</span>{notice}</div>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal"><button className="modal-close" onClick={()=>setModal(null)} aria-label="Close"><X size={17}/></button>{modal==="client"?<><span className="modal-icon mint"><Users size={19}/></span><h2>Add a client</h2><p>Create a workspace for your client’s stores, product ideas, listings, and orders.</p><label>CLIENT NAME</label><input autoFocus className="modal-input" value={clientName} onChange={e=>setClientName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClient()} placeholder="e.g. Alex Morgan"/><div className="modal-note"><Store size={15}/> You can add their store name and details later.</div><button className="button primary modal-submit" onClick={addClient} disabled={clientBusy}><Plus size={16}/>{clientBusy?"Creating workspace…":"Create workspace"}</button></>:modal==="product"?<ProductModal name={productName} setName={setProductName} sourceUrl={productSourceUrl} setSourceUrl={setProductSourceUrl} ebayUrl={productEbayUrl} setEbayUrl={setProductEbayUrl} source={productSource} setSource={setProductSource} cost={supplierCost} setCost={setSupplierCost} price={ebayPrice} setPrice={setEbayPrice} onAdd={addProduct}/>:modal==="edit"?<RowEditModal title={customTable?.name??sheet} draft={editDraft} fields={Object.keys(editDraft).filter(key=>key!=="id"&&key!=="__rowId"&&key!=="__createdBy"&&(customTable||!(["profit","margin"].includes(key))))} setDraft={setEditDraft} onSave={saveEditedRow} onClose={()=>setModal(null)}/>:modal==="import"?<ImportTableModal name={importName} setName={setImportName} file={importFile} setFile={setImportFile} busy={importBusy} onImport={createTableFromImport} onClose={()=>setModal(null)}/>:modal==="clientSettings"&&settingsDraft?<ClientSettingsModal draft={settingsDraft} setDraft={setSettingsDraft} onSave={saveClientSettings} onDelete={()=>{const target=clients.find(c=>c.id===settingsDraft.id); if(target)requestDeleteClient(target)}} onClose={()=>{setModal(null);setSettingsDraft(null)}}/>:modal==="deleteClient"&&deleteTarget?<DeleteClientModal client={deleteTarget} rows={Object.values(data[deleteTarget.id]??{}).reduce((total,sheetRows)=>total+(sheetRows as any[]).length,0)} tables={customTables[deleteTarget.id]??[]} busy={deleteBusy} onConfirm={confirmDeleteClient} onCancel={()=>{setModal(null);setDeleteTarget(null)}}/>:modal==="invite"?<InviteModal publicId={invitePublicId} setPublicId={(value)=>{setInvitePublicId(value);setInviteRecipient(null)}} recipient={inviteRecipient} lookupBusy={inviteLookupBusy} onFind={findInviteRecipient} role={inviteRole} setRole={setInviteRole} clients={visibleClients.filter(client=>client.workspace_id===(current?.workspace_id??selectedWorkspaceId))} selected={inviteClients} setSelected={setInviteClients} busy={inviteBusy} onCreate={createInvitation} onClose={()=>setModal(null)} error={inviteError} recipientIsMember={inviteRecipientIsMember} sharedTable={inviteSharedTable} setSharedTable={setInviteSharedTable}/>:<><span className="modal-icon lavender"><BadgeCheck size={19}/></span><h2>{authMode==="signup"?"Create your Dropdesk account":"Welcome back"}</h2><p>{authMode==="signup"?"Start organizing client stores, products, listings, and orders.":"Sign in to continue to your workspace."}</p><button className="google-auth-button" type="button" onClick={continueWithGoogle}><span className="google-g">G</span>Continue with Google</button><div className="auth-divider"><span/>or continue with email<span/></div><form onSubmit={submitAuth}>{authMode==="signup"&&<><label htmlFor="auth-name">YOUR NAME</label><input id="auth-name" autoComplete="name" className="modal-input" value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your name" required/></>}<label htmlFor="auth-email">EMAIL ADDRESS</label><input id="auth-email" autoFocus type="email" autoComplete="email" className="modal-input" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required/><label htmlFor="auth-password">PASSWORD</label><input id="auth-password" type="password" autoComplete={authMode==="signup"?"new-password":"current-password"} minLength={8} className="modal-input" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters" required/><button className="button primary modal-submit" type="submit" disabled={authBusy}>{authBusy?(authMode==="signup"?"Creating account…":"Signing in…"):(authMode==="signup"?"Create account":"Sign in")}<ArrowUpRight size={15}/></button></form><button className="auth-mode-switch" type="button" onClick={()=>setAuthMode(authMode==="signup"?"login":"signup")}>{authMode==="signup"?"Already have an account? Sign in":"New to Dropdesk? Create an account"}</button><div className="modal-note"><BadgeCheck size={15}/> Your workspace is private to your account.</div></>}</div></div>}
  </main>;
}

function InviteModal({publicId,setPublicId,recipient,lookupBusy,onFind,role,setRole,clients,selected,setSelected,busy,onCreate,onClose,error,recipientIsMember,sharedTable,setSharedTable}:{publicId:string;setPublicId:(v:string)=>void;recipient:InviteRecipient|null;lookupBusy:boolean;onFind:()=>void;role:"manager"|"va"|"viewer";setRole:(v:"manager"|"va"|"viewer")=>void;clients:Client[];selected:string[];setSelected:(v:string[])=>void;busy:boolean;onCreate:()=>void;onClose:()=>void;error:string;recipientIsMember:boolean;sharedTable:boolean;setSharedTable:(v:boolean)=>void}) {
  const toggle=(id:string)=>setSelected(selected.includes(id)?selected.filter(v=>v!==id):[...selected,id]);
  return <form className="invite-form" onSubmit={e=>{e.preventDefault();if(recipient)onCreate();else onFind()}}><span className="modal-icon mint"><Users size={19}/></span><h2>Invite a teammate</h2><p>Enter their Dropdesk ID to find their account. The invitation will appear in their notifications.</p><label htmlFor="invite-public-id">DROPdesk ID</label><div className="invite-id-search"><input id="invite-public-id" className="modal-input" autoFocus required value={publicId} onChange={e=>setPublicId(e.target.value)} placeholder="DD-1234ABCD5678EF90"/><button className="button secondary" type="button" onClick={onFind} disabled={lookupBusy}>{lookupBusy?"Searching…":"Find user"}</button></div>{recipient&&<div className="invite-recipient"><span className="profile-avatar">{recipient.display_name.slice(0,2).toUpperCase()}</span><span><b>{recipient.display_name}</b><small>{recipient.public_id}</small></span><button type="button" onClick={()=>setPublicId("")} aria-label="Clear selected user"><X size={15}/></button></div>}<label htmlFor="invite-role">ROLE</label><select id="invite-role" className="modal-input" value={role} onChange={e=>setRole(e.target.value as "manager"|"va"|"viewer")}><option value="manager">Manager — edit data</option><option value="va">VA — create and edit data</option><option value="viewer">Viewer — read only</option></select><label className="invite-shared"><input type="checkbox" checked={sharedTable} onChange={()=>setSharedTable(!sharedTable)}/><span>Shared product table</span><small>Access to the client-less Product hunting table, no clients required</small></label><label>CLIENT ACCESS</label><div className="invite-client-list">{clients.map(client=><label key={client.id} className="invite-client-option"><input type="checkbox" checked={selected.includes(client.id)} onChange={()=>toggle(client.id)}/><span>{client.name}</span><small>{client.visibility??"selected"}</small></label>)}</div><p className="invite-help">Ask your teammate for their Dropdesk ID — they can copy it from Settings → Your Dropdesk ID. Clients not selected remain hidden. Workspace-visible clients can still be seen by all workspace members.</p>{recipientIsMember&&<p className="invite-error">{recipient?.display_name} is already a member of this workspace.</p>}{error&&<p className="invite-error">{error}</p>}<div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={busy||lookupBusy||!recipient||recipientIsMember}>{busy?"Sending…":"Send invitation"}</button></div></form>;
}

function ProductModal({name,setName,sourceUrl,setSourceUrl,ebayUrl,setEbayUrl,source,setSource,cost,setCost,price,setPrice,onAdd}:{name:string;setName:(value:string)=>void;sourceUrl:string;setSourceUrl:(value:string)=>void;ebayUrl:string;setEbayUrl:(value:string)=>void;source:string;setSource:(value:string)=>void;cost:string;setCost:(value:string)=>void;price:string;setPrice:(value:string)=>void;onAdd:()=>void}) {
  return <form onSubmit={e=>{e.preventDefault();onAdd()}}><span className="modal-icon mint"><Package size={19}/></span><h2>Add product idea</h2><p>Save the supplier details and target eBay price for this product.</p><label htmlFor="product-name">PRODUCT NAME</label><input id="product-name" autoFocus className="modal-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Stainless steel water bottle" required/><label htmlFor="product-source-link">SUPPLIER LINK</label><input id="product-source-link" type="url" className="modal-input" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://..." required/><label htmlFor="product-ebay-link">EBAY LINK <span className="required-mark">required</span></label><input id="product-ebay-link" type="url" className="modal-input" value={ebayUrl} onChange={e=>setEbayUrl(e.target.value)} placeholder="https://www.ebay.com/itm/..." required/><label htmlFor="product-source">SOURCE</label><select id="product-source" className="modal-input" value={source} onChange={e=>setSource(e.target.value)}><option>AliExpress</option><option>Alibaba</option><option>Amazon</option><option>Other</option></select><div className="product-price-fields"><div><label htmlFor="supplier-cost">SUPPLIER COST</label><input id="supplier-cost" type="number" min="0" step="0.01" className="modal-input" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0.00" required/></div><div><label htmlFor="ebay-price">EBAY PRICE</label><input id="ebay-price" type="number" min="0" step="0.01" className="modal-input" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00" required/></div></div><div className="modal-note"><TrendingUp size={15}/> Estimated profit is calculated after you add the product.</div><button className="button primary modal-submit" type="submit"><Plus size={16}/> Add product</button></form>;
}

function RowEditModal({title,draft,fields,setDraft,onSave,onClose}:{title:string;draft:Record<string,any>;fields:string[];setDraft:(value:Record<string,any>)=>void;onSave:()=>void;onClose:()=>void}) {
  return <form className="row-edit-form" onSubmit={event=>{event.preventDefault();onSave()}}><span className="modal-icon mint"><Settings2 size={19}/></span><h2>Edit row</h2><p>Update this {title.toLowerCase()} record. Calculated profit fields update automatically.</p><div className="row-edit-fields">{fields.map(field=><label key={field} className="row-edit-field" htmlFor={`edit-${field}`}><span>{field.replace(/([A-Z])/g," $1").replaceAll("_"," ").toUpperCase()}</span><input id={`edit-${field}`} autoFocus={fields[0]===field} type={typeof draft[field]==="number"?"number":"text"} step={typeof draft[field]==="number"?"0.01":undefined} className="modal-input" value={draft[field]??""} onChange={event=>setDraft({...draft,[field]:typeof draft[field]==="number"?(Number(event.target.value)||0):event.target.value})}/></label>)}</div><div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save changes</button></div></form>;
}

function ClientSetup({clientName,customTables,onOpenTable,onChoose,onImport}:{clientName:string;customTables:CustomTable[];onOpenTable:(id:string)=>void;onChoose:(table:BuiltInTable)=>void;onImport:()=>void}) {
  const options:[BuiltInTable,string,string,LucideIcon][]=[["Product hunting","Product hunting","Save supplier links, target prices, and product research.",Package],["Listings","Marketplace listings","Organize listing titles, source links, prices, and status.",ClipboardList],["Orders","Orders & profit","Track fulfillment costs, sale prices, and profit per order.",ShoppingBag]];
  return <section className="client-setup"><div className="client-setup-intro"><span className="welcome-kicker"><Sparkles size={14}/> CLIENT WORKSPACE</span><h2>Set up {clientName}’s workspace</h2><p>Choose a table to get started, or import a CSV to create a table from its columns.</p></div>{customTables.length>0&&<div className="setup-imported-tables"><b>Imported tables</b>{customTables.map(table=><button key={table.id} onClick={()=>onOpenTable(table.id)}><FileSpreadsheet size={15}/>{table.name}<span>{table.rows.length} rows</span><ArrowUpRight size={14}/></button>)}</div>}<div className="client-setup-options">{options.map(([table,title,description,Icon])=><button key={table} className="client-setup-option" onClick={()=>onChoose(table)}><span className={`client-setup-icon ${table==="Product hunting"?"sage":table==="Listings"?"peach":"lilac"}`}><Icon size={18}/></span><span className="client-setup-copy"><b>{title}</b><small>{description}</small></span><span className="client-setup-action">Open table <ArrowUpRight size={14}/></span></button>)}</div><button className="button secondary setup-import" onClick={onImport}><FileSpreadsheet size={15}/> Import CSV</button></section>;
}

function CustomTableGrid({table,rows,selectedRows,onToggleSelect,onSelectAll,allSelected,onEditRow,onDelete}:{table:CustomTable;rows:Record<string,any>[];selectedRows:string[];onToggleSelect:(key:string)=>void;onSelectAll:()=>void;allSelected:boolean;onEditRow:(row:Record<string,any>)=>void;onDelete:(row:Record<string,any>)=>void}) {
  return <table className="data-table custom-data-table"><thead><tr><th className="select-col"><input type="checkbox" aria-label="Select all visible rows" checked={allSelected} onChange={onSelectAll}/></th>{table.columns.map(column=><th key={column}>{column}</th>)}<th/></tr></thead><tbody>{rows.map((row,index)=><tr key={row.__rowId??index}><td className="select-cell"><input type="checkbox" aria-label={`Select row ${index+1}`} checked={selectedRows.includes(String(row.__rowId??row.id))} onChange={()=>onToggleSelect(String(row.__rowId??row.id))}/></td>{table.columns.map(column=><td key={column}><input readOnly className="cell-input custom-cell-input" aria-label={`${column} value`} value={row[column]??""}/></td>)}<td><RowMenu onEdit={()=>onEditRow(row)} onDelete={()=>onDelete(row)}/></td></tr>)}</tbody></table>;
}

function ImportTableModal({name,setName,file,setFile,busy,onImport,onClose}:{name:string;setName:(value:string)=>void;file:File|null;setFile:(value:File|null)=>void;busy:boolean;onImport:()=>void;onClose:()=>void}) {
  return <><span className="modal-icon mint"><FileSpreadsheet size={19}/></span><h2>Import a CSV</h2><p>We’ll use the first row as column names and create a new table for this client.</p><label htmlFor="import-table-name">TABLE NAME</label><input id="import-table-name" className="modal-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Product research"/><div className="import-help">In Google Sheets, choose File → Download → Comma-separated values (.csv).</div><label className="csv-picker"><FileSpreadsheet size={16}/><span>{file?file.name:"Choose a .csv file"}</span><input type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><div className="modal-actions"><button className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" onClick={onImport} disabled={busy||!file}>{busy?"Importing…":"Import and create table"}</button></div></>;
}

function parseCsv(input:string):{columns:string[];rows:Record<string,string>[]} {
  const text=input.replace(/^\uFEFF/,""); const grid:string[][]=[]; let row:string[]=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"')quoted=false;else field+=ch}else if(ch==='"')quoted=true;else if(ch===","){row.push(field);field=""}else if(ch==="\n"){row.push(field.replace(/\r$/,""));grid.push(row);row=[];field=""}else field+=ch;}
  if(field.length||row.length){row.push(field.replace(/\r$/,""));grid.push(row)}
  const header=grid.shift()?.map((value,index)=>value.trim()||`Column ${index+1}`)??[]; const used=new Map<string,number>(); const columns=header.map(value=>{const count=(used.get(value)??0)+1;used.set(value,count);return count===1?value:`${value} (${count})`});
  const rows=grid.filter(values=>values.some(value=>value.trim()!=="")).map(values=>Object.fromEntries(columns.map((column,index)=>[column,values[index]??""])));
  return {columns,rows};
}

function LandingPage({onStart,onLogin}:{onStart:()=>void;onLogin:()=>void}) {
  return <div className="landing-page">
    <header className="landing-nav"><a className="landing-brand" href="#top"><span className="brand-mark"><ArrowLeftRight size={19} strokeWidth={2.4}/></span><span>dropdesk<span className="brand-dot">.</span></span></a><nav><a href="#features">Features</a><a href="#workflow">How it works</a></nav><div className="landing-nav-actions"><button className="landing-login" onClick={onLogin}>Log in</button><button className="landing-button landing-button-dark" onClick={onStart}>Get started free <ArrowUpRight size={15}/></button></div></header>
    <section className="landing-hero" id="top"><div className="landing-hero-copy"><div className="landing-pill"><span/> THE WORKSPACE FOR DROPSHIP OPERATIONS</div><h1>Every client.<br/>Every moving part.<br/><em>One clear workspace.</em></h1><p>Keep product research, marketplace listings, and order profits organized across every client you manage.</p><div className="landing-hero-actions"><button className="landing-button landing-button-dark" onClick={onStart}>Create your free workspace <ArrowUpRight size={16}/></button><a href="#features" className="landing-text-link">See what you can organize <ArrowDown size={15}/></a></div><div className="landing-trust"><span className="trust-avatars"><i>R</i><i>M</i><i>A</i></span><span>Built for independent dropshippers and virtual assistants</span></div></div>
      <div className="landing-visual" aria-label="Illustration of an organized dropshipping workspace"><div className="visual-glow"/><div className="visual-window"><div className="visual-top"><div className="visual-dots"><i/><i/><i/></div><span>YOUR WORKSPACE</span><span className="visual-menu">•••</span></div><div className="visual-title"><div><small>CLIENT PORTFOLIO</small><b>All your work, in one place</b></div><span className="visual-add">+</span></div><div className="visual-metrics"><div><span>CLIENTS</span><b><i/> Organized</b></div><div><span>PRODUCT IDEAS</span><b><i/> Track costs</b></div><div><span>ORDERS</span><b><i/> See profit</b></div></div><div className="visual-section-head"><b>Workspace tools</b><span>Ready when you are</span></div><div className="visual-tool"><span className="visual-tool-icon icon-sage"><Package size={16}/></span><span><b>Product hunting</b><small>Compare source cost and target price</small></span><ArrowUpRight size={14}/></div><div className="visual-tool"><span className="visual-tool-icon icon-peach"><ClipboardList size={16}/></span><span><b>Marketplace listings</b><small>Keep titles, links, and status together</small></span><ArrowUpRight size={14}/></div><div className="visual-tool"><span className="visual-tool-icon icon-lilac"><ShoppingBag size={16}/></span><span><b>Orders &amp; profit</b><small>Follow fulfillment and calculate margins</small></span><ArrowUpRight size={14}/></div></div><div className="visual-note"><span><TrendingUp size={15}/></span><div><b>Know where every order stands</b><small>One view for every client account</small></div></div><div className="visual-sparkle sparkle-a">✳</div><div className="visual-sparkle sparkle-b">✦</div></div>
    </section>
    <section className="landing-proof"><span>MADE TO KEEP THE DETAILS TOGETHER</span><div><b><Users size={16}/> CLIENT WORKSPACES</b><b><Package size={16}/> PRODUCT RESEARCH</b><b><Store size={16}/> MARKETPLACE LISTINGS</b><b><TrendingUp size={16}/> ORDER PROFIT</b></div></section>
    <section className="landing-features" id="features"><div className="landing-section-intro"><span className="landing-eyebrow">LESS SPREADSHEET SHUFFLING</span><h2>All the important details,<br/><em>right where you need them.</em></h2><p>Dropdesk gives each client a tidy home for the work you do every day.</p></div><div className="feature-grid"><article><span className="feature-icon sage"><Users size={19}/></span><small>01 / CLIENTS</small><h3>One workspace per client</h3><p>Keep each store’s research, listings, and orders grouped together as your client list grows.</p></article><article><span className="feature-icon peach"><Package size={19}/></span><small>02 / PRODUCTS</small><h3>Research with the numbers</h3><p>Save source links, listing details, costs, and target prices in a table made for product hunting.</p></article><article><span className="feature-icon lilac"><ShoppingBag size={19}/></span><small>03 / OPERATIONS</small><h3>Follow listings to orders</h3><p>Track marketplace listings and fulfillment, then see order profit calculated from your figures.</p></article><article><span className="feature-icon gold"><FileSpreadsheet size={19}/></span><small>04 / YOUR DATA</small><h3>Take your work with you</h3><p>Export your tables to CSV whenever you need a spreadsheet copy of your records.</p></article></div></section>
    <section className="landing-workflow" id="workflow"><div><span className="landing-eyebrow">A SIMPLE WAY TO STAY ON TOP OF IT</span><h2>From first idea<br/>to fulfilled order.</h2><p>Set up a client once, then keep the day-to-day work moving in a shared, organized flow.</p><button className="landing-button landing-button-light" onClick={onStart}>Start organizing for free <ArrowUpRight size={15}/></button></div><div className="workflow-steps"><div><span>01</span><div><b>Create a client workspace</b><small>Give each client and store a place of its own.</small></div><Users size={18}/></div><div><span>02</span><div><b>Add product and listing details</b><small>Keep supplier links, prices, and statuses together.</small></div><ClipboardList size={18}/></div><div><span>03</span><div><b>Track orders and profit</b><small>Record costs and sale prices as orders come in.</small></div><TrendingUp size={18}/></div></div></section>
    <section className="landing-cta"><div><span className="landing-eyebrow">YOUR WORKSPACE IS READY WHEN YOU ARE</span><h2>Spend less time finding things.</h2><p>Bring your client operations together in Dropdesk.</p></div><button className="landing-button landing-button-dark" onClick={onStart}>Create a free account <ArrowUpRight size={16}/></button></section>
    <footer className="landing-footer"><a className="landing-brand" href="#top"><span className="brand-mark"><ArrowLeftRight size={17} strokeWidth={2.4}/></span><span>dropdesk<span className="brand-dot">.</span></span></a><span>One calm workspace for the moving parts.</span><span>© 2026 Dropdesk</span></footer>
  </div>;
}

function StatCard({label,value,change,icon,tone}:{label:string;value:string;change:string;icon:React.ReactNode;tone:string}) {return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-change">{change.startsWith("↑")&&<span className="up-arrow">↗</span>}{change}</div></div>}
function ActivityItem({icon,tone,title,detail,time}:{icon:React.ReactNode;tone:string;title:string;detail:string;time:string}) {return <div className="activity-item"><span className={`activity-icon ${tone}`}>{icon}</span><div className="activity-copy"><b>{title}</b><span>{detail}</span></div><time>{time}</time></div>}
function Source({source}:{source:string}) {const cls=source.toLowerCase();return <span className="source-tag"><span className={`source-mark ${cls}`}>{source==="Amazon"?"a":source==="Alibaba"?"阿":"↗"}</span>{source}</span>}
function Status({value}:{value:string}) {return <span className={`status ${statusClass(value)}`}><i/>{value}</span>}
function statusClass(s:string) {return s.toLowerCase().replaceAll(" ","-")}
function MoneyInput({value,onChange}:{value:number;onChange:(v:string)=>void}) {return <span className="money-input-wrap"><span>$</span><input readOnly className="cell-input money-input" type="number" step="0.01" value={value} onChange={e=>onChange(e.target.value)}/></span>}
function RowMenu({onEdit,onDelete}:{onEdit?:()=>void;onDelete:()=>void}) {const [open,setOpen]=useState(false);return <div className="row-menu-wrap"><button className="row-more" aria-label="Row options" onClick={()=>setOpen(!open)}><MoreHorizontal size={17}/></button>{open&&<div className="row-menu">{onEdit&&<button onClick={()=>{onEdit();setOpen(false)}}><Pencil size={14}/> Edit row</button>}<button onClick={()=>{onDelete();setOpen(false)}}><X size={14}/> Delete row</button></div>}</div>}
function EmptyState({title,text,onClick,actionLabel="Add a row"}:{title:string;text:string;onClick:()=>void;actionLabel?:string}) {return <div className="empty-state"><span className="empty-icon"><FileSpreadsheet size={18}/></span><b>{title}</b><p>{text}</p><button className="button secondary" onClick={onClick}><Plus size={14}/> {actionLabel}</button></div>}

function SettingsPage({clients,data,customTables,members,memberError,memberWarning,membersLoading,isOwner,onInvite,onRevoke,onToggleShared,onOpen,onEdit,onDelete,onAdd,publicId,onCopyPublicId}:{clients:Client[];data:WorkspaceData;customTables:Record<string,CustomTable[]>;members:WorkspaceMember[];memberError:string;memberWarning:string;membersLoading:boolean;isOwner:boolean;onInvite:()=>void;onRevoke:(member:WorkspaceMember)=>void;onToggleShared:(member:WorkspaceMember)=>void;onOpen:(id:string)=>void;onEdit:(client:Client)=>void;onDelete:(client:Client)=>void;onAdd:()=>void;publicId:string;onCopyPublicId:()=>void}) {
  const importedTables=(client:Client)=>customTables[client.id]??[];
  const rowCount=(client:Client)=>Object.values(data[client.id]??{}).reduce((total,rows)=>total+(rows as unknown[]).length,0)+importedTables(client).reduce((total,table)=>total+table.rows.length,0);
  return <section className="settings-page">
    <section className="panel dropdesk-id-panel"><div className="panel-heading"><div><h3>Your Dropdesk ID</h3><p>Share this ID with a workspace owner so they can invite you to their workspace.</p></div><button className="button secondary" onClick={onCopyPublicId}><Copy size={14}/> Copy ID</button></div><div className="dropdesk-id-value"><b>{publicId||"Still loading…"}</b><small>{publicId?"This ID identifies your account. It is not a password — anyone with it can invite you, so only accept invitations you expect.":"Could not load your ID yet. Reload the page, or sign in if you are in demo mode."}</small></div></section>
    {isOwner&&<section className="panel team-panel"><div className="team-heading"><div><h3>Workspace members</h3><p>Invite a teammate and choose which clients they can access. Remove a member to revoke all access.</p></div><button className="button primary" onClick={onInvite}><Users size={15}/> Invite teammate</button></div><div className="team-member-list">{members.map(member=><div key={member.user_id} className="team-member-row"><div className="team-member-copy"><b>{member.email||member.user_id}</b><small>{member.role}{member.client_ids.length?` · ${member.client_ids.map(id=>clients.find(client=>client.id===id)?.name??id).join(", ")}`:" · no selected clients"}</small></div>{member.role!=="owner"&&<><button className={`button secondary team-shared ${member.shared_table_access===false?"off":"on"}`} title="Access to the shared Product hunting table" onClick={()=>onToggleShared(member)}>{member.shared_table_access===false?"Shared table: off":"Shared table: on"}</button><button className="button danger team-revoke" onClick={()=>onRevoke(member)}>Remove access</button></>}</div>)}{!members.length&&<p className="team-empty">{membersLoading?"Loading workspace members…":memberError?`Could not load workspace members: ${memberError}`:"No workspace members were returned."}</p>}{memberWarning&&<p className="team-empty">{memberWarning}</p>}</div></section>}
    <div className="settings-intro"><h2>Clients</h2><p>Rename a client, update their store details, or remove a client and everything stored for them.</p></div>
    <section className="panel settings-panel">
      <div className="panel-heading"><div><h3>Your clients</h3><p>{clients.length?`${clients.length} client workspace${clients.length===1?"":"s"} in this account.`:"No clients yet."}</p></div><button className="text-button" onClick={onAdd}>Add client <Plus size={14}/></button></div>
      {clients.length?<div className="client-table-wrap"><table className="client-table settings-table"><thead><tr><th>CLIENT</th><th>STORE</th><th>ROWS</th><th/></tr></thead><tbody>{clients.map(client=><tr key={client.id}><td><span className="table-client"><span className="client-avatar" style={{background:client.color}}>{client.initials}</span><span><b>{client.name}</b><small>{importedTables(client).length+3} tables</small></span></span></td><td className="store-cell"><span className="store-icon"><Store size={14}/></span>{client.store}</td><td>{rowCount(client)}</td><td><div className="settings-actions"><button className="text-button" onClick={()=>onOpen(client.id)}>Open</button><button className="text-button" onClick={()=>onEdit(client)}>Edit</button><button className="text-button danger" onClick={()=>onDelete(client)}>Delete</button></div></td></tr>)}</tbody></table></div>:<EmptyState title="No clients yet" text="Create your first client workspace to get started." actionLabel="Add a client" onClick={onAdd}/>}
    </section>
  </section>;
}

function ClientSettingsModal({draft,setDraft,onSave,onDelete,onClose}:{draft:{id:string;name:string;store:string;color:string};setDraft:(value:{id:string;name:string;store:string;color:string})=>void;onSave:()=>void;onDelete:()=>void;onClose:()=>void}) {
  const palette=["#e6e7dc","#f3ded8","#dce8ef","#e9e3f2","#f6eccf","#dff0e4"];
  return <form className="client-settings-form" onSubmit={event=>{event.preventDefault();onSave()}}><span className="modal-icon mint"><Store size={19}/></span><h2>Client settings</h2><p>Update how this client appears across your workspace.</p><label htmlFor="client-settings-name">CLIENT NAME</label><input id="client-settings-name" autoFocus className="modal-input" value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})} placeholder="e.g. Alex Morgan"/><label htmlFor="client-settings-store">STORE NAME</label><input id="client-settings-store" className="modal-input" value={draft.store} onChange={event=>setDraft({...draft,store:event.target.value})} placeholder="e.g. Alex’s Store"/><label>AVATAR COLOUR</label><div className="color-swatches">{palette.map(color=><button key={color} type="button" aria-label={`Use colour ${color}`} className={`color-swatch ${draft.color===color?"selected":""}`} style={{background:color}} onClick={()=>setDraft({...draft,color})}/>)}</div><div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save changes</button></div><div className="modal-danger"><p>Deleting removes this client’s rows and imported tables.</p><button className="button danger" type="button" onClick={onDelete}><Trash2 size={14}/> Delete client</button></div></form>;
}

function DeleteClientModal({client,rows,tables,busy,onConfirm,onCancel}:{client:Client;rows:number;tables:CustomTable[];busy:boolean;onConfirm:()=>void;onCancel:()=>void}) {
  const tableCount=tables.length;
  const parts=[`${rows} table row${rows===1?"":"s"}`, ...(tableCount?[`${tableCount} imported table${tableCount===1?"":"s"}`]:[])];
  return <><span className="modal-icon peach"><Trash2 size={19}/></span><h2>Delete {client.name}?</h2><p>This archives {client.name} and hides it from normal workspace views. An owner can restore it from the database.</p><div className="modal-actions"><button className="button secondary" type="button" onClick={onCancel} disabled={busy}>Keep client</button><button className="button danger" type="button" onClick={onConfirm} disabled={busy}>{busy?"Archiving…":"Archive client"}</button></div></>;
}
