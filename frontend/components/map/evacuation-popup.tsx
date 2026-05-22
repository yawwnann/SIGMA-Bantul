import type { EvacuationLocation } from "@/types";
import { getEvacuationLocationCategoryLabel } from "./marker-icons";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function createEvacuationPopupHtml(evacuationLocation: EvacuationLocation) {
  const categoryLabel = getEvacuationLocationCategoryLabel(evacuationLocation.category);

  return `
    <div class="evacuation-popup">
      <div class="evacuation-popup__header">
        <span>${escapeHtml(categoryLabel)}</span>
      </div>
      <div class="evacuation-popup__body">
        <h3>${escapeHtml(evacuationLocation.name)}</h3>
        <dl>
          <div>
            <dt>Kategori</dt>
            <dd>${escapeHtml(categoryLabel)}</dd>
          </div>
          <div>
            <dt>Alamat</dt>
            <dd>${escapeHtml(evacuationLocation.address || "Bantul, DIY")}</dd>
          </div>
          <div>
            <dt>Kapasitas</dt>
            <dd>${Number(evacuationLocation.capacity || 0).toLocaleString("id-ID")}</dd>
          </div>
        </dl>
      </div>
    </div>
  `;
}
