"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowDownToLine, ArrowLeftRight, ArrowUpRight, BadgeCheck, Bell, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Command, CreditCard, FileSpreadsheet, Filter, LayoutDashboard, Link2, ListPlus, LogOut, MoreHorizontal, Package, Pencil, Plus, Search, Settings2, ShoppingBag, Sparkles, Store, TrendingUp, Users, Trash2, X, type LucideIcon } from "lucide-react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Client = { id: string; name: string; initials: string; color: string; store: string; workspace_id?: string; user_id?: string; visibility?: "workspace"|"selected"|"private" };
type Product = { id: string; title: string; source: string; sourceUrl?: string; cost: number; price: number; profit: number; margin: number; status: string; date: string };
type Listing = { id: string; title: string; source: string; price: number; sku: string; status: string; date: string };
type Order = { id: string; sourceId: string; source: string; item: string; cost: number; sale: number; fee: number; profit: number; status: string; date: string };
type Sheet = "Overview" | string;
type BuiltInTable = "Product hunting" | "Listings" | "Orders";
type CustomTable = { id: string; name: string; columns: string[]; rows: Record<string, any>[] };
type WorkspaceData = Record<string, Record<string, any[]>>;
const emptyClientData = (): WorkspaceData[string] => ({ "Product hunting": [], Listings: [], Orders: [] });
const isLegacyDemoClient = (id: string) => /^c[123]$/.test(id) || /-c[123]$/.test(id);
const tabs: Sheet[] = ["Overview", "Product hunting", "Listings", "Orders"];
const money = (n:number) => `$${n.toFixed(2)}`;
const shortDate = (s:string) => s;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingRow, setEditingRow] = useState<Record<string,any>|null>(null);
  const [editDraft, setEditDraft] = useState<Record<string,any>>({});
  const [settingsDraft, setSettingsDraft] = useState<{id:string;name:string;store:string;color:string}|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client|null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [userWorkspaceId, setUserWorkspaceId] = useState<string|null>(null);
  const [userRole, setUserRole] = useState<"owner"|"manager"|"va"|"viewer">("viewer");
  const [memberships,setMemberships]=useState<{workspace_id:string;role:"owner"|"manager"|"va"|"viewer"}[]>([]);
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteRole,setInviteRole]=useState<"manager"|"va"|"viewer">("va");
  const [inviteClients,setInviteClients]=useState<string[]>([]);
  const [inviteToken,setInviteToken]=useState("");
  const [inviteBusy,setInviteBusy]=useState(false);
  const current = clients.find(c=>c.id===active) ?? clients[0];
  useEffect(()=>{if(!current?.workspace_id)return;const membership=memberships.find(m=>m.workspace_id===current.workspace_id);if(membership){setUserWorkspaceId(membership.workspace_id);setUserRole(membership.role)}},[current?.workspace_id,memberships]);
  const acceptInviteFromUrl=async(sb:SupabaseClient)=>{
    const token=new URLSearchParams(window.location.search).get("invite");if(!token)return;
    const {error}=await sb.rpc("accept_workspace_invitation",{p_token:token});
    if(error){toast("This invitation is invalid, expired, or belongs to another email address.");return}
    const url=new URL(window.location.href);url.searchParams.delete("invite");window.history.replaceState({},"",url.toString());toast("You joined the invited workspace");
  };

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
      if(u&&k){const sb=createClient(u,k); setSupabase(sb); sb.auth.getUser().then(async ({data:{user}})=>{if(user?.email){setUserEmail(user.email);await acceptInviteFromUrl(sb);if(await loadWorkspace(sb,user.id))setUserId(user.id)}}).finally(()=>setAuthReady(true));} else setAuthReady(true);
    } catch { setAuthReady(true); }
  },[]);
  useEffect(()=>{setSelectedRows([])},[active,sheet]);
  useEffect(()=>{try{localStorage.setItem("dropdesk-demo",JSON.stringify({clients,data,customTables,active}))}catch{}},[clients,data,customTables,active]);
  useEffect(()=>{
    if(!supabase||!userId)return;
    const timer=setTimeout(async()=>{
      const clientRows=clients.filter(c=>c.workspace_id&&c.user_id===userId).map(c=>({...c,user_id:userId}));
      if(clientRows.length) await supabase.from("clients").upsert(clientRows,{onConflict:"id"});
      const workspaceRows=Object.entries(data).flatMap(([clientId,sheets])=>Object.entries(sheets).flatMap(([sheet,records])=>(records as any[]).map(r=>{const {__rowId,__createdBy,...payload}=r;return {id:String(r.id),user_id:__createdBy??userId,client_id:clientId,sheet,payload,updated_at:new Date().toISOString()}})));
      if(workspaceRows.length) await supabase.from("workspace_rows").upsert(workspaceRows,{onConflict:"id"});
      const tables=Object.entries(customTables).flatMap(([clientId,clientTables])=>clientTables.map(t=>({id:t.id,user_id:userId,client_id:clientId,name:t.name,columns:t.columns,rows:t.rows,updated_at:new Date().toISOString()})));
      if(tables.length) await supabase.from("workspace_tables").upsert(tables,{onConflict:"id"});
    },700);
    return ()=>clearTimeout(timer);
  },[supabase,userId,clients,data,customTables]);
  const loadWorkspace=async(sb:SupabaseClient, uid:string):Promise<boolean>=>{
    const clientResult=await sb.from("clients").select("id,name,initials,color,store,workspace_id,user_id,visibility").is("archived_at",null);
    const [rowResult,tableResult,membershipResult]=await Promise.all([sb.from("workspace_rows").select("id,user_id,client_id,sheet,payload").is("deleted_at",null),sb.from("workspace_tables").select("id,client_id,name,columns,rows").is("deleted_at",null),sb.from("workspace_members").select("workspace_id,role").eq("user_id",uid).order("created_at")]);
    if(clientResult.error||rowResult.error){toast("Could not load saved workspace. Check the Supabase schema.");return false}
    setMemberships((membershipResult.data??[]) as {workspace_id:string;role:"owner"|"manager"|"va"|"viewer"}[]);
    if(tableResult.error)toast("Custom table cloud sync needs the workspace_tables migration in Supabase.");
    const allClients = (clientResult.data ?? []) as Client[];
    if(!allClients.length){const ownWorkspace=(membershipResult.data??[]).find(m=>m.role==="owner");if(ownWorkspace){setUserWorkspaceId(ownWorkspace.workspace_id);setUserRole("owner")}}
      const remoteClients = allClients;
      if (!remoteClients.length) {
        setClients([]);
        setData({});
        setCustomTables({});
        setActive("");
        setSheet("Overview");
        return true;
      }
      const next: WorkspaceData = {};
      remoteClients.forEach((c) => { next[c.id] = emptyClientData(); });
      rowResult.data?.forEach((row: any) => { if (next[row.client_id] && row.sheet in next[row.client_id]) next[row.client_id][row.sheet as Exclude<Sheet, "Overview">].push({...row.payload,__rowId:row.id,__createdBy:row.user_id}); });
      const nextTables:Record<string,CustomTable[]>={};
      tableResult.data?.forEach((table:any)=>{if(next[table.client_id]){(nextTables[table.client_id]??=[]).push({id:table.id,name:table.name,columns:Array.isArray(table.columns)?table.columns:[],rows:Array.isArray(table.rows)?table.rows:[]})}});
      setClients(remoteClients);setData(next);setCustomTables(nextTables);setActive(remoteClients[0].id);return true;
  };
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
  const allOrders = Object.values(data).flatMap(d=>d.Orders||[]);
  const orderProfit = allOrders.reduce((a,r)=>a+r.profit,0);
  const setRows = (name:string, next:any[])=>{
    if(userEmail&&userRole==="viewer"){toast("Your role is read-only");return}
    if(!(customTable&&name===customTable.id)&&supabase&&userId){
      const prior=data[active]?.[name]??[];const remaining=new Set(next.map(row=>String(row.__rowId??row.id)));
      const removed=prior.map(row=>String(row.__rowId??row.id)).filter(id=>!remaining.has(id));
      if(removed.length)void supabase.from("workspace_rows").update({deleted_at:new Date().toISOString(),deleted_by:userId}).eq("client_id",active).in("id",removed);
    }
    customTable&&name===customTable.id?setCustomTables(prev=>({...prev,[active]:(prev[active]??[]).map(t=>t.id===name?{...t,rows:next}:t)})):setData(prev=>({...prev,[active]:{...prev[active], [name]:next}}));
  };
  const addClient = ()=>{
    const name=clientName.trim(); if(!name)return;
    if(userEmail&&userRole!=="owner")return toast("Only a workspace owner can create clients");
    if(userEmail&&userRole!=="owner")return toast("Only a workspace owner can create clients");
    const id=`c${Date.now()}`; const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    const client={id,name,initials,color:["#e6e7dc","#f3ded8","#dce8ef"][clients.length%3],store:`${name.split(" ")[0]}’s Store`,workspace_id:userWorkspaceId??undefined,user_id:userId??undefined,visibility:"selected" as const};
    setClients([...clients,client]); setData({...data,[id]:emptyClientData()}); setActive(id); setSheet("Overview"); setClientName(""); setModal(null); toast("Client workspace created");
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
  const addProduct=()=>{
    const title=productName.trim();
    const sourceUrl=productSourceUrl.trim();
    const cost=Number(supplierCost);
    const price=Number(ebayPrice);
    if(!title||!sourceUrl||!active)return;
    if(!Number.isFinite(cost)||cost<0||!Number.isFinite(price)||price<0){toast("Enter valid supplier and eBay prices");return}
    const profit=+(price*.87-cost).toFixed(2);
    const newProduct={id:`P-${Math.floor(1000+Math.random()*9000)}`,title,source:productSource,sourceUrl,cost,price,profit,margin:price?Math.round(profit/price*100):0,status:"Researching",date:new Date().toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"})};
    setRows("Product hunting",[newProduct,...(data[active]?.["Product hunting"]??[])]);
    setProductName("");setProductSourceUrl("");setProductSource("AliExpress");setSupplierCost("");setEbayPrice("");setModal(null);toast("Product added to product hunting");
  };
  const createTableFromImport=async()=>{
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
    if(sheet==="Overview")return;
    if(sheet==="Product hunting"){setModal("product");return}
    if(customTable){const row={__rowId:`${sheet}-row-${Date.now()}`,...Object.fromEntries(customTable.columns.map(column=>[column,""]))};setRows(sheet,[row,...rows]);toast("New row added");return}
    const targetSheet=sheet;
    const id=`${targetSheet==="Listings"?"LST":targetSheet==="Orders"?"23-10601":"P"}-${Math.floor(1000+Math.random()*9000)}`;
    const date="Oct 17, 2026";
    const newRow = targetSheet==="Product hunting" ? {id,title:"New product idea",source:"AliExpress",cost:0,price:0,profit:0,margin:0,status:"Researching",date} : targetSheet==="Listings" ? {id,title:"New eBay listing",source:"AliExpress",price:0,sku:"NEW-001",status:"Draft",date} : {id,sourceId:"",source:"AliExpress",item:"New order",cost:0,sale:0,fee:0,profit:0,status:"Processing",date};
    setRows(targetSheet,[newRow,...rows]); toast("New row added");
  };
  const beginEditRow=(row:Record<string,any>)=>{setEditingRow(row);setEditDraft({...row});setModal("edit")};
  const saveEditedRow=()=>{
    if(!editingRow)return;
    const key=rowKey(editingRow);const nextDraft={...editDraft};
    if(!customTable&&sheet==="Product hunting"){nextDraft.profit=+(nextDraft.price*.87-nextDraft.cost).toFixed(2);nextDraft.margin=nextDraft.price?Math.round(nextDraft.profit/nextDraft.price*100):0}
    if(!customTable&&sheet==="Orders")nextDraft.profit=+(nextDraft.sale-nextDraft.cost-nextDraft.fee).toFixed(2);
    setRows(sheet,rows.map(row=>rowKey(row)===key?nextDraft:row));setSelectedRows(current=>current.filter(id=>id!==key));setEditingRow(null);setEditDraft({});setModal(null);toast("Row updated");
  };
  const deleteSelectedRows=()=>{if(!selectedRows.length)return;setRows(sheet,rows.filter(row=>!selectedRows.includes(rowKey(row))));setSelectedRows([]);toast("Selected rows deleted")};
  const toggleRowSelection=(key:string)=>setSelectedRows(current=>current.includes(key)?current.filter(id=>id!==key):[...current,key]);
  const allVisibleSelected=filtered.length>0&&filtered.every((row:any)=>selectedRows.includes(rowKey(row)));
  const toggleVisibleSelection=()=>setSelectedRows(allVisibleSelected?current=>current.filter(id=>!filtered.some((row:any)=>rowKey(row)===id)):Array.from(new Set([...selectedRows,...filtered.map((row:any)=>rowKey(row))])));
  const updateCell=(rowIndex:number,key:string,value:string)=>{
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
  const submitAuth=async(e:React.FormEvent)=>{e.preventDefault();if(!authEmail.includes("@"))return toast("Enter a valid email address");if(authPassword.length<8)return toast("Use a password with at least 8 characters");if(authMode==="signup"&&!authName.trim())return toast("Enter your name");if(!supabase)return toast("Connect Supabase to create a secure account");setAuthBusy(true);try{const result=authMode==="signup"?await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{full_name:authName.trim(),name:authName.trim()},emailRedirectTo:window.location.origin}}):await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});if(result.error)return toast(result.error.message);const user=result.data.user;if(result.data.session&&user){setUserEmail(user.email??authEmail);await acceptInviteFromUrl(supabase);if(await loadWorkspace(supabase,user.id))setUserId(user.id);setModal(null);toast(authMode==="signup"?"Your account is ready":"You’re signed in");}else if(authMode==="signup"){setModal(null);toast("Account created. If email confirmation is enabled, use the link in your inbox.");}else toast("Sign-in did not return an active session");}finally{setAuthBusy(false);}};
  const continueWithGoogle=async()=>{if(!supabase)return toast("Connect Supabase to enable Google sign-in");const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});if(error)toast(error.message);};
  const createInvitation=async()=>{
    if(!supabase||!userWorkspaceId||userRole!=="owner")return toast("Only a workspace owner can invite members");
    if(!inviteEmail.includes("@"))return toast("Enter a valid email address");
    setInviteBusy(true);
    try{const {data,error}=await supabase.rpc("create_workspace_invitation",{p_workspace_id:userWorkspaceId,p_email:inviteEmail.trim(),p_role:inviteRole,p_client_ids:inviteClients});if(error||typeof data!=="string")throw new Error("Could not create the invitation. Check the workspace migration and your owner role.");setInviteToken(data);toast("Invitation link created");}
    catch(error){toast(error instanceof Error?error.message:"Could not create invitation");}
    finally{setInviteBusy(false)}
  };
  const copyInvitation=async()=>{const link=`${window.location.origin}/?invite=${encodeURIComponent(inviteToken)}`;try{await navigator.clipboard.writeText(link);toast("Invitation link copied");}catch{toast("Copy failed; select and copy the invitation link")}};
  const signOut=async()=>{if(supabase)await supabase.auth.signOut();setUserId(null);setUserEmail("");setClients([]);setData({});setCustomTables({});setActive("");setSheet("Overview");setMenuOpen(false);toast("Signed out");};

  if (!authReady) return <main className="landing-loading"><span className="brand-mark"><ArrowLeftRight size={19} strokeWidth={2.4}/></span><b>dropdesk<span className="brand-dot">.</span></b></main>;

  return <main className={userEmail ? "app-shell" : "landing-shell"}>
    {!userEmail ? <LandingPage onStart={()=>{setAuthMode("signup");setModal("auth")}} onLogin={()=>{setAuthMode("login");setModal("auth")}}/> : <>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><ArrowLeftRight size={19} strokeWidth={2.4}/></span><span>dropdesk<span className="brand-dot">.</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className="workspace-switch"><span className="workspace-avatar">{userEmail?userEmail.slice(0,1).toUpperCase():"G"}</span><span className="workspace-text"><b>{userEmail?`${userEmail.split("@")[0]}’s workspace`:"Guest workspace"}</b><small>{userEmail?"Your workspace":"Guest preview"}</small></span><ChevronDown size={15}/></button>
      <div className="nav-group"><div className="nav-caption">MENU</div>
        <button className={`nav-link ${sheet==="Overview"?"active":""}`} onClick={()=>setSheet("Overview")}><LayoutDashboard size={17}/>Overview</button>
        {userRole==="owner"&&<button className={`nav-link ${sheet==="Settings"?"active":""}`} onClick={()=>setSheet("Settings")}><Users size={17}/>Team &amp; access</button>}
        <div className="nav-caption clients-caption"><span>YOUR CLIENTS</span><button className="tiny-add" onClick={()=>setModal("client")} aria-label="Add client"><Plus size={15}/></button></div>
        <div className="client-list">{clients.map(c=><div className="client-nav-group" key={c.id}><button className={`client-link ${active===c.id?"selected":""}`} onClick={()=>{setActive(c.id);setSheet("Overview");setQuery("")}}><span className="client-avatar" style={{background:c.color}}>{c.initials}</span><span className="client-link-name">{c.name}</span></button>{active===c.id&&<div className="client-submenu">{(["Product hunting","Listings","Orders"] as BuiltInTable[]).map((name)=><button key={name} className={sheet===name?"active":""} onClick={()=>setSheet(name)}>{name==="Product hunting"?<Package size={13}/>:name==="Listings"?<ClipboardList size={13}/>:<ShoppingBag size={13}/>}<span>{name}</span><small>{data[c.id]?.[name]?.length??0}</small></button>)}</div>}</div>)}</div>
        <button className="new-client" onClick={()=>setModal("client")}><Plus size={15}/> Add a client</button>
      </div>
      <div className="sidebar-bottom">
        <button className={`nav-link settings-link ${sheet==="Settings"?"active":""}`} onClick={()=>{setSheet("Settings");setMenuOpen(false)}}><Settings2 size={17}/>Settings</button>
        <div className="profile-wrap"><button className="profile" onClick={()=>setMenuOpen(!menuOpen)}><span className="profile-avatar">{userEmail?userEmail.slice(0,2).toUpperCase():"G"}</span><span className="profile-copy"><b>{userEmail?userEmail.split("@")[0]:"Guest preview"}</b><small>{userEmail||"Sign in to save your workspace"}</small></span><MoreHorizontal size={17}/></button>{menuOpen&&<div className="profile-menu">{userEmail?<button onClick={signOut}><LogOut size={15}/> Sign out</button>:<button onClick={()=>{setModal("auth");setMenuOpen(false)}}><BadgeCheck size={15}/> Sign in / create account</button>}</div>}</div>
      </div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><span>{sheet==="Overview"?"Overview":sheet==="Settings"?"Settings":current?.name}</span>{sheet!=="Overview"&&sheet!=="Settings"&&<><ChevronRight size={14}/><b>{displaySheet}</b></>}</div><div className="top-actions"><div className="search-box"><Search size={16}/><input placeholder="Search anything..." value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-button" onClick={()=>toast("You’re all caught up")} aria-label="Notifications"><Bell size={17}/><span className="notification-dot"/></button><span className="top-divider"/><button className="help-button" onClick={()=>toast("Help center coming soon")}><CircleHelp size={16}/>Help</button></div></header>
      <div className="content">
        {!userEmail&&<div className="guest-banner"><span className="guest-badge"><Sparkles size={14}/> PREVIEW</span><span className="guest-message"><b>Your workspace starts empty.</b> Create a free account to save the clients, listings, and orders you add.</span><button className="button primary guest-cta" onClick={()=>setModal("auth")}>Create free account <ArrowUpRight size={14}/></button></div>}
        <div className="page-heading"><div><div className="eyebrow">{sheet==="Overview"?"YOUR WORKSPACE":sheet==="Settings"?"WORKSPACE":"CLIENT WORKSPACE"} <span className="eyebrow-line"/></div><h1>{sheet==="Overview"?(userEmail?`Welcome back, ${userEmail.split("@")[0]} `:"Your dropshipping workspace "):sheet==="Settings"?"Settings":displaySheet}{sheet==="Overview"&&<span className="wave">✳</span>}</h1><p className="subheading">{sheet==="Overview"?(clients.length?"Here’s what’s happening across your client accounts today.":"Add your first client to start organizing your work."):sheet==="Settings"?"Rename a client, update their store details, or remove a client and everything stored for them.":`${current?.name} · ${current?.store}`}</p></div><div className="heading-actions">{sheet!=="Overview"&&sheet!=="Settings"&&<button className="button secondary" onClick={exportCsv}><ArrowDownToLine size={15}/> Export</button>}{current&&sheet!=="Settings"&&<button className="button secondary" onClick={()=>{setImportName("");setImportFile(null);setModal("import")}}><FileSpreadsheet size={15}/> Import CSV</button>}<button className="button primary" onClick={()=>sheet==="Overview"||sheet==="Settings"?setModal("client"):addRow()}><Plus size={16}/>{sheet==="Overview"||sheet==="Settings"?"Add client":customTable?"Add row":sheet==="Listings"?"Add listing":sheet==="Orders"?"Add order":"Add product"}</button></div></div>
        {sheet==="Overview"?<>
          {current && !Object.values(data[current.id]??{}).some(rows=>rows.length) ? <ClientSetup clientName={current.name} customTables={activeCustomTables} onOpenTable={id=>setSheet(id)} onChoose={(table)=>setSheet(table)} onImport={()=>{setImportName("");setImportFile(null);setModal("import")}}/> : clients.length?<section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14}/> YOUR BUSINESS, AT A GLANCE</span><h2>Everything in its right place.</h2><p>Your clients, products, listings, and orders—all together, finally.</p><button onClick={()=>setSheet("Orders")}>View your orders <ArrowUpRight size={14}/></button></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card art-card-back"><span className="art-mini-icon mint"><Package size={14}/></span><span className="art-lines"><i/><i/></span><span className="art-check">✓</span></div><div className="art-card art-card-front"><span className="art-mini-icon peach"><ShoppingBag size={14}/></span><span className="art-lines"><i/><i/></span></div><div className="art-spark">✳</div><div className="art-dot"/></div></section>:<section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14}/> YOUR WORKSPACE IS READY</span><h2>No client workspaces yet.</h2><p>Create your first client to start tracking product ideas, listings, and orders.</p><button onClick={()=>setModal("client")}>Add your first client <ArrowUpRight size={14}/></button></div></section>}
          {current&&Object.values(data[current.id]??{}).some(rows=>rows.length)&&<section className="panel custom-shortcuts"><div className="panel-heading"><div><h3>{current.name} tables</h3><p>Open one of this client’s tables.</p></div><button className="text-button" onClick={()=>{setImportName("");setImportFile(null);setModal("import")}}>Import CSV <Plus size={14}/></button></div><div className="custom-shortcut-list">{(["Product hunting","Listings","Orders"] as BuiltInTable[]).map(table=><button key={table} onClick={()=>setSheet(table)}>{table==="Product hunting"?<Package size={16}/>:table==="Listings"?<ClipboardList size={16}/>:<ShoppingBag size={16}/>}<span>{table}</span><small>{data[current.id]?.[table]?.length??0} rows</small><ArrowUpRight size={14}/></button>)}{activeCustomTables.map(table=><button key={table.id} onClick={()=>setSheet(table.id)}><FileSpreadsheet size={16}/><span>{table.name}</span><small>{table.rows.length} rows</small><ArrowUpRight size={14}/></button>)}</div></section>}
          <div className="section-title-row"><div><h2>Overview</h2><p>A snapshot of your operation across all clients.</p></div><button className="period-select" onClick={()=>toast("Showing this month")}><span className="period-dot"/> This month <ChevronDown size={14}/></button></div>
          <div className="stats-grid"><StatCard label="Active clients" value={String(clients.length).padStart(2,"0")} change="All accounts" icon={<Users size={17}/>} tone="mint"/><StatCard label="Orders this month" value={String(allOrders.length).padStart(2,"0")} change="Across all clients" icon={<ShoppingBag size={17}/>} tone="peach"/><StatCard label="Net profit" value={money(orderProfit)} change="After marketplace fees" icon={<TrendingUp size={17}/>} tone="lavender"/><StatCard label="Active listings" value={String(Object.values(data).flatMap(d=>d.Listings||[]).length).padStart(2,"0")} change="Across all stores" icon={<Store size={17}/>} tone="yellow"/></div>
          <div className="dashboard-grid"><section className="panel clients-panel"><div className="panel-heading"><div><h3>Your clients</h3><p>Open a client workspace.</p></div><button className="text-button" onClick={()=>setModal("client")}>Add client <Plus size={14}/></button></div><div className="client-table-wrap">{clients.length?<table className="client-table"><thead><tr><th>CLIENT</th><th>STORE</th><th>ORDERS</th><th>NET PROFIT</th><th/></tr></thead><tbody>{clients.slice(0,4).map((c,i)=>{const d=data[c.id];const ord=d?.Orders?.length??0;const prof=d?.Orders?.reduce((a:any,o:any)=>a+o.profit,0)??0;return <tr key={c.id} onClick={()=>{setActive(c.id);setSheet("Overview");setQuery("")}}><td><span className="table-client"><span className="client-avatar" style={{background:c.color}}>{c.initials}</span><span><b>{c.name}</b><small>Open workspace</small></span></span></td><td className="store-cell"><span className="store-icon"><Store size={14}/></span>{c.store}</td><td>{ord||"—"}</td><td className="profit-cell">{prof?money(prof):"—"}</td><td><button className="row-more" aria-label="Open client workspace" onClick={e=>{e.stopPropagation();setActive(c.id);setSheet("Overview")}}><ArrowUpRight size={15}/></button></td></tr>})}</tbody></table>:<EmptyState title="No clients yet" text="Create your first client workspace to get started." actionLabel="Add a client" onClick={()=>setModal("client")}/>}</div><button className="add-client-row" onClick={()=>setModal("client")}><Plus size={15}/> Add another client</button></section>
            <section className="panel activity-panel"><div className="panel-heading"><div><h3>Recent activity</h3><p>Latest across your accounts.</p></div><button className="more-round" onClick={()=>toast("Activity history coming soon")}><MoreHorizontal size={17}/></button></div><div className="activity-list"><div className="empty-state"><span className="empty-icon"><FileSpreadsheet size={18}/></span><b>No activity yet</b><p>Your updates will appear here after you add clients and orders.</p></div></div>{clients.length>0&&<button className="activity-footer" onClick={()=>setSheet("Orders")}>See all activity <ArrowUpRight size={14}/></button>}</section></div>
        </>:sheet==="Settings"?<SettingsPage clients={clients} data={data} customTables={customTables} isOwner={userRole==="owner"} onInvite={()=>{setInviteEmail("");setInviteRole("va");setInviteClients([]);setInviteToken("");setModal("invite")}} onOpen={id=>{setActive(id);setSheet("Overview")}} onEdit={openClientSettings} onDelete={requestDeleteClient} onAdd={()=>setModal("client")}/>:<>
          <div className="client-context"><span className="context-avatar" style={{background:current?.color}}>{current?.initials}</span><div><b>{current?.name}</b><span><Store size={13}/>{current?.store}<span className="context-sep">·</span><span className="live-dot"/> Connected</span></div><button aria-label="Client settings" onClick={()=>current&&openClientSettings(current)}><MoreHorizontal size={18}/></button></div>
          <div className="sheet-tabs">{[...tabs,...activeCustomTables.map(t=>t.id)].map(t=>{const custom=activeCustomTables.find(x=>x.id===t);return <button key={t} className={sheet===t?"tab-active":""} onClick={()=>setSheet(t)}>{custom?<FileSpreadsheet size={15}/>:t==="Product hunting"?<Package size={15}/>:t==="Listings"?<ClipboardList size={15}/>:t==="Orders"?<ShoppingBag size={15}/>:<LayoutDashboard size={15}/>} {custom?.name??t}{t!=="Overview"&&<span className="tab-count">{custom?custom.rows.length:items?.[t]?.length??0}</span>}</button>})}<button className="add-table-tab" onClick={()=>{setImportName("");setImportFile(null);setModal("import")}}><Plus size={14}/> Import CSV</button></div>
           <>
            <div className="sheet-summary"><div><h2>{displaySheet}</h2><p>{customTable?`${customTable.columns.length} columns imported from your spreadsheet.`:sheet==="Product hunting"?"Find products worth listing. Add source costs, target price, and links.":sheet==="Listings"?"Keep your client’s live and draft eBay listings in one place.":"Track fulfillment and see your profit per sale."}</p></div><span className="last-saved"><span/> Saved locally</span></div>
             <div className="table-toolbar"><div className="toolbar-left"><div className="filter-chip"><Filter size={14}/><select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option>All sources</option><option>AliExpress</option><option>Amazon</option><option>Alibaba</option></select><ChevronDown size={13}/></div><button className="toolbar-filter" onClick={()=>toast("More filters coming soon")}><Settings2 size={14}/> Filters</button><button className="toolbar-filter" onClick={()=>{setQuery("");setSourceFilter("All sources")}}>Clear</button></div><div className="toolbar-right"><span className="row-count">{filtered.length} {filtered.length===1?"record":"records"}</span>{selectedRows.length>0&&<button className="button danger compact" onClick={deleteSelectedRows}><X size={14}/> Delete {selectedRows.length} selected</button>}<button className="button secondary compact" onClick={exportCsv}><ArrowDownToLine size={14}/> Export CSV</button><button className="button primary compact" onClick={addRow}><Plus size={15}/> Add {customTable?"row":sheet==="Listings"?"listing":sheet==="Orders"?"order":"product"}</button></div></div>
            <div className="data-table-wrap">{customTable?<CustomTableGrid table={customTable} rows={filtered} selectedRows={selectedRows} onToggleSelect={toggleRowSelection} onSelectAll={toggleVisibleSelection} allSelected={allVisibleSelected} onEditRow={beginEditRow} onDelete={(row)=>setRows(sheet,rows.filter(r=>r!==row))}/>:<table className="data-table"><thead><tr><th className="select-col"><input type="checkbox" aria-label="Select all visible rows" checked={allVisibleSelected} onChange={toggleVisibleSelection}/></th>{sheet==="Product hunting"?<><th>PRODUCT</th><th>SOURCE</th><th>SOURCE LINK</th><th>SUPPLIER COST</th><th>EBAY PRICE</th><th>EST. PROFIT</th><th>MARGIN</th><th>STATUS</th><th>DATE ADDED</th><th/></>:sheet==="Listings"?<><th>LISTING TITLE</th><th>SOURCE</th><th>EBAY PRICE</th><th>SKU</th><th>STATUS</th><th>LISTED</th><th/></>:<><th>EBAY ORDER ID</th><th>ITEM</th><th>SOURCE / ORDER ID</th><th>SOURCE COST</th><th>SALE PRICE</th><th>EBAY FEES</th><th>NET PROFIT</th><th>STATUS</th><th>ORDER DATE</th><th/></>}</tr></thead><tbody>{filtered.map((r:any,index:number)=><tr key={r.id}><td className="select-cell"><input type="checkbox" aria-label={`Select ${r.title??r.item??r.id}`} checked={selectedRows.includes(rowKey(r))} onChange={()=>toggleRowSelection(rowKey(r))}/></td><td>{sheet==="Product hunting"?<div className="product-name"><span className="product-thumbnail"><Package size={16}/></span><input readOnly className="cell-input title-input" value={r.title} onChange={e=>updateCell(rows.indexOf(r),"title",e.target.value)}/></div>:sheet==="Listings"?<div className="listing-title"><b className="listing-id">{r.id}</b><input readOnly className="cell-input title-input" value={r.title} onChange={e=>updateCell(rows.indexOf(r),"title",e.target.value)}/></div>:<span className="order-id">{r.id}</span>}</td>{sheet==="Product hunting"?<><td><Source source={r.source}/></td><td><div className="source-link-cell"><input readOnly className="cell-input source-url-input" value={r.sourceUrl??""} onChange={e=>updateCell(rows.indexOf(r),"sourceUrl",e.target.value)} placeholder="Paste source link"/>{/^https?:\/\//i.test(r.sourceUrl??"")&&<a href={r.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open source link"><ArrowUpRight size={13}/></a>}</div></td><td><MoneyInput value={r.cost} onChange={v=>updateCell(rows.indexOf(r),"cost",v)}/></td><td><MoneyInput value={r.price} onChange={v=>updateCell(rows.indexOf(r),"price",v)}/></td><td className="green-money">{money(r.profit)}</td><td><span className="margin-pill">{r.margin}%</span></td><td><Status value={r.status}/></td><td className="date-cell">{shortDate(r.date)}</td><td><RowMenu onEdit={()=>beginEditRow(r)} onDelete={()=>setRows(sheet,rows.filter((_:any,i:number)=>i!==rows.indexOf(r)))}/></td></>:sheet==="Listings"?<><td><Source source={r.source}/></td><td><MoneyInput value={r.price} onChange={v=>updateCell(rows.indexOf(r),"price",v)}/></td><td><input readOnly className="cell-input sku-input" value={r.sku} onChange={e=>updateCell(rows.indexOf(r),"sku",e.target.value)}/></td><td><Status value={r.status}/></td><td className="date-cell">{r.date}</td><td><RowMenu onEdit={()=>beginEditRow(r)} onDelete={()=>setRows(sheet,rows.filter((_:any,i:number)=>i!==rows.indexOf(r)))}/></td></>:<><td><span className="order-id">{r.id}</span></td><td><input readOnly className="cell-input item-input" value={r.item} onChange={e=>updateCell(rows.indexOf(r),"item",e.target.value)}/></td><td><div className="source-id"><Source source={r.source}/><input readOnly className="cell-input sourceid-input" value={r.sourceId} onChange={e=>updateCell(rows.indexOf(r),"sourceId",e.target.value)} placeholder="Add order ID"/></div></td><td><MoneyInput value={r.cost} onChange={v=>updateCell(rows.indexOf(r),"cost",v)}/></td><td><MoneyInput value={r.sale} onChange={v=>updateCell(rows.indexOf(r),"sale",v)}/></td><td><MoneyInput value={r.fee} onChange={v=>updateCell(rows.indexOf(r),"fee",v)}/></td><td className={r.profit>=0?"green-money":"negative-money"}>{money(r.profit)}</td><td><Status value={r.status}/></td><td className="date-cell">{r.date}</td><td><RowMenu onEdit={()=>beginEditRow(r)} onDelete={()=>setRows(sheet,rows.filter((_:any,i:number)=>i!==rows.indexOf(r)))}/></td></>}</tr>)}</tbody></table>}{!filtered.length&&<EmptyState title={query?"No matching rows":"A clean slate"} text={query?"Try another search or clear the filters.":`Add your first ${customTable?"row":sheet==="Product hunting"?"product idea":sheet==="Listings"?"listing":"order"} to start tracking.`} onClick={addRow}/>}</div>
            <div className="table-footer"><span>Showing <b>{filtered.length?1:0}–{filtered.length}</b> of <b>{rows.length}</b> records</span><div><button disabled><ChevronLeft size={15}/></button><button className="page-number">1</button><button disabled><ChevronRight size={15}/></button></div></div>
           </>
        </>}
        <footer className="app-footer"><span>Made for the moving parts.</span><span><a onClick={()=>toast("Help center coming soon")}>Help center</a><span className="footer-sep">·</span><a onClick={()=>toast("Shortcuts: ⌘ K to search")}>Keyboard shortcuts</a><span className="footer-sep">·</span>v1.0.0</span></footer>
      </div>
    </section>
    </>}
    {notice&&<div className="toast"><span className="toast-check">✓</span>{notice}</div>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal"><button className="modal-close" onClick={()=>setModal(null)} aria-label="Close"><X size={17}/></button>{modal==="client"?<><span className="modal-icon mint"><Users size={19}/></span><h2>Add a client</h2><p>Create a workspace for your client’s stores, product ideas, listings, and orders.</p><label>CLIENT NAME</label><input autoFocus className="modal-input" value={clientName} onChange={e=>setClientName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClient()} placeholder="e.g. Alex Morgan"/><div className="modal-note"><Store size={15}/> You can add their store name and details later.</div><button className="button primary modal-submit" onClick={addClient}><Plus size={16}/> Create workspace</button></>:modal==="product"?<ProductModal name={productName} setName={setProductName} sourceUrl={productSourceUrl} setSourceUrl={setProductSourceUrl} source={productSource} setSource={setProductSource} cost={supplierCost} setCost={setSupplierCost} price={ebayPrice} setPrice={setEbayPrice} onAdd={addProduct}/>:modal==="edit"?<RowEditModal title={customTable?.name??sheet} draft={editDraft} fields={Object.keys(editDraft).filter(key=>key!=="id"&&key!=="__rowId"&&key!=="__createdBy"&&(customTable||!(["profit","margin"].includes(key))))} setDraft={setEditDraft} onSave={saveEditedRow} onClose={()=>setModal(null)}/>:modal==="import"?<ImportTableModal name={importName} setName={setImportName} file={importFile} setFile={setImportFile} busy={importBusy} onImport={createTableFromImport} onClose={()=>setModal(null)}/>:modal==="clientSettings"&&settingsDraft?<ClientSettingsModal draft={settingsDraft} setDraft={setSettingsDraft} onSave={saveClientSettings} onDelete={()=>{const target=clients.find(c=>c.id===settingsDraft.id); if(target)requestDeleteClient(target)}} onClose={()=>{setModal(null);setSettingsDraft(null)}}/>:modal==="deleteClient"&&deleteTarget?<DeleteClientModal client={deleteTarget} rows={Object.values(data[deleteTarget.id]??{}).reduce((total,sheetRows)=>total+(sheetRows as any[]).length,0)} tables={customTables[deleteTarget.id]??[]} busy={deleteBusy} onConfirm={confirmDeleteClient} onCancel={()=>{setModal(null);setDeleteTarget(null)}}/>:modal==="invite"?<InviteModal email={inviteEmail} setEmail={setInviteEmail} role={inviteRole} setRole={setInviteRole} clients={clients} selected={inviteClients} setSelected={setInviteClients} token={inviteToken} busy={inviteBusy} onCreate={createInvitation} onCopy={copyInvitation} onClose={()=>setModal(null)}/>:<><span className="modal-icon lavender"><BadgeCheck size={19}/></span><h2>{authMode==="signup"?"Create your Dropdesk account":"Welcome back"}</h2><p>{authMode==="signup"?"Start organizing client stores, products, listings, and orders.":"Sign in to continue to your workspace."}</p><button className="google-auth-button" type="button" onClick={continueWithGoogle}><span className="google-g">G</span>Continue with Google</button><div className="auth-divider"><span/>or continue with email<span/></div><form onSubmit={submitAuth}>{authMode==="signup"&&<><label htmlFor="auth-name">YOUR NAME</label><input id="auth-name" autoComplete="name" className="modal-input" value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your name" required/></>}<label htmlFor="auth-email">EMAIL ADDRESS</label><input id="auth-email" autoFocus type="email" autoComplete="email" className="modal-input" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required/><label htmlFor="auth-password">PASSWORD</label><input id="auth-password" type="password" autoComplete={authMode==="signup"?"new-password":"current-password"} minLength={8} className="modal-input" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters" required/><button className="button primary modal-submit" type="submit" disabled={authBusy}>{authBusy?(authMode==="signup"?"Creating account…":"Signing in…"):(authMode==="signup"?"Create account":"Sign in")}<ArrowUpRight size={15}/></button></form><button className="auth-mode-switch" type="button" onClick={()=>setAuthMode(authMode==="signup"?"login":"signup")}>{authMode==="signup"?"Already have an account? Sign in":"New to Dropdesk? Create an account"}</button><div className="modal-note"><BadgeCheck size={15}/> Your workspace is private to your account.</div></>}</div></div>}
  </main>;
}

function InviteModal({email,setEmail,role,setRole,clients,selected,setSelected,token,busy,onCreate,onCopy,onClose}:{email:string;setEmail:(v:string)=>void;role:"manager"|"va"|"viewer";setRole:(v:"manager"|"va"|"viewer")=>void;clients:Client[];selected:string[];setSelected:(v:string[])=>void;token:string;busy:boolean;onCreate:()=>void;onCopy:()=>void;onClose:()=>void}) {
  const invitationLink=typeof window!=="undefined"&&token?`${window.location.origin}/?invite=${encodeURIComponent(token)}`:"";
  const toggle=(id:string)=>setSelected(selected.includes(id)?selected.filter(v=>v!==id):[...selected,id]);
  if(token)return <><span className="modal-icon mint"><BadgeCheck size={19}/></span><h2>Invitation ready</h2><p>Share this one-use link with {email}. It expires in seven days and only works for that email address.</p><label>INVITATION LINK</label><input className="modal-input" readOnly value={invitationLink}/><div className="modal-actions"><button className="button secondary" onClick={onClose}>Done</button><button className="button primary" onClick={onCopy}><Link2 size={15}/> Copy invite link</button></div></>;
  return <form onSubmit={e=>{e.preventDefault();onCreate()}}><span className="modal-icon mint"><Users size={19}/></span><h2>Invite a teammate</h2><p>They must sign in with the invited email. Select the clients they should be able to access.</p><label htmlFor="invite-email">EMAIL ADDRESS</label><input id="invite-email" type="email" className="modal-input" autoFocus required value={email} onChange={e=>setEmail(e.target.value)} placeholder="teammate@example.com"/><label htmlFor="invite-role">ROLE</label><select id="invite-role" className="modal-input" value={role} onChange={e=>setRole(e.target.value as "manager"|"va"|"viewer")}><option value="manager">Manager — edit data</option><option value="va">VA — create and edit data</option><option value="viewer">Viewer — read only</option></select><label>CLIENT ACCESS</label><div className="invite-client-list">{clients.map(client=><label key={client.id} className="invite-client-option"><input type="checkbox" checked={selected.includes(client.id)} onChange={()=>toggle(client.id)}/><span>{client.name}</span><small>{client.visibility??"selected"}</small></label>)}</div><p className="invite-help">Clients not selected remain hidden. Workspace-visible clients can still be seen by all workspace members.</p><div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy?"Creating link…":"Create invite link"}</button></div></form>;
}

function ProductModal({name,setName,sourceUrl,setSourceUrl,source,setSource,cost,setCost,price,setPrice,onAdd}:{name:string;setName:(value:string)=>void;sourceUrl:string;setSourceUrl:(value:string)=>void;source:string;setSource:(value:string)=>void;cost:string;setCost:(value:string)=>void;price:string;setPrice:(value:string)=>void;onAdd:()=>void}) {
  return <form onSubmit={e=>{e.preventDefault();onAdd()}}><span className="modal-icon mint"><Package size={19}/></span><h2>Add product idea</h2><p>Save the supplier details and target eBay price for this product.</p><label htmlFor="product-name">PRODUCT NAME</label><input id="product-name" autoFocus className="modal-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Stainless steel water bottle" required/><label htmlFor="product-source-link">SOURCE LINK</label><input id="product-source-link" type="url" className="modal-input" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://..." required/><label htmlFor="product-source">SOURCE</label><select id="product-source" className="modal-input" value={source} onChange={e=>setSource(e.target.value)}><option>AliExpress</option><option>Alibaba</option><option>Amazon</option><option>Other</option></select><div className="product-price-fields"><div><label htmlFor="supplier-cost">SUPPLIER COST</label><input id="supplier-cost" type="number" min="0" step="0.01" className="modal-input" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0.00" required/></div><div><label htmlFor="ebay-price">EBAY PRICE</label><input id="ebay-price" type="number" min="0" step="0.01" className="modal-input" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00" required/></div></div><div className="modal-note"><TrendingUp size={15}/> Estimated profit is calculated after you add the product.</div><button className="button primary modal-submit" type="submit"><Plus size={16}/> Add product</button></form>;
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

function SettingsPage({clients,data,customTables,isOwner,onInvite,onOpen,onEdit,onDelete,onAdd}:{clients:Client[];data:WorkspaceData;customTables:Record<string,CustomTable[]>;isOwner:boolean;onInvite:()=>void;onOpen:(id:string)=>void;onEdit:(client:Client)=>void;onDelete:(client:Client)=>void;onAdd:()=>void}) {
  const importedTables=(client:Client)=>customTables[client.id]??[];
  const rowCount=(client:Client)=>Object.values(data[client.id]??{}).reduce((total,rows)=>total+(rows as unknown[]).length,0)+importedTables(client).reduce((total,table)=>total+table.rows.length,0);
  return <section className="settings-page">
    {isOwner&&<section className="panel team-panel"><div><h3>Workspace members</h3><p>Invite a teammate and choose which clients they can access.</p></div><button className="button primary" onClick={onInvite}><Users size={15}/> Invite teammate</button></section>}
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
