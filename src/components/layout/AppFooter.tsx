export function AppFooter({ onHelp, onShortcuts }: { onHelp: () => void; onShortcuts: () => void }) {
  return (
    <footer className="app-footer">
      <span>Made for the moving parts.</span>
      <span>
        <a onClick={onHelp}>Help center</a>
        <span className="footer-sep">·</span>
        <a onClick={onShortcuts}>Keyboard shortcuts</a>
        <span className="footer-sep">·</span>v1.0.0
      </span>
    </footer>
  );
}
