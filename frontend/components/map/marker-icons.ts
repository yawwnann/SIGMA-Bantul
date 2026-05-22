import L from "leaflet";
import type { EvacuationLocationCategory } from "@/types";

const CATEGORY_STYLES: Record<
  EvacuationLocationCategory,
  { color: string; label: string; svgPath: string }
> = {
  SCHOOL: {
    color: "#2563eb",
    label: "Sekolah",
    svgPath:
      "M22 10 12 4 2 10l10 6 10-6ZM6 12v5c2 2 10 2 12 0v-5",
  },
  FIELD: {
    color: "#16a34a",
    label: "Lapangan",
    svgPath: "M4 6h16v12H4z M12 6v12 M4 12h16",
  },
  GOVERNMENT: {
    color: "#dc2626",
    label: "Kantor Pemerintah",
    svgPath: "M3 21h18 M5 21V9l7-4 7 4v12 M9 21v-6h6v6",
  },
};

export function getEvacuationLocationCategoryLabel(category?: string) {
  if (category === "SCHOOL") return CATEGORY_STYLES.SCHOOL.label;
  if (category === "FIELD") return CATEGORY_STYLES.FIELD.label;
  if (category === "GOVERNMENT") return CATEGORY_STYLES.GOVERNMENT.label;
  return "Lokasi Evakuasi";
}

export function getEvacuationLocationCategoryColor(category?: string) {
  if (category === "SCHOOL") return CATEGORY_STYLES.SCHOOL.color;
  if (category === "FIELD") return CATEGORY_STYLES.FIELD.color;
  if (category === "GOVERNMENT") return CATEGORY_STYLES.GOVERNMENT.color;
  return "#64748b";
}

export function createEvacuationIcon(category?: string) {
  const style =
    category === "SCHOOL" || category === "FIELD" || category === "GOVERNMENT"
      ? CATEGORY_STYLES[category]
      : {
          color: "#64748b",
          label: "Lokasi Evakuasi",
          svgPath: "M12 21s7-5 7-11a7 7 0 1 0-14 0c0 6 7 11 7 11Z",
        };

  return L.divIcon({
    className: "evacuation-marker-icon",
    html: `
      <div class="evacuation-marker-pin" style="--marker-color:${style.color}" title="${style.label}">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="${style.svgPath}"></path>
        </svg>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -34],
  });
}

export function createEvacuationClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count >= 100 ? "large" : count >= 30 ? "medium" : "small";

  return L.divIcon({
    html: `<div class="evacuation-cluster evacuation-cluster-${size}"><span>${count}</span></div>`,
    className: "evacuation-cluster-wrapper",
    iconSize: L.point(size === "large" ? 52 : size === "medium" ? 46 : 40, size === "large" ? 52 : size === "medium" ? 46 : 40),
  });
}
