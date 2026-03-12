import { NextRequest, NextResponse } from "next/server";

const PHOTON_HEADERS = {
  Accept: "application/json",
  "User-Agent": "APULA/1.0 (stations geocoding)",
};

const buildDisplayName = (properties: Record<string, unknown>) => {
  const parts = [
    properties.name,
    properties.street,
    properties.housenumber,
    properties.district,
    properties.city,
    properties.state,
    properties.country,
    properties.postcode,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return parts.join(", ");
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: PHOTON_HEADERS,
        cache: "no-store",
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Geocoding request failed." },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const first = Array.isArray(data?.features) ? data.features[0] : null;

    if (!first?.geometry?.coordinates || first.geometry.coordinates.length < 2) {
      return NextResponse.json([]);
    }

    const [lon, lat] = first.geometry.coordinates;
    const displayName = buildDisplayName(first.properties || {});

    return NextResponse.json([
      {
        lat: String(lat),
        lon: String(lon),
        display_name: displayName || query,
      },
    ]);
  } catch (error) {
    console.error("Geocode proxy error:", error);
    return NextResponse.json(
      { error: "Unable to search address right now." },
      { status: 500 }
    );
  }
}
