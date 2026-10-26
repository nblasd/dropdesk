import type { IncomingInvitation } from "@/lib/types";

export function NotificationMenu({
  invitations,
  actionId,
  onRefresh,
  onRespond,
}: {
  invitations: IncomingInvitation[];
  actionId: string | null;
  onRefresh: () => void;
  onRespond: (invitation: IncomingInvitation, action: "accept" | "decline") => void;
}) {
  return (
    <div className="notifications-menu">
      <div className="notifications-heading">
        <div>
          <b>Notifications</b>
          <small>
            {invitations.length
              ? `${invitations.length} pending invitation${invitations.length === 1 ? "" : "s"}`
              : "You're all caught up"}
          </small>
        </div>
        <button onClick={onRefresh} aria-label="Refresh notifications">
          Refresh
        </button>
      </div>
      {invitations.length ? (
        invitations.map((invitation) => (
          <article className="invitation-notification" key={invitation.id}>
            <b>{invitation.inviter_name} invited you</b>
            <span>
              {invitation.workspace_name} · {invitation.role}
            </span>
            <small>
              {invitation.client_ids.length
                ? `${invitation.client_ids.length} selected client${invitation.client_ids.length === 1 ? "" : "s"}`
                : "No selected clients"}
              {invitation.shared_table ? " · shared table" : ""}
            </small>
            <div>
              <button
                className="button secondary"
                disabled={actionId === invitation.id}
                onClick={() => onRespond(invitation, "decline")}
              >
                Decline
              </button>
              <button
                className="button primary"
                disabled={actionId === invitation.id}
                onClick={() => onRespond(invitation, "accept")}
              >
                {actionId === invitation.id ? "Working…" : "Accept"}
              </button>
            </div>
          </article>
        ))
      ) : (
        <p className="notifications-empty">Workspace invitations will appear here.</p>
      )}
    </div>
  );
}
