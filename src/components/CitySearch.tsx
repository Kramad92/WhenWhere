"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, X } from "lucide-react";
import { DateTime } from "luxon";
import { CITIES, type City } from "@/data/cities";
import { cn } from "@/lib/utils";

// Parse queries like "utc+1", "gmt +1", "gmt+5:30", "utc-5", "utc 0", "gmt0"
function parseOffsetQuery(q: string): number | null {
  const m = q.match(/^(?:utc|gmt)\s*([+-])?\s*(\d{1,2})(?::(\d{2}))?$/);
  if (!m) {
    // Also match bare "utc" or "gmt" as UTC+0
    if (/^(?:utc|gmt)$/.test(q)) return 0;
    return null;
  }
  const sign = m[1] === "-" ? -1 : 1;
  const hours = parseInt(m[2], 10);
  const mins = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + mins);
}

type Props = {
  onSelect: (city: City) => void;
  onHighlight: (cities: City[]) => void;
  pinnedCities: City[];
};

export function CitySearch({ onSelect, onHighlight, pinnedCities }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    // Check if the query is a UTC/GMT offset search
    const offsetMinutes = parseOffsetQuery(q);
    if (offsetMinutes !== null) {
      const now = Date.now();
      return CITIES.filter((c) => {
        try {
          const offset = DateTime.fromMillis(now).setZone(c.tz).offset;
          return offset === offsetMinutes;
        } catch {
          return false;
        }
      }).slice(0, 12);
    }

    return CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  // Highlight matching cities on the map while typing
  useEffect(() => {
    onHighlight(results);
  }, [results, onHighlight]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    onHighlight([]);
  }, [onHighlight]);

  const handleSelect = useCallback(
    (city: City) => {
      // Only add — don't toggle off an already-pinned city
      if (!pinnedCities.some((c) => c.name === city.name)) {
        onSelect(city);
      }
      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelect, pinnedCities]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      clearSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      handleSelect(results[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 sm:flex-initial">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
          "dark:border-white/10 border-slate-200",
          "dark:bg-white/5 bg-white",
          query ? "dark:border-sky-500/30 border-sky-300" : ""
        )}
      >
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="City or UTC+1..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="bg-transparent text-sm outline-none w-full sm:w-36 dark:text-white text-slate-900 placeholder:text-slate-400"
          aria-label="Search for a city"
          aria-expanded={open && results.length > 0}
          aria-autocomplete="list"
        />
        {query && (
          <button
            onClick={() => {
              clearSearch();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute top-full mt-1.5 left-0 z-50 w-[calc(100vw-2rem)] sm:w-56 max-h-72 overflow-y-auto rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl"
          role="listbox"
        >
          {results.map((city, i) => {
            const isPinned = pinnedCities.some((c) => c.name === city.name);
            return (
              <button
                key={city.name}
                onClick={() => handleSelect(city)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left",
                  i === activeIndex
                    ? "dark:bg-white/10 bg-sky-50"
                    : "dark:hover:bg-white/5 hover:bg-slate-50",
                  isPinned
                    ? "dark:text-sky-400 text-sky-600"
                    : "dark:text-slate-200 text-slate-700"
                )}
                role="option"
                aria-selected={isPinned}
              >
                <span>{city.name}</span>
                <span className="text-xs text-slate-400">
                  {isPinned ? "pinned ✓" : "pin"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-[calc(100vw-2rem)] sm:w-56 rounded-xl border dark:border-white/10 border-slate-200 dark:bg-slate-900 bg-white shadow-xl px-3 py-4 text-sm text-center text-slate-500">
          No cities found
        </div>
      )}
    </div>
  );
}
