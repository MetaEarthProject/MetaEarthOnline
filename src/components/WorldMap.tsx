import { useEffect, useMemo, useRef, useState } from "react";
import world from "@svg-maps/world";
import { partyColors, useGameStore } from "../store/gameStore";

type SvgCountry = {
  id: string;
  name: string;
  path: string;
};

type SvgWorldMap = {
  viewBox: string;
  locations: SvgCountry[];
};

type MapFocus = {
  regionId: string | null;
  countryName: string | null;
};

type WorldMapProps = {
  focusedRegionId: string | null;
  focusedCountryName: string | null;
  onFocusChange: (focus: MapFocus) => void;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
};

const worldMap = world as SvgWorldMap;

const TERRITORY_PALETTE = [
  "#b30000",
  "#cf1111",
  "#d95f02",
  "#f39c12",
  "#f2e205",
  "#87d322",
  "#3da525",
  "#00916e",
  "#1f8fcf",
  "#2f5ac5",
  "#4a31ad",
  "#8f1ec9",
  "#bf1db7",
  "#071127"
];

const normalizeCountry = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const hashColor = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % TERRITORY_PALETTE.length;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function WorldMap({ focusedRegionId, focusedCountryName, onFocusChange }: WorldMapProps) {
  const [zoomStep, setZoomStep] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const cancelClickRef = useRef(false);
  const regions = useGameStore((state) => state.regions);

  const viewBoxParts = useMemo(
    () =>
      worldMap.viewBox
        .split(/\s+/)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
    []
  );

  const locationByCountryName = useMemo(() => {
    const map = new Map<string, string>();
    for (const location of worldMap.locations) {
      map.set(normalizeCountry(location.name), location.id);
    }
    return map;
  }, []);

  const regionByCountryName = useMemo(() => {
    const map = new Map<string, string>();
    for (const region of regions) {
      map.set(normalizeCountry(region.country), region.id);
    }
    return map;
  }, [regions]);

  const regionColorByCountryId = useMemo(() => {
    const map = new Map<string, string>();
    for (const region of regions) {
      const locationId = locationByCountryName.get(normalizeCountry(region.country));
      if (!locationId) continue;
      map.set(locationId, partyColors[region.owner] ?? "#22c55e");
    }
    return map;
  }, [regions, locationByCountryName]);

  const focusedCountryId = useMemo(() => {
    if (focusedRegionId) {
      const focusedRegion = regions.find((region) => region.id === focusedRegionId);
      if (focusedRegion) {
        return locationByCountryName.get(normalizeCountry(focusedRegion.country)) ?? null;
      }
    }
    if (focusedCountryName) {
      return locationByCountryName.get(normalizeCountry(focusedCountryName)) ?? null;
    }
    return null;
  }, [focusedCountryName, focusedRegionId, locationByCountryName, regions]);

  const [minX, minY, baseWidth, baseHeight] = viewBoxParts;
  const zoomFactor = 1 + zoomStep * 0.35;
  const zoomWidth = baseWidth / zoomFactor;
  const zoomHeight = baseHeight / zoomFactor;
  const centerX = minX + baseWidth / 2;
  const centerY = minY + baseHeight / 2;
  const maxPanX = Math.max(0, (baseWidth - zoomWidth) / 2);
  const maxPanY = Math.max(0, (baseHeight - zoomHeight) / 2);

  const clampPan = (value: { x: number; y: number }) => ({
    x: clamp(value.x, -maxPanX, maxPanX),
    y: clamp(value.y, -maxPanY, maxPanY)
  });

  useEffect(() => {
    setPan((value) => {
      const next = clampPan(value);
      return next.x === value.x && next.y === value.y ? value : next;
    });
  }, [maxPanX, maxPanY]);

  const clampedPan = clampPan(pan);
  const dynamicViewBox = `${centerX + clampedPan.x - zoomWidth / 2} ${centerY + clampedPan.y - zoomHeight / 2} ${zoomWidth} ${zoomHeight}`;

  const handleCountryClick = (country: SvgCountry) => {
    if (cancelClickRef.current) {
      cancelClickRef.current = false;
      return;
    }

    onFocusChange({
      regionId: regionByCountryName.get(normalizeCountry(country.name)) ?? null,
      countryName: country.name
    });
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    cancelClickRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: clampedPan.x,
      startPanY: clampedPan.y
    };
    setIsDragging(true);
    svg.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const dragState = dragStateRef.current;
    if (!svg || !dragState || dragState.pointerId !== event.pointerId) return;

    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const deltaX = ((event.clientX - dragState.startClientX) / bounds.width) * zoomWidth;
    const deltaY = ((event.clientY - dragState.startClientY) / bounds.height) * zoomHeight;

    if (Math.abs(event.clientX - dragState.startClientX) > 4 || Math.abs(event.clientY - dragState.startClientY) > 4) {
      cancelClickRef.current = true;
    }

    setPan(
      clampPan({
        x: dragState.startPanX - deltaX,
        y: dragState.startPanY - deltaY
      })
    );
  };

  const handlePointerEnd = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg && svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  return (
    <div className={`map-wrap${isDragging ? " dragging" : ""}`}>
      <svg
        ref={svgRef}
        className="world-svg"
        viewBox={dynamicViewBox}
        role="img"
        aria-label="World territory map"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {worldMap.locations.map((country) => {
          const linkedRegionId = regionByCountryName.get(normalizeCountry(country.name));
          const isFocused = country.id === focusedCountryId;
          const fill = regionColorByCountryId.get(country.id) ?? TERRITORY_PALETTE[hashColor(country.id)];

          return (
            <path
              key={country.id}
              d={country.path}
              fill={fill}
              stroke={isFocused ? "#f5f8ff" : "#1b1e24"}
              strokeWidth={isFocused ? 0.95 : 0.45}
              className={`country-shape ${linkedRegionId ? "playable" : "clickable"}`}
              onClick={() => handleCountryClick(country)}
            />
          );
        })}
      </svg>

      <div className="map-zoom-controls">
        <button type="button" onClick={() => setZoomStep((value) => clamp(value + 1, 0, 5))} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => setZoomStep((value) => clamp(value - 1, 0, 5))} aria-label="Zoom out">
          -
        </button>
      </div>
    </div>
  );
}
