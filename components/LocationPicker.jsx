"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

// Fix default marker icons (Leaflet expects image files at a relative path).
const icon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Default center: Cairo, Egypt.
const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 };

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], 16);
  }, [position, map]);
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [recenterTo, setRecenterTo] = useState(null);

  const center = useMemo(
    () => value || DEFAULT_CENTER,
    [value]
  );

  function pick(pos) {
    onChange(pos);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      alert("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        onChange(pos);
        setRecenterTo({ ...pos, _t: Date.now() });
        setLocating(false);
      },
      () => {
        alert("تعذر تحديد موقعك. فعّل صلاحية الموقع وحاول مرة أخرى.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <div className="map-box">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 16 : 12}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={pick} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={icon}
              draggable={true}
              eventHandlers={{
                dragend(e) {
                  const m = e.target.getLatLng();
                  onChange({ lat: m.lat, lng: m.lng });
                },
              }}
            />
          )}
          <Recenter position={recenterTo} />
        </MapContainer>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn ghost sm"
          onClick={locateMe}
          disabled={locating}
        >
          {locating ? "جاري التحديد..." : "📍 استخدم موقعي الحالي"}
        </button>
        {value && (
          <a
            className="btn ghost sm"
            href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            🗺️ فتح في خرائط جوجل
          </a>
        )}
      </div>

      {value ? (
        <div className="coords">
          تم تحديد الموقع: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </div>
      ) : (
        <div className="coords">
          اضغط على الخريطة لتحديد موقعك أو استخدم زر «موقعي الحالي».
        </div>
      )}
    </div>
  );
}
