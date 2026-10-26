import type { Sheet, ThemeDefinition, WorkspaceData } from "./types";

export const THEMES: ThemeDefinition[] = [
  { id: "midnight", name: "Midnight", description: "Deep evergreen", tone: "dark", colors: ["#111813", "#26372b", "#a8d1ae"] },
  { id: "ocean", name: "Ocean", description: "Cool marine blue", tone: "dark", colors: ["#0b1724", "#18344b", "#9ed3f1"] },
  { id: "ember", name: "Ember", description: "Warm charcoal", tone: "dark", colors: ["#1b1412", "#412a20", "#f0ae86"] },
  { id: "orchid", name: "Orchid", description: "Soft violet", tone: "dark", colors: ["#171320", "#382747", "#e3b9f2"] },
  { id: "daylight", name: "Daylight", description: "Crisp and bright", tone: "light", colors: ["#fafbf9", "#e9f2ec", "#315e49"] },
];

export const THEME_STORAGE_KEY = "dropdesk-theme";

export const emptyClientData = (): WorkspaceData[string] => ({
  "Product hunting": [],
  Listings: [],
  Orders: [],
});

export const isLegacyDemoClient = (id: string) => /^c[123]$/.test(id) || /-c[123]$/.test(id);

export const tabs: Sheet[] = ["Overview", "Product hunting", "Listings", "Orders"];

// Sentinel "client" id that holds rows belonging to the workspace itself (no client).
export const WORKSPACE_SCOPE_ID = "__workspace__";
