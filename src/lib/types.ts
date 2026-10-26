export type Client = {
  id: string;
  name: string;
  initials: string;
  color: string;
  store: string;
  workspace_id?: string;
  user_id?: string;
  visibility?: "workspace" | "selected" | "private";
};

export type Product = {
  id: string;
  title: string;
  source: string;
  sourceUrl?: string;
  cost: number;
  price: number;
  profit: number;
  margin: number;
  status: string;
  date: string;
};

export type Listing = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  date: string;
};

export type Order = {
  id: string;
  sourceId: string;
  source: string;
  item: string;
  quantity: number;
  tracking: string;
  sale: number;
  fee: number;
  adFees: number;
  postage: number;
  earnings: number;
  cost: number;
  profit: number;
  discount: number;
  returnFee: number;
  returnTracking: string;
  ebayReturnFee: number;
  status: string;
  date: string;
};

export type Sheet = "Overview" | string;
export type BuiltInTable = "Product hunting" | "Listings" | "Orders";

export type CustomTable = {
  id: string;
  name: string;
  columns: string[];
  rows: Record<string, any>[];
};

export type WorkspaceMember = {
  user_id: string;
  email: string;
  role: "owner" | "manager" | "va" | "viewer";
  client_ids: string[];
  shared_table_access?: boolean;
  joined_at: string;
};

export type WorkspaceLabel = { display_name: string; public_id: string };

export type InviteRecipient = {
  user_id: string;
  public_id: string;
  display_name: string;
};

export type IncomingInvitation = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  inviter_name: string;
  role: "manager" | "va" | "viewer";
  client_ids: string[];
  shared_table?: boolean;
  created_at: string;
  expires_at: string;
};

export type WorkspaceData = Record<string, Record<string, any[]>>;
export type Theme = "midnight" | "ocean" | "ember" | "orchid" | "daylight";

export type ThemeDefinition = {
  id: Theme;
  name: string;
  description: string;
  tone: "dark" | "light";
  colors: [string, string, string];
};

export type Attribution = {
  name: string;
  initials: string;
  isYou: boolean;
  title: string;
};

export type Modal =
  | "client"
  | "row"
  | "auth"
  | "import"
  | "product"
  | "listing"
  | "order"
  | "edit"
  | "clientSettings"
  | "deleteClient"
  | "invite"
  | null;

export type UserRole = "owner" | "manager" | "va" | "viewer";
