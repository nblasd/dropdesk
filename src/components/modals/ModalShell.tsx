"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Treat every overlay as a modal dialog: lock the page, support Escape, keep
  // keyboard focus inside, and return focus to the trigger after closing.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = "hidden";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", dialog.querySelector("h2")?.textContent?.trim() || "Dropdesk dialog");

    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]")).filter(
        (element) => element.offsetParent !== null,
      );

    const focusTimer = window.requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) (focusable()[0] ?? dialog).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" ref={dialogRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}
