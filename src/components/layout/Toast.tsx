export function Toast({ message }: { message: string }) {
  return (
    <div className="toast">
      <span className="toast-check">✓</span>
      {message}
    </div>
  );
}
