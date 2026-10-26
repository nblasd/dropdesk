"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { WORKSPACE_SCOPE_ID } from "@/lib/constants";
import type { BuiltInTable } from "@/lib/types";
import { useAuth, type SessionHandler } from "@/hooks/useAuth";
import { useInvitations } from "@/hooks/useInvitations";
import { useTeam } from "@/hooks/useTeam";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useWorkspaceDialogs } from "@/hooks/useWorkspaceDialogs";

import { LandingPage } from "@/components/landing/LandingPage";
import { AppFooter } from "@/components/layout/AppFooter";
import { GuestBanner } from "@/components/layout/GuestBanner";
import { PageHeading } from "@/components/layout/PageHeading";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toast } from "@/components/layout/Toast";
import { Topbar } from "@/components/layout/Topbar";
import { OverviewPage } from "@/components/overview/OverviewPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { SheetPage } from "@/components/sheet/SheetPage";
import { AddClientModal } from "@/components/modals/AddClientModal";
import { AuthModal } from "@/components/modals/AuthModal";
import { ClientSettingsModal } from "@/components/modals/ClientSettingsModal";
import { DeleteClientModal } from "@/components/modals/DeleteClientModal";
import { ImportTableModal } from "@/components/modals/ImportTableModal";
import { InviteModal } from "@/components/modals/InviteModal";
import { ListingModal } from "@/components/modals/ListingModal";
import { ModalShell } from "@/components/modals/ModalShell";
import { OrderModal } from "@/components/modals/OrderModal";
import { ProductModal } from "@/components/modals/ProductModal";
import { RowEditModal } from "@/components/modals/RowEditModal";

