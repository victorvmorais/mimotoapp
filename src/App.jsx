import { useState, useEffect, useCallback, useRef } from "react";

const GOOGLE_MAPS_API_KEY = "AIzaSyAWK94SwutfM0M6dxukmrUTQCfg4a83ltE";

const CATEGORIES = [
  { id: "tire", label: "Borracharias",    icon: "🔧", type: "car_repair",  keyword: "borracharia",     color: "#E84040" },
  { id: "gas",  label: "Postos",          icon: "⛽", type: "gas_station", keyword: null,              color: "#F07D1A" },
  { id: "tow",  label: "Guinchos",        icon: "🚛", type: "car_repair",  keyword: "guincho reboque", color: "#4A90E2" },
];

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function distLabel(m) { return m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`; }
function getWA(phone) {
  if (!phone) return null;
  const d = phone.replace(/\D/g,"");
  if (d.length < 10 || d.length > 13) return null;
  return `https://wa.me/${d.startsWith("55") ? d : "55"+d}`;
}
function is24h(place) {
  const periods = place.opening_hours?.periods;
  if (!periods) return false;
  return periods.some(p => p.open && !p.close);
}

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ color: "#F5A623", fontSize: 12 }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5-Math.round(rating))}
      <span style={{ color: "#888", marginLeft: 3, fontSize: 11 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function loadMaps() {
  return new Promise(resolve => {
    if (window.google?.maps?.places) return resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

export default function App() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  const scrollRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState({ tire: [], gas: [], tow: [] });
  const [activeTab, setActiveTab] = useState("tire");
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeNav, setActiveNav] = useState("map");
  const [search, setSearch] = useState("");
  const [locError, setLocError] = useState(null);
  const [only24h, setOnly24h] = useState(false);

  useEffect(() => { loadMaps().then(() => setMapsReady(true)); }, []);

  useEffect(() => {
    if (mapsReady && mapRef.current && !mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom: 14,
        center: { lat: -3.7319, lng: -38.5267 },
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#1e1e2e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#aaaaaa" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#1e1e2e" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c3e" }] },
          { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373750" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#454560" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
          { featureType: "poi", elementType: "geometry", stylers: [{ color: "#252535" }] },
        ],
      });
    }
  }, [mapsReady]);

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }
  };

  const placeMarkers = useCallback((lat, lng, allPlaces) => {
    if (!mapInstance.current) return;
    clearMarkers();

    new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstance.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor: "#4A90E2", fillOpacity: 1,
        strokeColor: "#fff", strokeWeight: 3,
      },
      zIndex: 10,
    });

    circleRef.current = new window.google.maps.Circle({
      strokeColor: "#4A90E2", strokeOpacity: 0.3, strokeWeight: 1,
      fillColor: "#4A90E2", fillOpacity: 0.08,
      map: mapInstance.current, center: { lat, lng }, radius: 800,
    });

    CATEGORIES.forEach(cat => {
      (allPlaces[cat.id] || []).forEach(place => {
        const plat = place.geometry.location.lat();
        const plng = place.geometry.location.lng();
        const dist = distLabel(getDistance(lat, lng, plat, plng));
        const isOpen = place.opening_hours?.isOpen?.() ?? null;
        const h24 = is24h(place);

        const infoContent = `<div style="background:#2a2a3a;border-radius:8px;padding:8px 10px;color:#fff;font-family:sans-serif;min-width:130px;">
          <div style="font-weight:700;font-size:13px">${place.name}</div>
          <div style="font-size:11px;color:#aaa;margin-top:2px">
            ${isOpen !== null ? (isOpen ? "Aberto" : "Fechado") : ""}${h24 ? " · 24h" : ""} · ${dist}
          </div>
        </div>`;
        const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

        const marker = new window.google.maps.Marker({
          position: { lat: plat, lng: plng },
          map: mapInstance.current,
          title: place.name,
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="${cat.color}"/><circle cx="18" cy="18" r="10" fill="rgba(0,0,0,0.25)"/><text x="18" y="22" text-anchor="middle" font-size="12" fill="white">${cat.id === "tire" ? "🔧" : cat.id === "gas" ? "⛽" : "🚛"}</text></svg>`)}`,
            scaledSize: new window.google.maps.Size(32, 40),
            anchor: new window.google.maps.Point(16, 40),
          },
        });

        marker._placeId = place.place_id;
        marker.addListener("click", () => infoWindow.open(mapInstance.current, marker));
        markersRef.current.push(marker);
      });
    });

    mapInstance.current.panTo({ lat, lng });
    mapInstance.current.setZoom(14);
  }, []);

  const fetchPlaces = useCallback(async (lat, lng) => {
    if (!mapsReady) return;
    setLoading(true);
    setSearched(true);
    setLocError(null);
    const map = new window.google.maps.Map(document.createElement("div"));
    const service = new window.google.maps.places.PlacesService(map);
    const center = new window.google.maps.LatLng(lat, lng);
    const result = { tire: [], gas: [], tow: [] };
    let done = 0;

    CATEGORIES.forEach(cat => {
      const searchParams = {
        location: center,
        radius: 5000,
        type: cat.type,
        ...(cat.keyword && { keyword: cat.keyword }),
      };
      service.nearbySearch(searchParams, (results, status) => {
        const OK = window.google.maps.places.PlacesServiceStatus.OK;
        const items = status === OK && results ? results.slice(0, 10) : [];
        if (!items.length) {
          done++;
          if (done === CATEGORIES.length) { placeMarkers(lat, lng, result); setPlaces({...result}); setLoading(false); }
          return;
        }
        let dd = 0;
        items.forEach(place => {
          service.getDetails({
            placeId: place.place_id,
            fields: ["name","formatted_phone_number","international_phone_number","geometry","vicinity","rating","user_ratings_total","opening_hours","place_id"],
          }, (detail, ds) => {
            result[cat.id].push(ds === OK && detail ? detail : place);
            dd++;
            if (dd === items.length) {
              result[cat.id].sort((a,b) =>
                getDistance(lat,lng,a.geometry.location.lat(),a.geometry.location.lng()) -
                getDistance(lat,lng,b.geometry.location.lat(),b.geometry.location.lng())
              );
              done++;
              if (done === CATEGORIES.length) { placeMarkers(lat, lng, result); setPlaces({...result}); setLoading(false); }
            }
          });
        });
      });
    });
  }, [mapsReady, placeMarkers]);

  const handleGPS = () => {
    setLocError(null);
    if (!navigator.geolocation) { setLocError("Geolocalização não suportada."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        fetchPlaces(loc.lat, loc.lng);
      },
      () => setLocError("Permissão negada. Verifique as configurações.")
    );
  };

  // Clique no nome do card: centraliza no mapa e abre o balão
  const handleCardClick = (place) => {
    const marker = markersRef.current.find(m => m._placeId === place.place_id);
    if (marker && mapInstance.current) {
      mapInstance.current.panTo(marker.getPosition());
      mapInstance.current.setZoom(17);
      window.google.maps.event.trigger(marker, "click");
      // Rola suavemente para o topo para ver o mapa
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const activeCat = CATEGORIES.find(c => c.id === activeTab);
  const activePlaces = (places[activeTab] || []).filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const match24h = !only24h || is24h(p);
    return matchSearch && match24h;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { height: 100%; }
        body { background: #1a1a2a; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; height: 100%; overscroll-behavior-y: none; }
        #root { height: 100%; }
        .gm-style-iw { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .gm-style-iw-d { overflow: visible !important; }
        .gm-style-iw-t::after { display: none !important; }
        .gm-ui-hover-effect { display: none !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: #555; }
        .scroll-area { -webkit-overflow-scrolling: touch; }
        .card-name:active { opacity: 0.7; }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 480, margin: "0 auto",
        height: "100dvh", background: "#1a1a2a",
        display: "flex", flexDirection: "column",
        fontFamily: "'Inter', sans-serif", position: "relative",
      }}>

        {/* TOP BAR */}
        <div style={{ background: "#E8831A", padding: "48px 16px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🏍️</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
                Mi<span style={{ color: "#1a1a2a" }}>Moto</span>
              </span>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.2)", border: "2px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>👤</div>
          </div>
        </div>

        {/* SCROLL AREA */}
        <div ref={scrollRef} className="scroll-area" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 80 }}>

          {/* SEARCH */}
          <div style={{ padding: "16px 16px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Olá, Victor!</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#2a2a3a", borderRadius: 12, padding: "10px 14px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar locais..."
                style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, flex: 1, fontFamily: "'Inter', sans-serif" }}
              />
            </div>
          </div>

          {/* CATEGORY TABS */}
          <div style={{ padding: "0 16px 12px", display: "flex", gap: 8, overflowX: "auto" }}>
            {CATEGORIES.map(cat => {
              const active = activeTab === cat.id;
              return (
                <button key={cat.id} onClick={() => { setActiveTab(cat.id); setOnly24h(false); }} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 99, border: "none", cursor: "pointer",
                  background: active ? cat.color : "#2a2a3a",
                  color: active ? "#fff" : "#888",
                  fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  boxShadow: active ? `0 4px 12px ${cat.color}55` : "none",
                  transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* MAPA */}
          <div style={{ position: "relative", height: 240, flexShrink: 0 }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
            {locError && (
              <div style={{
                position: "absolute", top: 10, left: 12, right: 12,
                background: "rgba(232,64,64,0.9)", borderRadius: 10,
                padding: "8px 12px", fontSize: 12, color: "#fff", fontWeight: 500,
              }}>{locError}</div>
            )}
            <button onClick={handleGPS} disabled={loading} style={{
              position: "absolute", bottom: 12, right: 12,
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 99, border: "none",
              background: "#1a1a2a", color: loading ? "#888" : "#4A90E2",
              fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
              WebkitTapHighlightColor: "transparent",
            }}>
              {loading ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
                </svg>
              )}
              GPS
            </button>
          </div>

          {/* HEADER SERVIÇOS */}
          <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Serviços Próximos</div>
              {searched && !loading && (
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  {activePlaces.length} resultado{activePlaces.length !== 1 ? "s" : ""}{only24h ? " · apenas 24h" : ""}
                </div>
              )}
            </div>
            {searched && !loading && (
              <button onClick={() => setOnly24h(v => !v)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 99, border: "1.5px solid",
                borderColor: only24h ? "#00C896" : "#3a3a4a",
                background: only24h ? "rgba(0,200,150,0.12)" : "transparent",
                color: only24h ? "#00C896" : "#666",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: "transparent",
              }}>
                <span style={{ fontSize: 13 }}>🕐</span> Apenas 24h
              </button>
            )}
          </div>

          {/* CARDS */}
          <div style={{ padding: "12px 16px 0" }}>

            {!searched && !loading && (
              <div style={{
                background: "#2a2a3a", borderRadius: 16, padding: "28px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 12,
              }}>
                <span style={{ fontSize: 36 }}>📍</span>
                <div style={{ fontSize: 14, color: "#888", textAlign: "center", lineHeight: 1.6 }}>
                  Toque em <strong style={{ color: "#4A90E2" }}>GPS</strong> para encontrar serviços próximos
                </div>
              </div>
            )}

            {loading && [1,2,3].map(i => (
              <div key={i} style={{ background: "#2a2a3a", borderRadius: 16, padding: 16, marginBottom: 12, opacity: 0.5 }}>
                <div style={{ height: 14, background: "#3a3a4a", borderRadius: 6, marginBottom: 10, width: "60%" }}/>
                <div style={{ height: 10, background: "#3a3a4a", borderRadius: 6, marginBottom: 8, width: "40%" }}/>
                <div style={{ height: 10, background: "#3a3a4a", borderRadius: 6, marginBottom: 16, width: "80%" }}/>
                <div style={{ height: 36, background: "#3a3a4a", borderRadius: 10 }}/>
              </div>
            ))}

            {!loading && searched && activePlaces.length === 0 && (
              <div style={{
                background: "#2a2a3a", borderRadius: 16, padding: "28px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 32 }}>🔍</span>
                <div style={{ fontSize: 14, color: "#888", textAlign: "center", lineHeight: 1.6 }}>
                  {only24h ? "Nenhum serviço 24h encontrado nessa área." : "Nenhum resultado encontrado."}
                </div>
              </div>
            )}

            {!loading && activePlaces.map((place, i) => {
              const dist = location
                ? distLabel(getDistance(location.lat, location.lng, place.geometry.location.lat(), place.geometry.location.lng()))
                : null;
              const phone = place.formatted_phone_number || place.international_phone_number;
              const waUrl = getWA(phone);
              const isOpen = place.opening_hours?.isOpen?.() ?? null;
              const h24 = is24h(place);
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}`;

              return (
                <div key={place.place_id || i} style={{
                  background: "#2a2a3a", borderRadius: 16, padding: 16, marginBottom: 12,
                  border: `1px solid ${h24 ? "rgba(0,200,150,0.25)" : "#3a3a4a"}`,
                  animation: `fadeUp 0.3s ease ${i*0.04}s both`,
                  position: "relative", overflow: "hidden",
                }}>

                  {/* Borda lateral 24h */}
                  {h24 && (
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: 3, background: "#00C896", borderRadius: "16px 0 0 16px",
                    }}/>
                  )}

                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>

                    {/* NOME CLICÁVEL */}
                    <div
                      className="card-name"
                      onClick={() => handleCardClick(place)}
                      style={{
                        fontSize: 15, fontWeight: 700, color: "#fff",
                        lineHeight: 1.3, flex: 1, paddingRight: 10,
                        cursor: "pointer",
                        borderBottom: "1px dashed rgba(255,255,255,0.2)",
                        paddingBottom: 2,
                      }}
                    >
                      {place.name}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {dist && (
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: activeCat?.color,
                          background: `${activeCat?.color}22`, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap",
                        }}>
                          {dist}
                        </span>
                      )}
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {h24 && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, color: "#00C896",
                            background: "rgba(0,200,150,0.12)", padding: "2px 7px", borderRadius: 99,
                            border: "1px solid rgba(0,200,150,0.3)",
                          }}>24H</span>
                        )}
                        {isOpen !== null && (
                          <span style={{ fontSize: 11, color: isOpen ? "#4CAF50" : "#E84040", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {isOpen ? "● Aberto" : "● Fechado"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estrelas */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Stars rating={place.rating} />
                    {place.user_ratings_total && (
                      <span style={{ fontSize: 11, color: "#666" }}>{place.user_ratings_total} avaliações</span>
                    )}
                  </div>

                  {/* Endereço */}
                  {place.vicinity && (
                    <div style={{ fontSize: 12, color: "#666", marginBottom: phone ? 6 : 12, display: "flex", gap: 5, alignItems: "flex-start", lineHeight: 1.5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" style={{ marginTop: 1, flexShrink: 0 }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {place.vicinity}
                    </div>
                  )}

                  {/* Telefone */}
                  {phone && (
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 12, display: "flex", gap: 5, alignItems: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.1z"/>
                      </svg>
                      {phone}
                    </div>
                  )}

                  {/* Botões */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {phone && (
                      <a href={waUrl || `tel:${phone}`} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "10px 0", borderRadius: 10,
                        background: waUrl ? "rgba(37,211,102,0.12)" : "#3a3a4a",
                        color: waUrl ? "#25D366" : "#ccc",
                        border: waUrl ? "1px solid rgba(37,211,102,0.25)" : "none",
                        textDecoration: "none", fontSize: 13, fontWeight: 600,
                        WebkitTapHighlightColor: "transparent",
                      }}>
                        {waUrl ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.1z"/>
                          </svg>
                        )}
                        {waUrl ? "WhatsApp" : "Ligar"}
                      </a>
                    )}
                    <a href={mapsUrl} target="_blank" rel="noreferrer" style={{
                      flex: phone ? 1.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "10px 0", borderRadius: 10, background: activeCat?.color, color: "#fff",
                      textDecoration: "none", fontSize: 13, fontWeight: 600,
                      WebkitTapHighlightColor: "transparent",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                      </svg>
                      Traçar Rota
                    </a>
                  </div>
                </div>
              );
            })}
            <div style={{ height: 16 }} />
          </div>
        </div>

        {/* BOTTOM NAV */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: "#111118", borderTop: "1px solid #2a2a3a",
          padding: "10px 0 28px", display: "flex", zIndex: 100,
        }}>
          {[
            { id: "map", label: "Mapa", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> },
            { id: "routes", label: "Rotas", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 15V9a6 6 0 0 1 12 0v9"/></svg> },
            { id: "maint", label: "Manutenção", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
            { id: "profile", label: "Perfil", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          ].map(item => {
            const active = activeNav === item.id;
            return (
              <button key={item.id} onClick={() => setActiveNav(item.id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "transparent", border: "none", cursor: "pointer",
                color: active ? "#E8831A" : "#555", fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: "transparent",
              }}>
                {item.icon}
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
