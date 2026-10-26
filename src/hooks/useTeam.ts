"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { errorText } from "@/lib/errors";
import type { UserRole, WorkspaceLabel, WorkspaceMember } from "@/lib/types";

type Membership = { workspace_id: string; role: UserRole; shared_table_access?: boolean };

type Options = {
  supabase: SupabaseClient | null;
  userId: string | null;
  toast: (message: string) => void;
};

export function useTeam({ supabase, userId, toast }: Options) {
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceMembersError, setWorkspaceMembersError] = useState("");
  const [workspaceMembersWarning, setWorkspaceMembersWarning] = useState("");
  const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState(false);
  const [userWorkspaceId, setUserWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("viewer");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [sharedRowsReady, setSharedRowsReady] = useState(true);
  const [memberLabels, setMemberLabels] = useState<Record<string, WorkspaceLabel>>({});
  const [labelsReady, setLabelsReady] = useState(true);

  // user_profiles is readable only by its owner, so teammate display names for
  // the shared table come from a guarded workspace RPC.
  useEffect(() => {
    if (!supabase || !userId || !selectedWorkspaceId) {
      setMemberLabels({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("list_workspace_labels", { p_workspace_id: selectedWorkspaceId });
        if (cancelled) return;
        if (error) {
          if (error.code === "PGRST202" || error.code === "42883" || error.code === "PGRST204") setLabelsReady(false);
          console.warn("[Dropdesk][labels.load] failed", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          return;
        }
        const next: Record<string, WorkspaceLabel> = {};
        (data ?? []).forEach((label: any) => {
          if (label?.user_id) next[label.user_id] = { display_name: label.display_name || "Team member", public_id: label.public_id || "" };
        });
        setMemberLabels(next);
        setLabelsReady(true);
      } catch (error) {
        if (!cancelled)
          console.warn("[Dropdesk][labels.load] failed", { message: error instanceof Error ? error.message : String(error) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, selectedWorkspaceId]);

  const refreshWorkspaceMembers = useCallback(async (sb: SupabaseClient, workspaceId: string) => {
    setWorkspaceMembersLoading(true);
    setWorkspaceMembersError("");
    setWorkspaceMembersWarning("");
    try {
      const { data, error } = await sb.rpc("list_workspace_members", { p_workspace_id: workspaceId });
      if (!error && Array.isArray(data) && data.length) {
        setWorkspaceMembers(data as WorkspaceMember[]);
        return;
      }
      // Keep the owner panel usable if an older deployed RPC returns no rows.
      const { data: rows, error: membersError } = await sb
        .from("workspace_members")
        .select("user_id,role,created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at");
      if (!membersError && rows?.length) {
        setWorkspaceMembers(
          rows.map((member: any) => ({
            user_id: member.user_id,
            email: "",
            role: member.role,
            client_ids: [],
            joined_at: member.created_at,
          })) as WorkspaceMember[],
        );
        setWorkspaceMembersWarning(
          error ? `Limited member details loaded (RPC error ${error.code ?? "unknown"}).` : "The member details RPC returned no rows; showing basic memberships.",
        );
        return;
      }
      setWorkspaceMembers([]);
      setWorkspaceMembersError(membersError?.message ?? error?.message ?? "No members were returned for this workspace.");
    } catch (error) {
      setWorkspaceMembers([]);
      setWorkspaceMembersError(error instanceof Error ? error.message : "Could not load workspace members.");
    } finally {
      setWorkspaceMembersLoading(false);
    }
  }, []);

  const toggleSharedAccess = async (member: WorkspaceMember) => {
    const workspaceId = selectedWorkspaceId ?? userWorkspaceId;
    if (!supabase || !workspaceId) return toast("Could not identify the workspace");
    if (userRole !== "owner") return toast("Only a workspace owner can change shared table access");
    const next = member.shared_table_access === false;
    try {
      const { error } = await supabase.rpc("set_shared_table_access", {
        p_workspace_id: workspaceId,
        p_user_id: member.user_id,
        p_enabled: next,
      });
      if (error) throw error;
      setWorkspaceMembers((previous) => previous.map((existing) => (existing.user_id === member.user_id ? { ...existing, shared_table_access: next } : existing)));
      toast(next ? "Shared table access granted" : "Shared table access removed");
    } catch (error) {
      console.error("[Dropdesk][shared.access] failed", {
        code: (error as { code?: string })?.code,
        message: (error as { message?: string })?.message,
      });
      toast(errorText(error, "Could not change shared table access"));
    }
  };

  const revokeMember = async (member: WorkspaceMember) => {
    const workspaceId = selectedWorkspaceId ?? userWorkspaceId;
    if (!supabase || !workspaceId) return toast("Could not identify the workspace");
    if (member.role === "owner") return toast("The workspace owner cannot be removed");
    if (!window.confirm(`Remove ${member.email || member.user_id} from this workspace and revoke all client access?`)) return;
    try {
      const { error } = await supabase.rpc("revoke_workspace_member", { p_workspace_id: workspaceId, p_user_id: member.user_id });
      if (error) throw error;
      setWorkspaceMembers((previous) => previous.filter((existing) => existing.user_id !== member.user_id));
      toast("Workspace access removed");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove workspace access");
    }
  };

  const reset = () => {
    setWorkspaceMembers([]);
    setMemberships([]);
    setUserWorkspaceId(null);
    setSelectedWorkspaceId(null);
    setUserRole("viewer");
    setMemberLabels({});
    setLabelsReady(true);
    setSharedRowsReady(true);
  };

  return {
    workspaceMembers,
    setWorkspaceMembers,
    workspaceMembersError,
    setWorkspaceMembersError,
    workspaceMembersWarning,
    setWorkspaceMembersWarning,
    workspaceMembersLoading,
    userWorkspaceId,
    setUserWorkspaceId,
    userRole,
    setUserRole,
    memberships,
    setMemberships,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    sharedRowsReady,
    setSharedRowsReady,
    memberLabels,
    labelsReady,
    refreshWorkspaceMembers,
    toggleSharedAccess,
    revokeMember,
    reset,
  };
}

export type TeamApi = ReturnType<typeof useTeam>;
