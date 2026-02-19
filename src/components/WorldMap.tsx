"use client";

import { useMemo, useRef } from "react";
import { geoEqualEarth } from "d3-geo";
import type { City } from "@/data/cities";
import { cn } from "@/lib/utils";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;
const MAP_SCALE = 185;

type Props = {
  cities: City[];
  hoveredCity: City | null;
  pinnedCities: City[];
  highlightedCities: City[];
  onCityHover: (city: City | null, svgRect: DOMRect | null) => void;
  onCityClick: (city: City) => void;
};

export function WorldMap({
  cities,
  hoveredCity,
  pinnedCities,
  highlightedCities,
  onCityHover,
  onCityClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const projection = useMemo(
    () => geoEqualEarth().scale(MAP_SCALE).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]),
    []
  );

  const cityPoints = useMemo(
    () =>
      cities
        .map((city) => {
          const coords = projection([city.lon, city.lat]);
          if (!coords) return null;
          const [x, y] = coords;
          return { ...city, x, y };
        })
        .filter((c): c is City & { x: number; y: number } => c !== null),
    [cities, projection]
  );

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => onCityHover(null, null)}
        role="img"
        aria-label="Interactive world timezone map — hover or click city dots"
      >
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="transparent" />

        {/* World SVG base map */}
        <image
          href="/world.svg"
          x="0"
          y="0"
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          style={{ filter: "var(--map-filter)", opacity: "var(--map-opacity)" } as React.CSSProperties}
        />

        {/* City dots */}
        <g>
          {cityPoints.map((city) => {
            const isPinned = pinnedCities.some((c) => c.name === city.name);
            const isHovered = hoveredCity?.name === city.name;
            const isHighlighted = highlightedCities.some((c) => c.name === city.name);
            const isActive = isPinned || isHovered || isHighlighted;

            return (
              <g key={`${city.name}-${city.tz}`}>
                {/* Pulse ring for pinned cities */}
                {isPinned && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={12}
                    fill="rgba(56,189,248,0.18)"
                    className="pointer-events-none"
                  />
                )}
                {/* Highlight ring for search results */}
                {isHighlighted && !isPinned && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={10}
                    fill="none"
                    stroke="rgba(250,204,21,0.6)"
                    strokeWidth={1.5}
                    className="pointer-events-none"
                  />
                )}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isActive ? 6.5 : 4.5}
                  className={cn(
                    "cursor-pointer transition-all duration-100",
                    isPinned
                      ? "fill-sky-400 stroke-white stroke-[1.5px]"
                      : isHighlighted
                        ? "fill-yellow-300 stroke-white stroke-[1.5px]"
                        : isHovered
                          ? "fill-sky-200 stroke-white stroke-[1.25px]"
                          : "fill-sky-200/80 stroke-white/50 stroke-[1px]"
                  )}
                  tabIndex={0}
                  role="button"
                  aria-label={`${city.name} — click to pin for comparison`}
                  onMouseEnter={() => {
                    const rect = svgRef.current?.getBoundingClientRect() ?? null;
                    onCityHover(city, rect);
                  }}
                  onMouseLeave={() => onCityHover(null, null)}
                  onClick={() => onCityClick(city)}
                  onKeyDown={(e) => e.key === "Enter" && onCityClick(city)}
                />
              </g>
            );
          })}
        </g>
      </svg>

    </div>
  );
}
