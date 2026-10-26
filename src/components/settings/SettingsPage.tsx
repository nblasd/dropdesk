import type { Client, CustomTable, WorkspaceData, WorkspaceMember } from "@/lib/types";
import { ClientsSettingsPanel } from "./ClientsSettingsPanel";
import { DropdeskIdPanel } from "./DropdeskIdPanel";
import { TeamPanel } from "./TeamPanel";

type SettingsPageProps = {
  clients: Client[];
  data: WorkspaceData;
  customTables: Record<string, CustomTable[]>;
  members: WorkspaceMember[];
  memberError: string;
  memberWarning: string;
  membersLoading: boolean;
  isOwner: boolean;
  publicId: string;
  onCopyPublicId: () => void;
  onInvite: () => void;
  onRevoke: (member: WorkspaceMember) => void;
  onToggleShared: (member: WorkspaceMember) => void;
  onOpen: (id: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onAdd: () => void;
};

export function SettingsPage({
  clients,
  data,
  customTables,
  members,
  memberError,
  memberWarning,
  membersLoading,
  isOwner,
  publicId,
  onCopyPublicId,
  onInvite,
  onRevoke,
  onToggleShared,
  onOpen,
  onEdit,
  onDelete,
  onAdd,
}: SettingsPageProps) {
  return (
    <section className="settings-page">
      <DropdeskIdPanel publicId={publicId} onCopy={onCopyPublicId} />

      {isOwner && (
        <TeamPanel
          clients={clients}
          members={members}
          memberError={memberError}
          memberWarning={memberWarning}
          membersLoading={membersLoading}
          onInvite={onInvite}
          onRevoke={onRevoke}
          onToggleShared={onToggleShared}
        />
      )}

      <div className="settings-intro">
        <h2>Clients</h2>
        <p>Rename a client, update their store details, or remove a client and everything stored for them.</p>
      </div>

      <ClientsSettingsPanel clients={clients} data={data} customTables={customTables} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
    </section>
  );
}