export function DropdeskApp() {
  const { theme, changeTheme } = useTheme();
  const { notice, toast } = useToast();
  const dialogs = useWorkspaceDialogs();

  const sessionHandlerRef = useRef<SessionHandler | null>(null);
  const auth = useAuth({ toast, closeModal: dialogs.closeModal, sessionHandlerRef });
  const team = useTeam({ supabase: auth.supabase, userId: auth.userId, toast });
  const workspace = useWorkspaceData({ auth, team, dialogs, toast });
  sessionHandlerRef.current = (sb, userId) => workspace.loadWorkspace(sb, userId);
  const invitations = useInvitations({ auth, team, workspace, dialogs, toast });

  const [demoMode, setDemoMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("demo") === "1";
    if (!requested) return;
    setDemoMode(true);
    team.setUserRole("owner");
  }, []);

  useEffect(() => {
    if (workspace.current && workspace.current.id !== workspace.active) workspace.setActive(workspace.current.id);
  }, [workspace.current?.id, workspace.active]);

  useEffect(() => {
    const workspaceId = workspace.current?.workspace_id ?? team.selectedWorkspaceId;
    const membership = team.memberships.find((m) => m.workspace_id === workspaceId);
    if (membership) {
      team.setUserWorkspaceId(membership.workspace_id);
      team.setUserRole(membership.role);
      if (workspaceId !== team.selectedWorkspaceId) team.setSelectedWorkspaceId(workspaceId);
    }
  }, [workspace.current?.workspace_id, team.selectedWorkspaceId, team.memberships]);

  useEffect(() => {
    if (workspace.sheet === "Settings" && team.userRole === "owner" && auth.supabase && team.selectedWorkspaceId) {
      void team.refreshWorkspaceMembers(auth.supabase, team.selectedWorkspaceId);
    }
  }, [workspace.sheet, team.userRole, auth.supabase, team.selectedWorkspaceId, team.refreshWorkspaceMembers]);

  const signOut = async () => {
    await auth.signOut();
    setDemoMode(false);
    invitations.reset();
    workspace.reset();
    team.reset();
    setMenuOpen(false);
    setNotificationsOpen(false);
    toast("Signed out of preview");
  };

  const openClient = (id: string) => {
    workspace.setActive(id);
    workspace.setSheet("Overview");
    workspace.setQuery("");
  };

  if (!auth.authReady)
    return (
      <main className="landing-loading">
        <span className="brand-mark">
          <ArrowLeftRight size={19} strokeWidth={2.4} />
        </span>
        <b>
          dropdesk<span className="brand-dot">.</span>
        </b>
      </main>
    );

  const workspaceVisible = Boolean(auth.userEmail || demoMode);

  const rowHandlers = {
    selectedRows: workspace.selectedRows,
    allSelected: workspace.allVisibleSelected,
    rowKey: workspace.rowKey,
    onToggleSelect: workspace.toggleRowSelection,
    onSelectAll: workspace.toggleVisibleSelection,
    onEditRow: workspace.beginEditRow,
    onDeleteRow: (row: Record<string, any>) => void workspace.deleteRow(row),
    onUpdateCell: (row: Record<string, any>, key: string, value: string) => workspace.updateCell(workspace.rows.indexOf(row), key, value),
  };

  return (
    <main className={workspaceVisible ? `app-shell${demoMode ? " demo-workspace" : ""}` : "landing-shell"}>
      {!workspaceVisible ? (
        <LandingPage
          theme={theme}
          onThemeChange={changeTheme}
          onStart={() => {
            auth.setAuthMode("signup");
            dialogs.setModal("auth");
          }}
          onLogin={() => {
            auth.setAuthMode("login");
            dialogs.setModal("auth");
          }}
          onPreview={() => {
            setDemoMode(true);
            team.setUserRole("owner");
          }}
        />
      ) : (
        <>
          {navOpen && <button className="nav-scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />}
          <Sidebar
            userEmail={auth.userEmail}
            userRole={team.userRole}
            sheet={workspace.sheet}
            workspaceScope={workspace.workspaceScope}
            activeId={workspace.active}
            current={workspace.current}
            visibleClients={workspace.visibleClients}
            sharedTableAccess={workspace.sharedTableAccess}
            navOpen={navOpen}
            menuOpen={menuOpen}
            userPublicId={auth.userPublicId}
            onSelectOverview={() => workspace.setSheet("Overview")}
            onSelectBuiltIn={(name: BuiltInTable) => workspace.setSheet(name)}
            onSelectShared={() => {
              workspace.setActive(WORKSPACE_SCOPE_ID);
              workspace.setSheet("Product hunting");
              workspace.setQuery("");
            }}
            onOpenInvite={invitations.openInvite}
            onSelectSettings={() => workspace.setSheet("Settings")}
            onAddClient={dialogs.openAddClient}
            onSelectClient={openClient}
            onToggleMenu={() => setMenuOpen(!menuOpen)}
            onCopyPublicId={auth.copyPublicId}
            onSignOut={signOut}
            onSignIn={() => {
              dialogs.setModal("auth");
              setMenuOpen(false);
            }}
            onCloseNav={() => setNavOpen(false)}
          />

          <section className="main-panel">
            <Topbar
              navOpen={navOpen}
              onOpenNav={() => setNavOpen(true)}
              sheet={workspace.sheet}
              workspaceScope={workspace.workspaceScope}
              current={workspace.current}
              displaySheet={workspace.displaySheet}
              query={workspace.query}
              onQueryChange={workspace.setQuery}
              theme={theme}
              onThemeChange={changeTheme}
              notificationsOpen={notificationsOpen}
              onToggleNotifications={() => {
                const opening = !notificationsOpen;
                setNotificationsOpen(opening);
                if (opening) void invitations.refreshIncomingInvitations();
              }}
              incomingInvitations={invitations.incomingInvitations}
              invitationActionId={invitations.invitationActionId}
              onRefreshInvitations={() => void invitations.refreshIncomingInvitations()}
              onRespondInvitation={(invitation, action) => void invitations.respondToInvitation(invitation, action)}
              onHelp={() => toast("Help center coming soon")}
            />

            <div className="content" data-sheet={workspace.sheet}>
              {!auth.userEmail && <GuestBanner hasClients={workspace.clients.length > 0} onCreateAccount={() => dialogs.setModal("auth")} />}

              <PageHeading
                sheet={workspace.sheet}
                userEmail={auth.userEmail}
                clientsCount={workspace.clients.length}
                workspaceScope={workspace.workspaceScope}
                displaySheet={workspace.displaySheet}
                current={workspace.current}
                customTable={workspace.customTable}
                isOwner={team.userRole === "owner"}
                clientBusy={dialogs.clientBusy}
                onExport={workspace.exportCsv}
                onImport={dialogs.openImport}
                onAddClient={dialogs.openAddClient}
                onAddRow={workspace.addRow}
              />

              {workspace.sheet === "Overview" ? (
                <OverviewPage
                  current={workspace.current}
                  workspaceScope={workspace.workspaceScope}
                  visibleClients={workspace.visibleClients}
                  visibleData={workspace.visibleData}
                  clientsCount={workspace.clients.length}
                  activeCustomTables={workspace.activeCustomTables}
                  allOrdersCount={workspace.allOrders.length}
                  orderProfit={workspace.orderProfit}
                  listingsCount={workspace.listingsCount}
                  onOpenTable={(id) => workspace.setSheet(id)}
                  onChooseTable={(table) => workspace.setSheet(table)}
                  onImport={dialogs.openImport}
                  onAddClient={dialogs.openAddClient}
                  onOpenClient={openClient}
                  onOpenOrders={() => workspace.setSheet("Orders")}
                  onShowToast={toast}
                />
              ) : workspace.sheet === "Settings" ? (
                <SettingsPage
                  clients={workspace.visibleClients}
                  data={workspace.visibleData}
                  customTables={workspace.customTables}
                  members={team.workspaceMembers}
                  memberError={team.workspaceMembersError}
                  memberWarning={team.workspaceMembersWarning}
                  membersLoading={team.workspaceMembersLoading}
                  isOwner={team.userRole === "owner"}
                  publicId={auth.userPublicId}
                  onCopyPublicId={auth.copyPublicId}
                  onInvite={invitations.openInvite}
                  onRevoke={team.revokeMember}
                  onToggleShared={team.toggleSharedAccess}
                  onOpen={openClient}
                  onEdit={dialogs.openClientSettings}
                  onDelete={dialogs.requestDeleteClient}
                  onAdd={dialogs.openAddClient}
                />
              ) : (
                <SheetPage
                  current={workspace.current}
                  workspaceScope={workspace.workspaceScope}
                  sheet={workspace.sheet}
                  activeCustomTables={workspace.activeCustomTables}
                  customTable={workspace.customTable}
                  items={workspace.items}
                  displaySheet={workspace.displaySheet}
                  rows={workspace.rows}
                  filtered={workspace.filtered}
                  selectedRows={workspace.selectedRows}
                  allVisibleSelected={workspace.allVisibleSelected}
                  sourceFilter={workspace.sourceFilter}
                  ordersTotals={workspace.ordersTotals}
                  sharedRowsReady={team.sharedRowsReady}
                  labelsReady={team.labelsReady}
                  query={workspace.query}
                  handlers={rowHandlers}
                  attributionFor={workspace.attributionFor}
                  onSelectSheet={workspace.setSheet}
                  onImport={dialogs.openImport}
                  onOpenSettings={() => workspace.current && dialogs.openClientSettings(workspace.current)}
                  onSourceFilterChange={workspace.setSourceFilter}
                  onClearFilters={() => {
                    workspace.setQuery("");
                    workspace.setSourceFilter("All sources");
                  }}
                  onDeleteSelected={workspace.deleteSelectedRows}
                  onExport={workspace.exportCsv}
                  onAddRow={workspace.addRow}
                  onShowToast={toast}
                />
              )}

              <AppFooter
                onHelp={() => toast("Help center coming soon")}
                onShortcuts={() => toast("Shortcuts: ⌘ K to search")}
              />
            </div>
          </section>
        </>
      )}

      {notice && <Toast message={notice} />}

      {dialogs.modal && (
        <ModalShell key={dialogs.modal ?? "modal"} onClose={dialogs.closeModal}>
          {dialogs.modal === "client" ? (
            <AddClientModal name={dialogs.clientName} setName={dialogs.setClientName} busy={dialogs.clientBusy} onAdd={workspace.addClient} />
          ) : dialogs.modal === "product" ? (
            <ProductModal
              name={dialogs.productName}
              setName={dialogs.setProductName}
              sourceUrl={dialogs.productSourceUrl}
              setSourceUrl={dialogs.setProductSourceUrl}
              ebayUrl={dialogs.productEbayUrl}
              setEbayUrl={dialogs.setProductEbayUrl}
              source={dialogs.productSource}
              setSource={dialogs.setProductSource}
              cost={dialogs.supplierCost}
              setCost={dialogs.setSupplierCost}
              price={dialogs.ebayPrice}
              setPrice={dialogs.setEbayPrice}
              onAdd={workspace.addProduct}
            />
          ) : dialogs.modal === "listing" ? (
            <ListingModal
              title={dialogs.listingTitle}
              setTitle={dialogs.setListingTitle}
              sourceUrl={dialogs.listingSourceUrl}
              setSourceUrl={dialogs.setListingSourceUrl}
              listedDate={dialogs.listingListedDate}
              setListedDate={dialogs.setListingListedDate}
              onAdd={workspace.addListing}
            />
          ) : dialogs.modal === "order" ? (
            <OrderModal draft={dialogs.orderDraft} setDraft={dialogs.setOrderDraft} onAdd={workspace.addOrder} />
          ) : dialogs.modal === "edit" ? (
            <RowEditModal
              title={workspace.customTable?.name ?? workspace.sheet}
              draft={dialogs.editDraft}
              fields={Object.keys(dialogs.editDraft).filter(
                (key) =>
                  key !== "id" &&
                  key !== "__rowId" &&
                  key !== "__createdBy" &&
                  (workspace.customTable || !["profit", "margin", "earnings"].includes(key)),
              )}
              setDraft={dialogs.setEditDraft}
              onSave={workspace.saveEditedRow}
              onClose={dialogs.closeModal}
            />
          ) : dialogs.modal === "import" ? (
            <ImportTableModal
              name={dialogs.importName}
              setName={dialogs.setImportName}
              file={dialogs.importFile}
              setFile={dialogs.setImportFile}
              busy={dialogs.importBusy}
              onImport={workspace.createTableFromImport}
              onClose={dialogs.closeModal}
            />
          ) : dialogs.modal === "clientSettings" && dialogs.settingsDraft ? (
            <ClientSettingsModal
              draft={dialogs.settingsDraft}
              setDraft={dialogs.setSettingsDraft}
              onSave={workspace.saveClientSettings}
              onDelete={() => {
                const target = workspace.clients.find((c) => c.id === dialogs.settingsDraft!.id);
                if (target) dialogs.requestDeleteClient(target);
              }}
              onClose={() => {
                dialogs.closeModal();
                dialogs.setSettingsDraft(null);
              }}
            />
          ) : dialogs.modal === "deleteClient" && dialogs.deleteTarget ? (
            <DeleteClientModal
              client={dialogs.deleteTarget}
              busy={dialogs.deleteBusy}
              onConfirm={workspace.confirmDeleteClient}
              onCancel={() => {
                dialogs.closeModal();
                dialogs.setDeleteTarget(null);
              }}
            />
          ) : dialogs.modal === "invite" ? (
            <InviteModal
              publicId={invitations.invitePublicId}
              setPublicId={(value) => {
                invitations.setInvitePublicId(value);
                invitations.setInviteRecipient(null);
              }}
              recipient={invitations.inviteRecipient}
              lookupBusy={invitations.inviteLookupBusy}
              onFind={invitations.findInviteRecipient}
              role={invitations.inviteRole}
              setRole={invitations.setInviteRole}
              clients={workspace.visibleClients.filter(
                (client) => client.workspace_id === (workspace.current?.workspace_id ?? team.selectedWorkspaceId),
              )}
              selected={invitations.inviteClients}
              setSelected={invitations.setInviteClients}
              busy={invitations.inviteBusy}
              onCreate={invitations.createInvitation}
              onClose={dialogs.closeModal}
              error={invitations.inviteError}
              recipientIsMember={invitations.inviteRecipientIsMember}
              sharedTable={invitations.inviteSharedTable}
              setSharedTable={invitations.setInviteSharedTable}
            />
          ) : (
            <AuthModal
              mode={auth.authMode}
              onSwitchMode={() => auth.setAuthMode(auth.authMode === "signup" ? "login" : "signup")}
              name={auth.authName}
              setName={auth.setAuthName}
              email={auth.authEmail}
              setEmail={auth.setAuthEmail}
              password={auth.authPassword}
              setPassword={auth.setAuthPassword}
              busy={auth.authBusy}
              onSubmit={auth.submitAuth}
              onGoogle={auth.continueWithGoogle}
            />
          )}
        </ModalShell>
      )}
    </main>
  );
}
