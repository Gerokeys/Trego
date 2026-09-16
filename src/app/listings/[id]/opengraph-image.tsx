import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { formatMinorUnits } from "@/lib/money";
import { CONDITION_LABELS } from "@/lib/conditions";
import { UPLOAD_ROOT } from "@/lib/uploads";

export const alt = "Listing on Trego";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Resolves a listing photo URL to a file on disk. */
function photoPath(url: string) {
  if (url.startsWith("/media/")) {
    return path.join(UPLOAD_ROOT, ...url.slice("/media/".length).split("/"));
  }
  if (url.startsWith("/photos/")) {
    return path.join(process.cwd(), "public", ...decodeURIComponent(url).slice(1).split("/"));
  }
  return null;
}

/** The OG renderer can't decode WebP/AVIF, so normalise the photo to PNG. */
async function photoDataUrl(url: string | undefined) {
  const file = url ? photoPath(url) : null;
  if (!file) return null;
  try {
    const png = await sharp(await readFile(file))
      .resize(520, 520, { fit: "contain", background: "#ffffff" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The link-preview card WhatsApp, Facebook and others show when a listing is shared. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  });
  const visible = listing && listing.status !== "DRAFT" && listing.status !== "REMOVED";
  const photo = visible ? await photoDataUrl(listing.photos[0]?.url) : null;
  const title = visible ? listing.title.slice(0, 80) : "Trusted transactions for used goods";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#f7f8fa", padding: 40, gap: 40 }}>
        <div
          style={{
            display: "flex",
            width: 550,
            height: 550,
            background: "#ffffff",
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered by the OG image generator, not the browser
            <img src={photo} width={520} height={520} alt="" />
          ) : (
            <div style={{ display: "flex", fontSize: 40, color: "#5b6474" }}>Trego</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "12px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {visible ? (
              <div style={{ display: "flex", fontSize: 26, color: "#6148fb", letterSpacing: 2 }}>
                {(CONDITION_LABELS[listing.conditionGrade] ?? "").toUpperCase()}
              </div>
            ) : null}
            <div style={{ display: "flex", fontSize: 50, fontWeight: 700, color: "#0f172a", lineHeight: 1.15 }}>
              {title}
            </div>
            {visible ? (
              <div style={{ display: "flex", fontSize: 58, fontWeight: 700, color: "#0f172a" }}>
                {formatMinorUnits(listing.priceMinorUnits, listing.currency)}
              </div>
            ) : null}
            {visible && listing.county ? (
              <div style={{ display: "flex", fontSize: 28, color: "#5b6474" }}>
                {[listing.area, listing.county].filter(Boolean).join(", ")}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: "#0f172a" }}>Trego</span>
            <span style={{ fontSize: 22, color: "#6148fb" }}>Trusted transactions for used goods</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
