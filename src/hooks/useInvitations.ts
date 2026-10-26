"use client";

import { useCallback, useEffect, useState } from "react";

import { errorText } from "@/lib/errors";
import type { IncomingInvitation, InviteRecipient } from "@/lib/types";
import type { AuthApi } from "@/hooks/useAuth";
import type { TeamApi } from "@/hooks/useTeam";
import type { WorkspaceDataApi } from "@/hooks/useWorkspaceData";
import type { WorkspaceDialogsApi } from "@/hooks/useWorkspaceDialogs";

type Options = {
  auth: AuthApi;
  team: TeamApi;
  workspace: WorkspaceDataApi;
  dialogs: WorkspaceDialogsApi;
  toast: (message: string) => void;
};

export function useInvitations({ auth, team, workspace, dialogs, toast }: Options) {
  const { supabase, userId } = auth;
  const { workspaceMembers, userRole, selectedWorkspaceId, userWorkspaceId } = team;
  const { current, visibleClients } = workspace;

  const [incomingInvitations, setIncomingInvitations] = useState<IncomingInvitation[]>([]);
  const [invitationActionId, setInvitationActionId] = useState<string | null>(null);
  const [invitePublicId, setInvitePublicId] = useState("");
  const [inviteRecipient, setInviteRecipient] = useState<InviteRecipient | null>(null);
  const [inviteLookupBusy, setInviteLookupBusy] = useState(false);
  const [inviteRole, setInviteRole] = useState<"manager" | "va" | "viewer">("va");
  const [inviteClients, setInviteClients] = useState<string[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSharedTable, setInviteSharedTable] = useState(true);

  const inviteRecipientIsMember = !!inviteRecipient && workspaceMembers.some((member) => member.user_id === inviteRecipient.user_id);

  const refreshIncomingInvitations = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.rpc("list_my_workspace_invitations");
    if (error) {
      console.error("[Dropdesk][notifications.load] failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return;
    }
    setIncomingInvitations((data ?? []) as IncomingInvitation[]);
  }, [supabase, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;
    void refreshIncomingInvitations();
    const timer = window.setInterval(() => void refreshIncomingInvitations(), 30000);
    return () => window.clearInterval(timer);
  }, [supabase, userId, refreshIncomingInvitations]);

  const openInvite = () => {
    setInvitePublicId("");
    setInviteRecipient(null);
    setInviteError("");
    setInviteSharedTable(true);
    setInviteRole("va");
    setInviteClients([]);
    dialogs.setModal("invite");
  };

  const findInviteRecipient = async () => {
    if (!supabase) return toast("Connect Supabase to look up a user");
    const code = invitePublicId.trim().toUpperCase();
    if (!code) return toast("Enter their Dropdesk ID");
    setInviteLookupBusy(true);
    setInviteRecipient(null);
    setInviteError("");
    try {
      const { data, error } = await supabase.rpc("lookup_user_by_public_id", { p_public_id: code });
      if (error) throw error;
      const recipient = Array.isArray(data) ? (data[0] as InviteRecipient | undefined) : undefined;
      if (!recipient) {
        setInviteError("No user was found with that Dropdesk ID");
        return;
      }
      setInviteRecipient(recipient);
    } catch (error) {
      console.error("[Dropdesk][invite.lookup] failed", {
        code: (error as { code?: string })?.code,
        message: (error as { message?: string })?.message,
        details: (error as { details?: string })?.details,
        hint: (error as { hint?: string })?.hint,
      });
      setInviteError(errorText(error, "Could not find that user"));
    } finally {
      setInviteLookupBusy(false);
    }
  };

  const createInvitation = async () => {
    const workspaceId = current?.workspace_id ?? selectedWorkspaceId ?? userWorkspaceId;
    const workspaceClientIds = new Set(visibleClients.filter((client) => client.workspace_id === workspaceId).map((client) => client.id));
    const selectedClientIds = inviteClients.filter((clientId) => workspaceClientIds.has(clientId));
    if (userRole !== "owner") {
      setInviteError("Only a workspace owner can invite teammates");
      return;
    }
    if (!supabase || !workspaceId) {
      setInviteError("Could not identify the workspace for this invitation");
      return;
    }
    if (!inviteRecipient) {
      setInviteError("Find a user by their Dropdesk ID first");
      return;
    }
    if (inviteRecipientIsMember) {
      setInviteError(`${inviteRecipient.display_name} is already a member of this workspace.`);
      return;
    }
    setInviteError("");
    setInviteBusy(true);
    const recipient = inviteRecipient;
    try {
      const send = (targetWorkspaceId: string, withShared: boolean) =>
        supabase.rpc(
          "send_workspace_invitation",
          withShared
            ? {
                p_workspace_id: targetWorkspaceId,
                p_recipient_public_id: recipient.public_id,
                p_role: inviteRole,
                p_client_ids: selectedClientIds,
                p_shared_table: inviteSharedTable,
              }
            : { p_workspace_id: targetWorkspaceId, p_recipient_public_id: recipient.public_id, p_role: inviteRole, p_client_ids: selectedClientIds },
        );
      let { error } = await send(workspaceId, true);
      // Migration 20261026 not applied yet: retry with the older 4-argument RPC.
      if (error && (error.code === "PGRST202" || error.code === "42883")) ({ error } = await send(workspaceId, false));
      // A client row can carry a stale workspace id, which makes the RPC answer
      // "not authorized" even for the real owner. Fall back to the owned workspace once.
      if (error && /not authorized/i.test(error.message) && userWorkspaceId && userWorkspaceId !== workspaceId) {
        ({ error } = await send(userWorkspaceId, true));
        if (error && (error.code === "PGRST202" || error.code === "42883")) ({ error } = await send(userWorkspaceId, false));
      }
      if (error) throw error;
      dialogs.setModal(null);
      toast(`Invitation sent to ${recipient.display_name}`);
    } catch (error) {
      console.error("[Dropdesk][invite.create] failed", {
        code: (error as { code?: string })?.code,
        message: (error as { message?: string })?.message,
        details: (error as { details?: string })?.details,
        hint: (error as { hint?: string })?.hint,
        workspaceId,
        recipientPublicId: inviteRecipient.public_id,
        role: inviteRole,
        clientIds: selectedClientIds,
      });
      setInviteError(errorText(error, "Could not send invitation"));
    } finally {
      setInviteBusy(false);
    }
  };

  const respondToInvitation = async (invitation: IncomingInvitation, action: "accept" | "decline") => {
    if (!supabase || !userId) return;
    setInvitationActionId(invitation.id);
    try {
      const { data, error } = await supabase.rpc(action === "accept" ? "accept_workspace_invitation" : "decline_workspace_invitation", {
        p_invitation_id: invitation.id,
      });
      if (error) throw error;
      setIncomingInvitations((previous) => previous.filter((item) => item.id !== invitation.id));
      if (action === "accept") {
        if (typeof data !== "string" || !(await workspace.loadWorkspace(supabase, userId, data)))
          throw new Error("You joined, but the workspace could not be loaded. Reload the page.");
        toast(`Joined ${invitation.workspace_name}`);
      } else toast("Invitation declined");
    } catch (error) {
      console.error(`[Dropdesk][invite.${action}] failed`, {
        code: (error as { code?: string })?.code,
        message: (error as { message?: string })?.message,
        details: (error as { details?: string })?.details,
        hint: (error as { hint?: string })?.hint,
        invitationId: invitation.id,
      });
      toast(errorText(error, `Could not ${action} invitation`));
    } finally {
      setInvitationActionId(null);
    }
  };

  const reset = () => {
    setIncomingInvitations([]);
  };

  return {
    incomingInvitations,
    invitationActionId,
    invitePublicId,
    setInvitePublicId,
    inviteRecipient,
    setInviteRecipient,
    inviteLookupBusy,
    inviteRole,
    setInviteRole,
    inviteClients,
    setInviteClients,
    inviteBusy,
    inviteError,
    setInviteError,
    inviteSharedTable,
    setInviteSharedTable,
    inviteRecipientIsMember,
    refreshIncomingInvitations,
    openInvite,
    findInviteRecipient,
    createInvitation,
    respondToInvitation,
    reset,
  };
}

export type InvitationsApi = ReturnType<typeof useInvitations>;
