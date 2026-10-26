import { Bell, ChevronRight, CircleHelp, Menu, Search } from "lucide-react";
import type { Client, IncomingInvitation, Sheet, Theme } from "@/lib/types";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { NotificationMenu } from "./NotificationMenu";

type TopbarProps = {
  navOpen: boolean;
  onOpenNav: () => void;
  sheet: Sheet;
  workspaceScope: boolean;
  current?: Client;
  displaySheet: string;
  query: string;
  onQueryChange: (value: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  incomingInvitations: IncomingInvitation[];
  invitationActionId: string | null;
  onRefreshInvitations: () => void;
  onRespondInvitation: (invitation: IncomingInvitation, action: "accept" | "decline") => void;
  onHelp: () => void;
};

export function Topbar({
  navOpen,
  onOpenNav,
  sheet,
  workspaceScope,
  current,
  displaySheet,
  query,
  onQueryChange,
  theme,
  onThemeChange,
  notificationsOpen,
  onToggleNotifications,
  incomingInvitations,
  invitationActionId,
  onRefreshInvitations,
  onRespondInvitation,
  onHelp,
}: TopbarProps) {
  return (
    <header className="topbar">
      <button className="nav-toggle" aria-label="Open menu" aria-expanded={navOpen} onClick={onOpenNav}>
        <Menu size={17} />
      </button>

      <div className="breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={14} />
        <span>{sheet === "Overview" ? "Overview" : sheet === "Settings" ? "Settings" : workspaceScope ? "Shared table" : current?.name}</span>
        {sheet !== "Overview" && sheet !== "Settings" && (
          <>
            <ChevronRight size={14} />
            <b>{displaySheet}</b>
          </>
        )}
      </div>

      <div className="top-actions">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search anything..." value={query} onChange={(e) => onQueryChange(e.target.value)} />
          <kbd>⌘ K</kbd>
        </div>

        <ThemePicker theme={theme} onChange={onThemeChange} />

        <div className="notification-wrap">
          <button
            className="icon-button"
            onClick={onToggleNotifications}
            aria-label={`Notifications${incomingInvitations.length ? `, ${incomingInvitations.length} pending` : ""}`}
            aria-expanded={notificationsOpen}
          >
            <Bell size={17} />
            {incomingInvitations.length > 0 && (
              <span className="notification-count">{incomingInvitations.length > 9 ? "9+" : incomingInvitations.length}</span>
            )}
          </button>
          {notificationsOpen && (
            <NotificationMenu
              invitations={incomingInvitations}
              actionId={invitationActionId}
              onRefresh={onRefreshInvitations}
              onRespond={onRespondInvitation}
            />
          )}
        </div>

        <span className="top-divider" />
        <button className="help-button" onClick={onHelp}>
          <CircleHelp size={16} />
          Help
        </button>
      </div>
    </header>
  );
}
