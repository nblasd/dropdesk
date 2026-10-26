import { Users } from "lucide-react";
import type { Client, WorkspaceMember } from "@/lib/types";

export function TeamPanel({
  clients,
  members,
  memberError,
  memberWarning,
  membersLoading,
  onInvite,
  onRevoke,
  onToggleShared,
}: {
  clients: Client[];
  members: WorkspaceMember[];
  memberError: string;
  memberWarning: string;
  membersLoading: boolean;
  onInvite: () => void;
  onRevoke: (member: WorkspaceMember) => void;
  onToggleShared: (member: WorkspaceMember) => void;
}) {
  return (
    <section className="panel team-panel">
      <div className="team-heading">
        <div>
          <h3>Workspace members</h3>
          <p>Invite a teammate and choose which clients they can access. Remove a member to revoke all access.</p>
        </div>
        <button className="button primary" onClick={onInvite}>
          <Users size={15} /> Invite teammate
        </button>
      </div>

      <div className="team-member-list">
        {members.map((member) => (
          <div key={member.user_id} className="team-member-row">
            <div className="team-member-copy">
              <b>{member.email || member.user_id}</b>
              <small>
                {member.role}
                {member.client_ids.length
                  ? ` · ${member.client_ids.map((id) => clients.find((client) => client.id === id)?.name ?? id).join(", ")}`
                  : " · no selected clients"}
              </small>
            </div>
            {member.role !== "owner" && (
              <>
                <button
                  className={`button secondary team-shared ${member.shared_table_access === false ? "off" : "on"}`}
                  title="Access to the shared Product hunting table"
                  onClick={() => onToggleShared(member)}
                >
                  {member.shared_table_access === false ? "Shared table: off" : "Shared table: on"}
                </button>
                <button className="button danger team-revoke" onClick={() => onRevoke(member)}>
                  Remove access
                </button>
              </>
            )}
          </div>
        ))}
        {!members.length && (
          <p className="team-empty">
            {membersLoading
              ? "Loading workspace members…"
              : memberError
                ? `Could not load workspace members: ${memberError}`
                : "No workspace members were returned."}
          </p>
        )}
        {memberWarning && <p className="team-empty">{memberWarning}</p>}
      </div>
    </section>
  );
}
