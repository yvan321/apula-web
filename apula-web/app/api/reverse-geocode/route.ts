import { NextRequest, NextResponse } from "next/server";

const PHOTON_HEADERS = {
  Accept: "application/json",
  "User-Agent": "APULA/1.0 (stations reverse geocoding)",
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
  const lat = request.nextUrl.searchParams.get("lat")?.trim();
  const lng = request.nextUrl.searchParams.get("lng")?.trim();

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required." },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(
      `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      {
        headers: PHOTON_HEADERS,
        cache: "no-store",
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Reverse geocoding request failed." },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    const first = Array.isArray(data?.features) ? data.features[0] : null;
    const coordinates = first?.geometry?.coordinates;

    return NextResponse.json({
      lat: String(Array.isArray(coordinates) ? coordinates[1] : lat),
      lon: String(Array.isArray(coordinates) ? coordinates[0] : lng),
      display_name: buildDisplayName(first?.properties || {}) || `${lat}, ${lng}`,
    });
  } catch (error) {
    console.error("Reverse geocode proxy error:", error);
    return NextResponse.json(
      { error: "Unable to look up address right now." },
      { status: 500 }
    );
  }
}
