"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { geoEqualEarth } from "d3-geo";
import { Link, Moon, Sun, X, Trash2, Copy, Check } from "lucide-react";

import { CITIES, FEATURED_CITY_NAMES, type City } from "@/data/cities";
import { cn, formatOffset, formatDiff } from "@/lib/utils";
import { AnalogClock } from "./AnalogClock";
import { WorldMap } from "./WorldMap";
import { CitySearch } from "./CitySearch";
import { HomeTimezonePicker } from "./HomeTimezonePicker";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;
const MAP_SCALE = 185;

type TooltipState = {
  city: City;
  x: number;
  y: number;
  time: string;
} | null;

type Theme = "dark" | "light";

export function TimezoneExplorer() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [homeTz, setHomeTz] = useState("Europe/Sarajevo");
  const [pinnedCities, setPinnedCities] = useState<City[]>([]);
  const [highlightedCities, setHighlightedCities] = useState<City[]>([]);
  const [hoveredCity, setHoveredCity] = useState<City | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hiddenCities, setHiddenCities] = useState<Set<string>>(new Set());

  const hoverDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projection = useMemo(
    () => geoEqualEarth().scale(MAP_SCALE).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]),
    []
  );

  // Show only featured + pinned + search-highlighted cities on the map, minus hidden
  const visibleCities = useMemo(() => {
    const pinnedNames = new Set(pinnedCities.map((c) => c.name));
    const highlightedNames = new Set(highlightedCities.map((c) => c.name));
    return CITIES.filter(
      (c) =>
        highlightedNames.has(c.name) ||
        pinnedNames.has(c.name) ||
        (!hiddenCities.has(c.name) && FEATURED_CITY_NAMES.has(c.name))
    );
  }, [pinnedCities, highlightedCities, hiddenCities]);

  // Mount: tick, read URL + localStorage
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);

    // Theme from localStorage
    const savedTheme = localStorage.getItem("tz-theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }

    // URL params
    const params = new URLSearchParams(window.location.search);
    const compareParam = params.get("compare");
    const homeParam = params.get("home");

    if (compareParam) {
      const names = compareParam.split(",").map((n) => n.trim());
      const found = names
        .map((name) => CITIES.find((c) => c.name === name))
        .filter((c): c is City => Boolean(c));
      if (found.length) setPinnedCities(found.slice(0, 4));
    }

    if (homeParam) {
      setHomeTz(homeParam);
    } else {
      // Default to browser timezone
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTz) setHomeTz(browserTz);
      } catch {
        // fall through to default
      }
    }

    return () => clearInterval(id);
  }, []);

  // Sync theme to DOM + localStorage
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("tz-theme", theme);
  }, [theme, mounted]);

  // Sync state to URL
  useEffect(() => {
    if (!mounted) return;
    const parts: string[] = [];
    if (pinnedCities.length > 0) {
      parts.push(`compare=${pinnedCities.map((c) => c.name.replace(/ /g, "%20")).join(",")}`);
    }
    parts.push(`home=${homeTz}`);
    window.history.replaceState(null, "", `${window.location.pathname}?${parts.join("&")}`);
  }, [pinnedCities, homeTz, mounted]);

  // Clear hover/tooltip with a short delay so the user can move the mouse to the tooltip
  const scheduleDismiss = useCallback(() => {
    if (hoverDismissTimer.current) clearTimeout(hoverDismissTimer.current);
    hoverDismissTimer.current = setTimeout(() => {
      setHoveredCity(null);
      setTooltip(null);
    }, 150);
  }, []);

  const cancelDismiss = useCallback(() => {
    if (hoverDismissTimer.current) {
      clearTimeout(hoverDismissTimer.current);
      hoverDismissTimer.current = null;
    }
  }, []);

  // City hover handler — computes tooltip position in viewport (fixed) coordinates
  const handleCityHover = useCallback(
    (city: City | null, svgRect: DOMRect | null) => {
      if (!city || !svgRect || now === null) {
        // Leaving a dot — schedule delayed dismiss
        scheduleDismiss();
        return;
      }
      // Entering a dot — cancel any pending dismiss and show immediately
      cancelDismiss();
      setHoveredCity(city);
      const coords = projection([city.lon, city.lat]);
      if (!coords) return;
      const [x, y] = coords;
      const viewportX = svgRect.left + (x / MAP_WIDTH) * svgRect.width;
      const viewportY = svgRect.top + (y / MAP_HEIGHT) * svgRect.height;
      const time = DateTime.fromMillis(now).setZone(city.tz).toFormat("HH:mm");
      setTooltip({ city, x: viewportX, y: viewportY, time });
    },
    [projection, now, scheduleDismiss, cancelDismiss]
  );

  const handleCityPin = useCallback((city: City) => {
    setPinnedCities((prev) => {
      const exists = prev.findIndex((c) => c.name === city.name);
      if (exists >= 0) return prev.filter((_, i) => i !== exists);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, city];
    });
    // Unhide the city if it was previously removed from the map
    setHiddenCities((prev) => {
      if (!prev.has(city.name)) return prev;
      const next = new Set(prev);
      next.delete(city.name);
      return next;
    });
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select a temp input
      const el = document.createElement("input");
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // Derived time for the hovered city panel
  const hoveredDerived = useMemo(() => {
    if (!now || !hoveredCity) return null;
    try {
      const zoneTime = DateTime.fromMillis(now).setZone(hoveredCity.tz);
      const homeTime = DateTime.fromMillis(now).setZone(homeTz);
      const diffMinutes = zoneTime.offset - homeTime.offset;
      return {
        zoneTime,
        homeTime,
        utcOffset: formatOffset(zoneTime.offset),
        homeOffset: formatOffset(homeTime.offset),
        diff: formatDiff(diffMinutes),
        abbrev: zoneTime.offsetNameShort ?? "",
        displayTime: zoneTime.toFormat("HH:mm:ss"),
        displayDate: zoneTime.toFormat("dd LLL yyyy"),
        homeTzAbbrev: homeTime.offsetNameShort ?? "",
        homeDisplayTime: homeTime.toFormat("HH:mm:ss"),
      };
    } catch {
      return null;
    }
  }, [hoveredCity, now, homeTz]);

  // Derived times for all pinned cities
  const pinnedDerived = useMemo(() => {
    if (!now) return [];
    return pinnedCities.flatMap((city) => {
      try {
        const zoneTime = DateTime.fromMillis(now).setZone(city.tz);
        const homeTime = DateTime.fromMillis(now).setZone(homeTz);
        const diffMinutes = zoneTime.offset - homeTime.offset;
        const h = zoneTime.hour;
        const isDaytime = h >= 6 && h < 20;
        return [
          {
            city,
            zoneTime,
            utcOffset: formatOffset(zoneTime.offset),
            diff: formatDiff(diffMinutes),
            diffMinutes,
            abbrev: zoneTime.offsetNameShort ?? "",
            displayTime: zoneTime.toFormat("HH:mm:ss"),
            displayDate: zoneTime.toFormat("dd LLL yyyy"),
            isDaytime,
          },
        ];
      } catch {
        return [];
      }
    });
  }, [pinnedCities, now, homeTz]);

  // Home time
  const homeDerived = useMemo(() => {
    if (!now) return null;
    try {
      const homeTime = DateTime.fromMillis(now).setZone(homeTz);
      return {
        displayTime: homeTime.toFormat("HH:mm:ss"),
        displayDate: homeTime.toFormat("dd LLL yyyy"),
        abbrev: homeTime.offsetNameShort ?? "",
        offset: formatOffset(homeTime.offset),
        hour: homeTime.hour,
        minute: homeTime.minute,
        second: homeTime.second,
      };
    } catch {
      return null;
    }
  }, [now, homeTz]);

  const homeTzLabel = homeTz.split("/").pop()?.replace(/_/g, " ") ?? homeTz;

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-100 dark:text-white text-slate-900 transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <header className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight dark:text-white text-slate-900">
                WhenWhere
              </h1>
              <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">
                <span className="hidden sm:inline">Hover</span><span className="sm:hidden">Tap</span> to preview · Click to pin · Compare up to 4 cities
              </p>
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              {/* Quick share — mobile only */}
              <button
                onClick={handleShare}
                className={cn(
                  "flex items-center justify-center rounded-xl border p-2 transition-colors",
                  copied
                    ? "dark:border-green-500/30 border-green-400 dark:bg-green-500/10 bg-green-50"
                    : "dark:border-white/10 border-slate-200 dark:bg-white/5 bg-white dark:hover:bg-white/10 hover:bg-slate-50"
                )}
                aria-label="Copy shareable link to clipboard"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Link className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {/* Theme toggle — mobile only */}
              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className={cn(
                  "flex items-center justify-center rounded-xl border p-2 transition-colors",
                  "dark:border-white/10 border-slate-200",
                  "dark:bg-white/5 bg-white",
                  "dark:hover:bg-white/10 hover:bg-slate-50"
                )}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {mounted ? (
                  theme === "dark" ? (
                    <Sun className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-500" />
                  )
                ) : (
                  <Moon className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CitySearch
              onSelect={handleCityPin}
              onHighlight={setHighlightedCities}
              pinnedCities={pinnedCities}
            />
            <HomeTimezonePicker value={homeTz} onChange={setHomeTz} />
            {/* Theme toggle — desktop only, inline with controls */}
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className={cn(
                "hidden sm:flex items-center justify-center rounded-xl border p-2 transition-colors",
                "dark:border-white/10 border-slate-200",
                "dark:bg-white/5 bg-white",
                "dark:hover:bg-white/10 hover:bg-slate-50"
              )}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="h-4 w-4 text-slate-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-500" />
                )
              ) : (
                <Moon className="h-4 w-4 text-slate-400" />
              )}
            </button>
          </div>
        </header>

        {/* ── World Map ── */}
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border",
            "dark:border-white/10 border-slate-300",
            "dark:bg-slate-700 bg-slate-50",
            "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]",
            "aspect-[2/1] sm:aspect-[1000/520]"
          )}
        >
          {mounted ? (
            <WorldMap
              cities={visibleCities}
              hoveredCity={hoveredCity}
              pinnedCities={pinnedCities}
              highlightedCities={highlightedCities}
              onCityHover={handleCityHover}
              onCityClick={handleCityPin}
            />
          ) : (
            <div className="w-full h-full animate-pulse dark:bg-slate-800/40 bg-slate-200/60 rounded-3xl" />
          )}
        </div>

        {/* ── Map tooltip (fixed so it isn't clipped by overflow-hidden) ── */}
        {tooltip && (() => {
          const isPinned = pinnedCities.some((c) => c.name === tooltip.city.name);
          return (
            <div
              className="fixed z-50 rounded-xl border dark:border-white/15 border-slate-200 dark:bg-slate-950/90 bg-white/95 px-3 py-2 text-sm shadow-xl backdrop-blur"
              style={{
                left: Math.max(16, Math.min(tooltip.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 16)),
                top: tooltip.y,
                transform: tooltip.y < 100
                  ? "translate(-50%, 8px)"
                  : "translate(-50%, calc(-100% - 6px))",
              }}
              onMouseEnter={cancelDismiss}
              onMouseLeave={scheduleDismiss}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold dark:text-white text-slate-900">{tooltip.city.name}</span>
                <button
                  onClick={() => {
                    const name = tooltip.city.name;
                    // Unpin if pinned
                    if (isPinned) handleCityPin(tooltip.city);
                    // Hide from map
                    setHiddenCities((prev) => new Set(prev).add(name));
                    setTooltip(null);
                    setHoveredCity(null);
                  }}
                  className="p-0.5 rounded dark:text-slate-400 text-slate-400 dark:hover:text-red-400 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${tooltip.city.name} from map`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="dark:text-slate-300 text-slate-600 text-xs">{tooltip.time}</div>
              {!isPinned && (
                <div className="text-sky-500 dark:text-sky-400 text-xs mt-0.5">Click to compare</div>
              )}
            </div>
          );
        })()}

        {/* ── Hovered city panel ── */}
        {mounted && (
          <div
            className={cn(
              "rounded-3xl border p-5",
              "dark:border-white/10 border-slate-200",
              "dark:bg-white/[0.03] bg-white",
              "transition-all duration-200",
              !hoveredCity && "hidden sm:block"
            )}
          >
            {hoveredCity && hoveredDerived ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-widest dark:text-slate-400 text-slate-500">
                    Hovering
                  </div>
                  <div className="text-xl font-semibold">{hoveredCity.name}</div>
                  <div className="text-sm dark:text-slate-400 text-slate-500">
                    {hoveredCity.tz} · {hoveredDerived.abbrev} · {hoveredDerived.utcOffset}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-sm">
                    <div>
                      <span className="dark:text-slate-400 text-slate-500">Local time </span>
                      <span className="font-mono font-semibold">{hoveredDerived.displayTime}</span>
                    </div>
                    <div>
                      <span className="dark:text-slate-400 text-slate-500">Date </span>
                      <span className="font-semibold">{hoveredDerived.displayDate}</span>
                    </div>
                    <div>
                      <span className="dark:text-slate-400 text-slate-500">vs {homeTzLabel} </span>
                      <span
                        className={cn(
                          "font-semibold",
                          hoveredDerived.diff === "same time"
                            ? "text-green-500"
                            : hoveredDerived.diff.startsWith("+")
                              ? "text-sky-500"
                              : "text-orange-400"
                        )}
                      >
                        {hoveredDerived.diff}
                      </span>
                    </div>
                  </div>
                </div>
                <AnalogClock
                  hour={hoveredDerived.zoneTime.hour}
                  minute={hoveredDerived.zoneTime.minute}
                  second={hoveredDerived.zoneTime.second}
                  size={80}
                />
              </div>
            ) : homeDerived ? (
              /* Default state: show home timezone — wrapper is hidden on mobile */
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-widest dark:text-slate-400 text-slate-500">
                    Home
                  </div>
                  <div className="text-xl font-semibold">{homeTzLabel}</div>
                  <div className="text-sm dark:text-slate-400 text-slate-500">
                    {homeTz} · {homeDerived.abbrev} · {homeDerived.offset}
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="dark:text-slate-400 text-slate-500">Local time </span>
                    <span className="font-mono font-semibold">{homeDerived.displayTime}</span>
                    <span className="dark:text-slate-400 text-slate-500 ml-3">
                      {homeDerived.displayDate}
                    </span>
                  </div>
                </div>
                <AnalogClock
                  hour={homeDerived.hour}
                  minute={homeDerived.minute}
                  second={homeDerived.second}
                  size={100}
                />
              </div>
            ) : (
              <div className="h-10 animate-pulse dark:bg-white/5 bg-slate-100 rounded-xl" />
            )}
          </div>
        )}

        {/* ── Compare panel ── */}
        {mounted && pinnedCities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest dark:text-slate-400 text-slate-500">
                Comparing {pinnedCities.length} / 4
              </h2>
              <button
                onClick={() => setPinnedCities([])}
                className="flex items-center gap-1.5 text-xs dark:text-slate-400 text-slate-500 dark:hover:text-red-400 hover:text-red-500 transition-colors"
                aria-label="Clear all pinned cities"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {pinnedDerived.map((d) => (
                <div
                  key={d.city.name}
                  className={cn(
                    "relative rounded-2xl border p-4 space-y-3 transition-colors",
                    "dark:border-white/10 border-slate-200",
                    "dark:bg-white/[0.03] bg-white",
                    d.isDaytime
                      ? "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "dark:shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                  )}
                >
                  {/* Remove button */}
                  <button
                    onClick={() => handleCityPin(d.city)}
                    className="absolute top-3 right-3 p-0.5 rounded-lg dark:text-slate-500 text-slate-400 dark:hover:text-red-400 hover:text-red-500 dark:hover:bg-white/5 hover:bg-slate-100 transition-colors"
                    aria-label={`Remove ${d.city.name} from comparison`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Day/Night indicator */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-base",
                        d.isDaytime ? "opacity-100" : "opacity-60"
                      )}
                      aria-label={d.isDaytime ? "Daytime" : "Nighttime"}
                    >
                      {d.isDaytime ? "☀️" : "🌙"}
                    </span>
                    <span className="font-semibold text-sm truncate pr-4">{d.city.name}</span>
                  </div>

                  {/* Analog clock */}
                  <div className="flex justify-center">
                    <AnalogClock
                      hour={d.zoneTime.hour}
                      minute={d.zoneTime.minute}
                      second={d.zoneTime.second}
                      size={72}
                    />
                  </div>

                  {/* Time details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="font-mono text-base font-semibold tracking-tight text-center">
                      {d.displayTime}
                    </div>
                    <div className="text-center dark:text-slate-400 text-slate-500 text-[11px]">
                      {d.displayDate}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t dark:border-white/5 border-slate-100">
                      <span className="dark:text-slate-400 text-slate-500">{d.utcOffset}</span>
                      <span
                        className={cn(
                          "font-medium",
                          d.diff === "same time"
                            ? "text-green-500"
                            : d.diffMinutes > 0
                              ? "text-sky-500"
                              : "text-orange-400"
                        )}
                      >
                        {d.diff === "same time" ? "= home" : `${d.diff} vs home`}
                      </span>
                    </div>
                    <div className="text-center dark:text-slate-500 text-slate-400 text-[11px]">
                      {d.abbrev} · {d.city.tz}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty slot hints */}
              {pinnedCities.length < 4 &&
                Array.from({ length: 4 - pinnedCities.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className={cn(
                      "rounded-2xl border-2 border-dashed flex items-center justify-center min-h-[120px] sm:min-h-[200px]",
                      "dark:border-white/5 border-slate-200",
                      "dark:text-slate-600 text-slate-300 text-xs text-center px-4",
                      i > 0 && "hidden sm:flex"
                    )}
                  >
                    Click a city on the map or search to add
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Share bar ── */}
        {mounted && (
          <div
            className={cn(
              "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border px-4 py-3",
              "dark:border-white/10 border-slate-200",
              "dark:bg-white/[0.02] bg-white"
            )}
          >
            <div className="text-sm dark:text-slate-400 text-slate-500">
              {pinnedCities.length > 0 ? (
                <>
                  Sharing <span className="dark:text-white text-slate-900 font-medium">{pinnedCities.map((c) => c.name).join(", ")}</span> with home set to{" "}
                  <span className="dark:text-white text-slate-900 font-medium">{homeTzLabel}</span>
                </>
              ) : (
                "Pin cities then share the link with your team"
              )}
            </div>
            <button
              onClick={handleShare}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all shrink-0",
                copied
                  ? "dark:border-green-500/30 border-green-400 dark:bg-green-500/10 bg-green-50 dark:text-green-400 text-green-600"
                  : "dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 dark:text-slate-200 text-slate-700 dark:hover:bg-white/10 hover:bg-slate-100"
              )}
              aria-label="Copy shareable link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="text-center text-xs dark:text-slate-600 text-slate-400 pb-2">
          Built with Next.js · {CITIES.length} searchable cities · Click to pin · Share with{" "}
          <kbd className="px-1 py-0.5 rounded dark:bg-white/5 bg-slate-100 font-mono text-[11px]">
            ?compare=
          </kbd>{" "}
          URL params
        </footer>
      </div>
    </div>
  );
}
