export function parseCsv(input: string): { columns: string[]; rows: Record<string, string>[] } {
  const text = input.replace(/^\uFEFF/, "");
  const grid: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      grid.push(row);
      row = [];
      field = "";
    } else field += ch;
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    grid.push(row);
  }

  const header = grid.shift()?.map((value, index) => value.trim() || `Column ${index + 1}`) ?? [];
  const used = new Map<string, number>();
  const columns = header.map((value) => {
    const count = (used.get(value) ?? 0) + 1;
    used.set(value, count);
    return count === 1 ? value : `${value} (${count})`;
  });

  const rows = grid
    .filter((values) => values.some((value) => value.trim() !== ""))
    .map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""])));

  return { columns, rows };
}
