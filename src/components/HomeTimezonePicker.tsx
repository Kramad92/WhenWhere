"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { DateTime } from "luxon";
import { cn, formatOffset } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (tz: string) => void;
};

function getAllTimezones(): string[] {
  try {
    // Available in Chrome 99+, FF 94+, Safari 15.4+
    return (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? fallbackTzList;
  } catch {
    return fallbackTzList;
  }
}

const fallbackTzList = [
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota",
  "America/Chicago", "America/Denver", "America/Lima", "America/Los_Angeles",
  "America/Mexico_City", "America/New_York", "America/Santiago", "America/Sao_Paulo",
  "America/Toronto", "America/Vancouver",
  "Asia/Bangkok", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Jakarta", "Asia/Jerusalem",
  "Asia/Karachi", "Asia/Kolkata", "Asia/Manila", "Asia/Riyadh", "Asia/Seoul",
  "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo",
  "Atlantic/Reykjavik",
  "Australia/Melbourne", "Australia/Sydney",
  "Europe/Amsterdam", "Europe/Athens", "Europe/Berlin", "Europe/Copenhagen",
  "Europe/Dublin", "Europe/Helsinki", "Europe/Istanbul", "Europe/London",
  "Europe/Madrid", "Europe/Moscow", "Europe/Oslo", "Europe/Paris",
  "Europe/Rome", "Europe/Sarajevo", "Europe/Stockholm",
  "Pacific/Auckland", "Pacific/Honolulu", "UTC",
];

export function HomeTimezonePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const allTzs = useMemo(() => getAllTimezones(), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allTzs;
    return allTzs.filter((tz) => tz.toLowerCase().includes(q));
  }, [allTzs, query]);

  const currentOffset = useMemo(() => {
    try {
      return formatOffset(DateTime.now().setZone(value).offset);
    } catch {
      return "";
    }
  }, [value]);

  // Short display label
  const displayLabel = value.split("/").pop()?.replace(/_/g, " ") ?? value;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSelect(tz: string) {
    onChange(tz);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
          "dark:border-white/10 border-slate-200",
          "dark:bg-white/5 bg-white",
          "dark:text-slate-200 text-slate-700",
          "dark:hover:bg-white/8 hover:bg-slate-50"
        )}
        aria-label="Change home timezone"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span className="max-w-28 truncate">{displayLabel}</span>
        <span className="text-slate-400 text-xs shrink-0">{currentOffset}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-50 w-72 rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b dark:border-white/10 border-slate-100">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search timezones... (e.g. Tokyo, UTC, America)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none dark:text-white text-slate-900 placeholder:text-slate-400 px-1 py-0.5"
              aria-label="Search timezones"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto" role="listbox" aria-label="Timezone options">
            {filtered.slice(0, 100).map((tz) => {
              let offsetStr = "";
              try {
                offsetStr = formatOffset(DateTime.now().setZone(tz).offset);
              } catch {
                // skip
              }
              return (
                <li key={tz} role="option" aria-selected={tz === value}>
                  <button
                    onClick={() => handleSelect(tz)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left",
                      "dark:hover:bg-white/5 hover:bg-slate-50",
                      tz === value
                        ? "dark:text-sky-400 text-sky-600 dark:bg-sky-400/5 bg-sky-50"
                        : "dark:text-slate-200 text-slate-700"
                    )}
                  >
                    <span className="truncate">{tz}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{offsetStr}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-center text-slate-500">No timezones found</li>
            )}
            {filtered.length > 100 && (
              <li className="px-3 py-2 text-xs text-center text-slate-500">
                {filtered.length - 100} more — type to filter
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
