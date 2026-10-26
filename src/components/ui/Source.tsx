export function Source({ source }: { source: string }) {
  const cls = source.toLowerCase();
  return (
    <span className="source-tag">
      <span className={`source-mark ${cls}`}>{source === "Amazon" ? "a" : source === "Alibaba" ? "阿" : "↗"}</span>
      {source}
    </span>
  );
}
