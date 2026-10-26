"use client";

import { useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { THEMES } from "@/lib/constants";
import type { Theme } from "@/lib/types";

export function ThemePicker({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const [open, setOpen] = useState(false);
  const current = THEMES.find((option) => option.id === theme) ?? THEMES[0];

  return (
    <div className="theme-picker">
      <button
        type="button"
        className="theme-picker-trigger"
        aria-label={`Change theme. Current theme: ${current.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Palette size={16} />
        <span>{current.name}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="theme-picker-menu" role="menu" aria-label="Choose a theme">
          <div className="theme-picker-heading">
            <b>Appearance</b>
            <small>Choose your workspace mood</small>
          </div>
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.id}
              data-theme-id={option.id}
              className={`theme-option ${theme === option.id ? "active" : ""}`}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span className="theme-option-colors" aria-hidden="true">
                {option.colors.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
              <span className="theme-option-copy">
                <b>{option.name}</b>
                <small>{option.description}</small>
              </span>
              {theme === option.id && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
