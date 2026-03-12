"use client";

import { useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

type LatLngValue = {
  lat: number;
  lng: number;
};

type StationMapPickerProps = {
  value: LatLngValue | null;
  onPick: (coords: LatLngValue) => void;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onPick }: { onPick: (coords: LatLngValue) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export default function StationMapPicker({ value, onPick }: StationMapPickerProps) {
  const center = useMemo<[number, number]>(() => {
    if (value) {
      return [value.lat, value.lng];
    }

    return [14.5995, 120.9842];
  }, [value]);

  return (
    <MapContainer center={center} zoom={13} style={{ height: "260px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {value && <Marker position={[value.lat, value.lng]} icon={markerIcon} />}
    </MapContainer>
  );
}
