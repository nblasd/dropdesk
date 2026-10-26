import {
  ArrowLeftRight,
  BadgeCheck,
  ClipboardList,
  Copy,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  Plus,
  Settings2,
  ShoppingBag,
  UserPlus,
  Users,
} from "lucide-react";
import type { BuiltInTable, Client, Sheet, UserRole } from "@/lib/types";

type SidebarProps = {
  userEmail: string;
  userRole: UserRole;
  sheet: Sheet;
  workspaceScope: boolean;
  activeId: string;
  current?: Client;
  visibleClients: Client[];
  sharedTableAccess: boolean;
  navOpen: boolean;
  menuOpen: boolean;
  userPublicId: string;
  onSelectOverview: () => void;
  onSelectBuiltIn: (name: BuiltInTable) => void;
  onSelectShared: () => void;
  onOpenInvite: () => void;
  onSelectSettings: () => void;
  onAddClient: () => void;
  onSelectClient: (id: string) => void;
  onToggleMenu: () => void;
  onCopyPublicId: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  onCloseNav: () => void;
};

const builtInTables: BuiltInTable[] = ["Product hunting", "Listings", "Orders"];

export function Sidebar({
  userEmail,
  userRole,
  sheet,
  workspaceScope,
  activeId,
  current,
  visibleClients,
  sharedTableAccess,
  navOpen,
  menuOpen,
  userPublicId,
  onSelectOverview,
  onSelectBuiltIn,
  onSelectShared,
  onOpenInvite,
  onSelectSettings,
  onAddClient,
  onSelectClient,
  onToggleMenu,
  onCopyPublicId,
  onSignOut,
  onSignIn,
  onCloseNav,
}: SidebarProps) {
  return (
    <aside
      className={`sidebar ${navOpen ? "nav-open" : ""}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".nav-link,.client-link,.new-client,.settings-link")) onCloseNav();
      }}
    >
      <div className="brand">
        <span className="brand-mark">
          <ArrowLeftRight size={19} strokeWidth={2.4} />
        </span>
        <span>
          dropdesk<span className="brand-dot">.</span>
        </span>
      </div>

      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-switch">
        <span className="workspace-avatar">{userEmail ? userEmail.slice(0, 1).toUpperCase() : "G"}</span>
        <span className="workspace-text">
          <b>{userEmail ? `${userEmail.split("@")[0]}’s workspace` : "Guest workspace"}</b>
          <small>{userEmail ? "Your workspace" : "Guest preview"}</small>
        </span>
      </div>

      <div className="nav-group">
        <div className="nav-caption">MENU</div>
        <button className={`nav-link ${sheet === "Overview" ? "active" : ""}`} onClick={onSelectOverview}>
          <LayoutDashboard size={17} />
          Overview
        </button>

        {!workspaceScope && (
          <div className="workspace-table-menu">
            {builtInTables.map((name) => (
              <button
                key={name}
                className={`nav-link ${sheet === name ? "active" : ""}`}
                disabled={!current}
                onClick={() => {
                  if (!current) return;
                  onSelectBuiltIn(name);
                }}
              >
                {name === "Product hunting" ? <Package size={17} /> : name === "Listings" ? <ClipboardList size={17} /> : <ShoppingBag size={17} />}
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}

        {sharedTableAccess && (
          <button
            className={`nav-link ${workspaceScope ? "active" : ""}`}
            title="Product research that is not tied to a client"
            onClick={onSelectShared}
          >
            <Package size={17} />
            Product hunting <span className="nav-shared-tag">shared</span>
          </button>
        )}

        {userRole === "owner" && (
          <button className="nav-link invite-nav" onClick={onOpenInvite}>
            <UserPlus size={17} />
            Invite teammate
          </button>
        )}

        {userRole === "owner" && (
          <button className={`nav-link ${sheet === "Settings" ? "active" : ""}`} onClick={onSelectSettings}>
            <Users size={17} />
            Team &amp; access
          </button>
        )}

        <div className="nav-caption clients-caption">
          <span>YOUR CLIENTS</span>
          {userRole === "owner" && (
            <button className="tiny-add" onClick={onAddClient} aria-label="Add client">
              <Plus size={15} />
            </button>
          )}
        </div>

        <div className="client-list">
          {visibleClients.map((client) => (
            <div className="client-nav-group" key={client.id}>
              <button className={`client-link ${activeId === client.id ? "selected" : ""}`} onClick={() => onSelectClient(client.id)}>
                <span className="client-avatar" style={{ background: client.color }}>
                  {client.initials}
                </span>
                <span className="client-link-name">{client.name}</span>
              </button>
            </div>
          ))}
        </div>

        {userRole === "owner" && (
          <button className="new-client" onClick={onAddClient}>
            <Plus size={15} /> Add a client
          </button>
        )}
      </div>

      <div className="sidebar-bottom">
        <button className={`nav-link settings-link ${sheet === "Settings" ? "active" : ""}`} onClick={onSelectSettings}>
          <Settings2 size={17} />
          Settings
        </button>

        <div className="profile-wrap">
          <button className="profile" onClick={onToggleMenu}>
            <span className="profile-avatar">{userEmail ? userEmail.slice(0, 2).toUpperCase() : "G"}</span>
            <span className="profile-copy">
              <b>{userEmail ? userEmail.split("@")[0] : "Guest preview"}</b>
              <small>{userEmail || "Sign in to save your workspace"}</small>
            </span>
            <MoreHorizontal size={17} />
          </button>

          {menuOpen && (
            <div className="profile-menu">
              {userEmail ? (
                <>
                  <div className="profile-public-id">
                    <small>YOUR DROPDESK ID</small>
                    <b>{userPublicId || "Unavailable"}</b>
                  </div>
                  <button onClick={onCopyPublicId}>
                    <Copy size={15} /> Copy Dropdesk ID
                  </button>
                  <button onClick={onSignOut}>
                    <LogOut size={15} /> Sign out
                  </button>
                </>
              ) : (
                <button onClick={onSignIn}>
                  <BadgeCheck size={15} /> Sign in / create account
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
