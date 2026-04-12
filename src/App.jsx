import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, orderBy, query } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBClGg9N5eQa77-wo-YBmohd8YS8ErYV_o",
  authDomain: "mimoto-app-c6ebd.firebaseapp.com",
  projectId: "mimoto-app-c6ebd",
  storageBucket: "mimoto-app-c6ebd.firebasestorage.app",
  messagingSenderId: "175058141808",
  appId: "1:175058141808:web:6e23a43d6cd4578ebe6ab5",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const USER_ID = "victor";

// Google Maps
const GOOGLE_MAPS_API_KEY = "AIzaSyAWK94SwutfM0M6dxukmrUTQCfg4a83ltE";
const CATEGORIES = [
  { id: "tire", label: "Borracharias", icon: "🔧", type: "car_repair",  keyword: "borracharia",     color: "#E84040" },
  { id: "gas",  label: "Postos",       icon: "⛽", type: "gas_station", keyword: null,              color: "#F07D1A" },
  { id: "tow",  label: "Reboques",     icon: "🚛", type: null,           keyword: "reboque 24h",     color: "#4A90E2" },
];

const MANUT_TYPES = [
  { id: "oil",    label: "Troca de Óleo",      icon: "🛢️", kmAlert: 3000 },
  { id: "filter", label: "Filtro de Ar",        icon: "🌬️", kmAlert: 6000 },
  { id: "tire",   label: "Pneu",                icon: "⚫", kmAlert: 15000 },
  { id: "chain",  label: "Corrente",            icon: "⛓️", kmAlert: 5000 },
  { id: "brake",  label: "Freio",               icon: "🔴", kmAlert: 8000 },
  { id: "spark",  label: "Vela de Ignição",     icon: "⚡", kmAlert: 8000 },
  { id: "other",  label: "Outro",               icon: "🔧", kmAlert: null },
];

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2-lat1)*Math.PI)/180, dLng = ((lng2-lng1)*Math.PI)/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function distLabel(m) { return m<1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`; }
function getWA(phone) {
  if (!phone) return null;
  const d = phone.replace(/\D/g,"");
  if (d.length<10||d.length>13) return null;
  return `https://wa.me/${d.startsWith("55")?d:"55"+d}`;
}
function is24h(place) {
  return place.opening_hours?.periods?.some(p => p.open && !p.close) ?? false;
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

function Stars({ rating }) {
  if (!rating) return null;
  return <span style={{color:"#F5A623",fontSize:12}}>
    {"★".repeat(Math.round(rating))}{"☆".repeat(5-Math.round(rating))}
    <span style={{color:"#888",marginLeft:3,fontSize:11}}>{rating.toFixed(1)}</span>
  </span>;
}

// ---- FUEL GAUGE ----
function FuelGauge({ liters, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((liters/capacity)*100)) : 0;
  const color = pct > 50 ? "#00C896" : pct > 25 ? "#F07D1A" : "#E84040";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px 8px",width:"100%"}}>
      <div style={{position:"relative",width:"100%",maxWidth:240}}>
        <svg viewBox="0 0 160 90" width="100%" style={{display:"block"}}>
          <path d="M10 85 A70 70 0 0 1 150 85" fill="none" stroke="#2a2a3a" strokeWidth="12" strokeLinecap="round"/>
          <path d="M10 85 A70 70 0 0 1 150 85" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${(pct/100)*220} 220`}/>
          <text x="80" y="72" textAnchor="middle" fill={color} fontSize="22" fontWeight="800" fontFamily="Inter,sans-serif">{pct}%</text>
          <text x="80" y="84" textAnchor="middle" fill="#666" fontSize="9" fontFamily="Inter,sans-serif">{liters.toFixed(1)}L / {capacity}L</text>
        </svg>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",width:"100%",maxWidth:240,marginTop:2}}>
        <span style={{fontSize:10,color:"#555"}}>Vazio</span>
        <span style={{fontSize:10,color:"#555"}}>Cheio</span>
      </div>
    </div>
  );
}

// ---- MODAL ----
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#1a1a2a",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,margin:"0 auto",padding:"20px 16px calc(env(safe-area-inset-bottom) + 24px)",maxHeight:"78dvh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>{title}</div>
          <button onClick={onClose} style={{background:"#2a2a3a",border:"none",color:"#888",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,color:"#888",marginBottom:5,fontWeight:600}}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",background:"#2a2a3a",border:"1px solid #3a3a4a",borderRadius:10,padding:"10px 12px",color:"#fff",fontSize:14,outline:"none",fontFamily:"'Inter',sans-serif"}}/>
    </div>
  );
}

function Btn({ onClick, children, color="#E8831A", disabled=false, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%",padding:"12px",borderRadius:12,border:"none",
      background: disabled ? "#333" : color,
      color: disabled ? "#666" : "#fff",
      fontSize:14,fontWeight:700,cursor: disabled?"not-allowed":"pointer",
      fontFamily:"'Inter',sans-serif",...style
    }}>{children}</button>
  );
}

// ===================== MAIN APP =====================
export default function App() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  const scrollRef = useRef(null);

  const [activeNav, setActiveNav] = useState("map");
  const [mapsReady, setMapsReady] = useState(false);

  // MAP state
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState({tire:[],gas:[],tow:[]});
  const [activeTab, setActiveTab] = useState("tire");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [locError, setLocError] = useState(null);
  const [search, setSearch] = useState("");
  const [only24h, setOnly24h] = useState(false);

  // PROFILE state
  const [profile, setProfile] = useState({ name:"", moto:"", year:"", kmpl:"", tankL:"", currentKm:"", photoUrl:"" });
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // MAINTENANCE state
  const [manutList, setManutList] = useState([]);
  const [showManutForm, setShowManutForm] = useState(false);
  const [manutForm, setManutForm] = useState({ type:"oil", customLabel:"", product:"", date:new Date().toISOString().slice(0,10), km:"" });

  // FUEL state
  const [fuelList, setFuelList] = useState([]);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelForm, setFuelForm] = useState({ liters:"", pricePerLiter:"", km:"", date:new Date().toISOString().slice(0,10) });
  const [currentFuelLiters, setCurrentFuelLiters] = useState(0);

  // Load Firebase data
  useEffect(() => {
    loadMaps().then(() => setMapsReady(true));
    loadProfile();
    loadManut();
    loadFuel();
  }, []);

  // Firebase: Profile
  async function loadProfile() {
    try {
      const snap = await getDoc(doc(db,"users",USER_ID));
      if (snap.exists()) setProfile(snap.data());
    } catch(e) {}
  }
  async function saveProfile(data) {
    setProfileSaving(true);
    try { await setDoc(doc(db,"users",USER_ID), data); setProfile(data); setProfileForm(null); } catch(e) {}
    setProfileSaving(false);
  }

  // Firebase: Maintenance
  async function loadManut() {
    try {
      const q = query(collection(db,"users",USER_ID,"manut"), orderBy("date","desc"));
      const snap = await getDocs(q);
      setManutList(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) {}
  }
  async function addManut() {
    try {
      await addDoc(collection(db,"users",USER_ID,"manut"), manutForm);
      setShowManutForm(false);
      setManutForm({ type:"oil", customLabel:"", product:"", date:new Date().toISOString().slice(0,10), km:"" });
      loadManut();
    } catch(e) {}
  }
  async function deleteManut(id) {
    try { await deleteDoc(doc(db,"users",USER_ID,"manut",id)); loadManut(); } catch(e) {}
  }

  // Firebase: Fuel
  async function loadFuel() {
    try {
      const q = query(collection(db,"users",USER_ID,"fuel"), orderBy("date","desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d=>({id:d.id,...d.data()}));
      setFuelList(list);
      // Calcular litros atuais: pega o abastecimento mais recente
      if (list.length > 0) setCurrentFuelLiters(parseFloat(list[0].liters)||0);
    } catch(e) {}
  }
  async function addFuel() {
    try {
      await addDoc(collection(db,"users",USER_ID,"fuel"), fuelForm);
      setCurrentFuelLiters(parseFloat(fuelForm.liters)||0);
      setShowFuelForm(false);
      setFuelForm({ liters:"", pricePerLiter:"", km:"", date:new Date().toISOString().slice(0,10) });
      loadFuel();
    } catch(e) {}
  }
  async function deleteFuel(id) {
    try { await deleteDoc(doc(db,"users",USER_ID,"fuel",id)); loadFuel(); } catch(e) {}
  }

  // MAP
  useEffect(() => {
    if (mapsReady && mapRef.current && !mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom:14, center:{lat:-3.7319,lng:-38.5267}, disableDefaultUI:true, zoomControl:true,
        styles:[
          {elementType:"geometry",stylers:[{color:"#1e1e2e"}]},
          {elementType:"labels.text.fill",stylers:[{color:"#aaaaaa"}]},
          {elementType:"labels.text.stroke",stylers:[{color:"#1e1e2e"}]},
          {featureType:"road",elementType:"geometry",stylers:[{color:"#2c2c3e"}]},
          {featureType:"water",elementType:"geometry",stylers:[{color:"#17263c"}]},
          {featureType:"poi",elementType:"geometry",stylers:[{color:"#252535"}]},
        ],
      });
    }
  }, [mapsReady]);

  const clearMarkers = () => {
    markersRef.current.forEach(m=>m.setMap(null)); markersRef.current=[];
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current=null; }
  };

  const placeMarkers = useCallback((lat,lng,allPlaces) => {
    if (!mapInstance.current) return;
    clearMarkers();
    new window.google.maps.Marker({ position:{lat,lng}, map:mapInstance.current, zIndex:10,
      icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:10,fillColor:"#4A90E2",fillOpacity:1,strokeColor:"#fff",strokeWeight:3}});
    circleRef.current = new window.google.maps.Circle({
      strokeColor:"#4A90E2",strokeOpacity:0.3,strokeWeight:1,fillColor:"#4A90E2",fillOpacity:0.08,
      map:mapInstance.current,center:{lat,lng},radius:800});
    CATEGORIES.forEach(cat => {
      (allPlaces[cat.id]||[]).forEach(place => {
        const plat=place.geometry.location.lat(), plng=place.geometry.location.lng();
        const dist=distLabel(getDistance(lat,lng,plat,plng));
        const isOpen=place.opening_hours?.isOpen?.()??null;
        const h24=is24h(place);
        const iw = new window.google.maps.InfoWindow({content:`<div style="background:#2a2a3a;border-radius:8px;padding:8px 10px;color:#fff;font-family:sans-serif;min-width:130px;"><div style="font-weight:700;font-size:13px">${place.name}</div><div style="font-size:11px;color:#aaa;margin-top:2px">${isOpen!==null?(isOpen?"Aberto":"Fechado"):""}${h24?" · 24h":""} · ${dist}</div></div>`});
        const marker = new window.google.maps.Marker({
          position:{lat:plat,lng:plng}, map:mapInstance.current, title:place.name,
          icon:{url:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="${cat.color}"/><circle cx="18" cy="18" r="10" fill="rgba(0,0,0,0.25)"/><text x="18" y="22" text-anchor="middle" font-size="12" fill="white">${cat.id==="tire"?"🔧":cat.id==="gas"?"⛽":"🚛"}</text></svg>`)}`,
            scaledSize:new window.google.maps.Size(32,40),anchor:new window.google.maps.Point(16,40)}});
        marker._placeId=place.place_id;
        marker.addListener("click",()=>iw.open(mapInstance.current,marker));
        markersRef.current.push(marker);
      });
    });
    mapInstance.current.panTo({lat,lng}); mapInstance.current.setZoom(14);
  }, []);

  const fetchPlaces = useCallback(async (lat,lng) => {
    if (!mapsReady) return;
    setLoading(true); setSearched(true); setLocError(null);
    const map = new window.google.maps.Map(document.createElement("div"));
    const service = new window.google.maps.places.PlacesService(map);
    const center = new window.google.maps.LatLng(lat,lng);
    const result={tire:[],gas:[],tow:[]}; let done=0;
    CATEGORIES.forEach(cat => {
      service.nearbySearch({location:center,radius:5000,...(cat.type&&{type:cat.type}),...(cat.keyword&&{keyword:cat.keyword})},(results,status) => {
        const OK=window.google.maps.places.PlacesServiceStatus.OK;
        const items=status===OK&&results?results.slice(0,10):[];
        if (!items.length) { done++; if(done===CATEGORIES.length){placeMarkers(lat,lng,result);setPlaces({...result});setLoading(false);} return; }
        let dd=0;
        items.forEach(place => {
          service.getDetails({placeId:place.place_id,fields:["name","formatted_phone_number","international_phone_number","geometry","vicinity","rating","user_ratings_total","opening_hours","place_id"]},(detail,ds) => {
            result[cat.id].push(ds===OK&&detail?detail:place); dd++;
            if (dd===items.length) {
              result[cat.id].sort((a,b)=>getDistance(lat,lng,a.geometry.location.lat(),a.geometry.location.lng())-getDistance(lat,lng,b.geometry.location.lat(),b.geometry.location.lng()));
              done++; if(done===CATEGORIES.length){placeMarkers(lat,lng,result);setPlaces({...result});setLoading(false);}
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
      pos => { const loc={lat:pos.coords.latitude,lng:pos.coords.longitude}; setLocation(loc); fetchPlaces(loc.lat,loc.lng); },
      () => setLocError("Permissão negada. Verifique as configurações.")
    );
  };

  const handleCardClick = (place) => {
    const marker = markersRef.current.find(m=>m._placeId===place.place_id);
    if (marker&&mapInstance.current) {
      mapInstance.current.panTo(marker.getPosition()); mapInstance.current.setZoom(17);
      window.google.maps.event.trigger(marker,"click");
      if (scrollRef.current) scrollRef.current.scrollTo({top:0,behavior:"smooth"});
    }
  };

  const activeCat = CATEGORIES.find(c=>c.id===activeTab);
  const activePlaces = (places[activeTab]||[]).filter(p => {
    const ms = !search||p.name.toLowerCase().includes(search.toLowerCase());
    const m24 = !only24h||is24h(p);
    return ms&&m24;
  });

  // Manutenção: calcular alertas
  const getManutAlert = (item) => {
    const typeDef = MANUT_TYPES.find(t=>t.id===item.type);
    if (!typeDef?.kmAlert || !item.km || !profile.currentKm) return null;
    const nextKm = parseInt(item.km) + typeDef.kmAlert;
    const diff = nextKm - parseInt(profile.currentKm);
    return { nextKm, diff };
  };

  const tankCapacity = parseFloat(profile.tankL)||0;

  // ======================== RENDER ========================
  const renderMap = () => (
    <div ref={scrollRef} style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingBottom:80,WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"16px 16px 12px"}}>
        <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:12}}>
          Olá, {profile.name||"Victor"}!
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,background:"#2a2a3a",borderRadius:12,padding:"10px 14px"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar locais..."
            style={{background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:14,flex:1,fontFamily:"'Inter',sans-serif"}}/>
        </div>
      </div>

      <div style={{padding:"0 16px 12px",display:"flex",gap:8,overflowX:"auto"}}>
        {CATEGORIES.map(cat => {
          const active=activeTab===cat.id;
          return <button key={cat.id} onClick={()=>{setActiveTab(cat.id);setOnly24h(false);}} style={{
            display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:99,border:"none",cursor:"pointer",
            background:active?cat.color:"#2a2a3a",color:active?"#fff":"#888",
            fontSize:13,fontWeight:600,fontFamily:"'Inter',sans-serif",
            boxShadow:active?`0 4px 12px ${cat.color}55`:"none",whiteSpace:"nowrap",flexShrink:0,
            WebkitTapHighlightColor:"transparent"}}>
            <span style={{fontSize:14}}>{cat.icon}</span>{cat.label}
          </button>;
        })}
      </div>

      <div style={{position:"relative",height:240,flexShrink:0}}>
        <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
        {locError && <div style={{position:"absolute",top:10,left:12,right:12,background:"rgba(232,64,64,0.9)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#fff",fontWeight:500}}>{locError}</div>}
        <button onClick={handleGPS} disabled={loading} style={{position:"absolute",bottom:12,right:12,display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:99,border:"none",background:"#1a1a2a",color:loading?"#888":"#4A90E2",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif",cursor:loading?"not-allowed":"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.6)",WebkitTapHighlightColor:"transparent"}}>
          {loading ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 0.8s linear infinite"}}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>}
          GPS
        </button>
      </div>

      <div style={{padding:"16px 16px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Serviços Próximos</div>
          {searched&&!loading&&<div style={{fontSize:12,color:"#555",marginTop:2}}>{activePlaces.length} resultado{activePlaces.length!==1?"s":""}{only24h?" · apenas 24h":""}</div>}
        </div>
        {searched&&!loading&&<button onClick={()=>setOnly24h(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:99,border:"1.5px solid",borderColor:only24h?"#00C896":"#3a3a4a",background:only24h?"rgba(0,200,150,0.12)":"transparent",color:only24h?"#00C896":"#666",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",WebkitTapHighlightColor:"transparent"}}>
          <span style={{fontSize:13}}>🕐</span> Apenas 24h
        </button>}
      </div>

      <div style={{padding:"12px 16px 0"}}>
        {!searched&&!loading&&<div style={{background:"#2a2a3a",borderRadius:16,padding:"28px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginBottom:12}}>
          <span style={{fontSize:36}}>📍</span>
          <div style={{fontSize:14,color:"#888",textAlign:"center",lineHeight:1.6}}>Toque em <strong style={{color:"#4A90E2"}}>GPS</strong> para encontrar serviços próximos</div>
        </div>}

        {loading&&[1,2,3].map(i=><div key={i} style={{background:"#2a2a3a",borderRadius:16,padding:16,marginBottom:12,opacity:0.5}}>
          <div style={{height:14,background:"#3a3a4a",borderRadius:6,marginBottom:10,width:"60%"}}/>
          <div style={{height:10,background:"#3a3a4a",borderRadius:6,marginBottom:8,width:"40%"}}/>
          <div style={{height:36,background:"#3a3a4a",borderRadius:10,marginTop:16}}/>
        </div>)}

        {!loading&&searched&&activePlaces.length===0&&<div style={{background:"#2a2a3a",borderRadius:16,padding:"28px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <span style={{fontSize:32}}>🔍</span>
          <div style={{fontSize:14,color:"#888",textAlign:"center"}}>{only24h?"Nenhum serviço 24h encontrado.":"Nenhum resultado."}</div>
        </div>}

        {!loading&&activePlaces.map((place,i) => {
          const dist=location?distLabel(getDistance(location.lat,location.lng,place.geometry.location.lat(),place.geometry.location.lng())):null;
          const phone=place.formatted_phone_number||place.international_phone_number;
          const waUrl=getWA(phone);
          const isOpen=place.opening_hours?.isOpen?.()??null;
          const h24=is24h(place);
          const mapsUrl=`https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}`;
          return <div key={place.place_id||i} style={{background:"#2a2a3a",borderRadius:16,padding:16,marginBottom:12,border:`1px solid ${h24?"rgba(0,200,150,0.25)":"#3a3a4a"}`,animation:`fadeUp 0.3s ease ${i*0.04}s both`,position:"relative",overflow:"hidden"}}>
            {h24&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:"#00C896",borderRadius:"16px 0 0 16px"}}/>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div onClick={()=>handleCardClick(place)} style={{fontSize:15,fontWeight:700,color:"#fff",lineHeight:1.3,flex:1,paddingRight:10,cursor:"pointer",borderBottom:"1px dashed rgba(255,255,255,0.2)",paddingBottom:2}}>{place.name}</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                {dist&&<span style={{fontSize:12,fontWeight:700,color:activeCat?.color,background:`${activeCat?.color}22`,padding:"3px 9px",borderRadius:99,whiteSpace:"nowrap"}}>{dist}</span>}
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  {h24&&<span style={{fontSize:10,fontWeight:800,color:"#00C896",background:"rgba(0,200,150,0.12)",padding:"2px 7px",borderRadius:99,border:"1px solid rgba(0,200,150,0.3)"}}>24H</span>}
                  {isOpen!==null&&<span style={{fontSize:11,color:isOpen?"#4CAF50":"#E84040",fontWeight:600,whiteSpace:"nowrap"}}>{isOpen?"● Aberto":"● Fechado"}</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Stars rating={place.rating}/>{place.user_ratings_total&&<span style={{fontSize:11,color:"#666"}}>{place.user_ratings_total} avaliações</span>}</div>
            {place.vicinity&&<div style={{fontSize:12,color:"#666",marginBottom:6,display:"flex",gap:5,alignItems:"flex-start",lineHeight:1.5}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" style={{marginTop:1,flexShrink:0}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{place.vicinity}</div>}
            {phone&&<div style={{fontSize:12,color:"#888",marginBottom:12,display:"flex",gap:5,alignItems:"center"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.1z"/></svg>{phone}</div>}
            <div style={{display:"flex",gap:8}}>
              {phone&&<a href={waUrl||`tel:${phone}`} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 0",borderRadius:10,background:waUrl?"rgba(37,211,102,0.12)":"#3a3a4a",color:waUrl?"#25D366":"#ccc",border:waUrl?"1px solid rgba(37,211,102,0.25)":"none",textDecoration:"none",fontSize:13,fontWeight:600}}>
                {waUrl?<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.1z"/></svg>}
                {waUrl?"WhatsApp":"Ligar"}
              </a>}
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{flex:phone?1.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 0",borderRadius:10,background:activeCat?.color,color:"#fff",textDecoration:"none",fontSize:13,fontWeight:600}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Traçar Rota
              </a>
            </div>
          </div>;
        })}
        <div style={{height:16}}/>
      </div>
    </div>
  );

  // ---- ABASTECIMENTO ----
  const renderFuel = () => (
    <div style={{flex:1,overflowY:"auto",padding:"20px 16px 80px",WebkitOverflowScrolling:"touch"}}>
      <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:4}}>⛽ Abastecimento</div>
      <div style={{fontSize:13,color:"#555",marginBottom:20}}>Controle o combustível da sua moto</div>

      {tankCapacity > 0 ? (
        <div style={{background:"#2a2a3a",borderRadius:16,marginBottom:16,border:"1px solid #3a3a4a"}}>
          <FuelGauge liters={currentFuelLiters} capacity={tankCapacity}/>
          <div style={{padding:"0 16px 16px",textAlign:"center",fontSize:12,color:"#666"}}>
            Último abastecimento: {fuelList[0]?.date||"—"}
          </div>
        </div>
      ) : (
        <div style={{background:"rgba(232,131,26,0.1)",border:"1px solid rgba(232,131,26,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:13,color:"#E8831A"}}>
          ⚠️ Configure a capacidade do tanque no seu Perfil para ver o gauge
        </div>
      )}

      <Btn onClick={()=>setShowFuelForm(true)}>+ Registrar Abastecimento</Btn>

      {fuelList.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:12}}>Histórico</div>
          {fuelList.map(f => {
            const total = (parseFloat(f.liters)||0)*(parseFloat(f.pricePerLiter)||0);
            return <div key={f.id} style={{background:"#2a2a3a",borderRadius:14,padding:"14px",marginBottom:10,border:"1px solid #3a3a4a"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>⛽ {parseFloat(f.liters).toFixed(1)}L</div>
                  <div style={{fontSize:11,color:"#666",marginTop:2}}>{f.date}{f.km?` · ${f.km} km`:""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#F07D1A"}}>R$ {total.toFixed(2)}</div>
                  <div style={{fontSize:11,color:"#666"}}>R$ {parseFloat(f.pricePerLiter||0).toFixed(2)}/L</div>
                </div>
              </div>
              <button onClick={()=>deleteFuel(f.id)} style={{background:"rgba(232,64,64,0.1)",border:"none",color:"#E84040",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>🗑 Remover</button>
            </div>;
          })}
        </div>
      )}

      {showFuelForm && <Modal title="Registrar Abastecimento" onClose={()=>setShowFuelForm(false)}>
        <Input label="Litros abastecidos" value={fuelForm.liters} onChange={v=>setFuelForm(f=>({...f,liters:v}))} type="number" placeholder="Ex: 12.5"/>
        <Input label="Preço por litro (R$)" value={fuelForm.pricePerLiter} onChange={v=>setFuelForm(f=>({...f,pricePerLiter:v}))} type="number" placeholder="Ex: 6.49"/>
        <Input label="Quilometragem atual" value={fuelForm.km} onChange={v=>setFuelForm(f=>({...f,km:v}))} type="number" placeholder="Ex: 15230"/>
        <Input label="Data" value={fuelForm.date} onChange={v=>setFuelForm(f=>({...f,date:v}))} type="date"/>
        {fuelForm.liters&&fuelForm.pricePerLiter&&<div style={{background:"rgba(240,125,26,0.1)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:13,color:"#F07D1A",fontWeight:600}}>
          Total: R$ {((parseFloat(fuelForm.liters)||0)*(parseFloat(fuelForm.pricePerLiter)||0)).toFixed(2)}
          {tankCapacity>0&&` · Tanque: ${Math.min(100,Math.round((parseFloat(fuelForm.liters)/tankCapacity)*100))}%`}
        </div>}
        <Btn onClick={addFuel} disabled={!fuelForm.liters||!fuelForm.pricePerLiter}>Salvar Abastecimento</Btn>
      </Modal>}
    </div>
  );

  // ---- MANUTENÇÃO ----
  const renderManut = () => (
    <div style={{flex:1,overflowY:"auto",padding:"20px 16px 80px",WebkitOverflowScrolling:"touch"}}>
      <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:4}}>🔧 Manutenção</div>
      <div style={{fontSize:13,color:"#555",marginBottom:20}}>Histórico e alertas da sua moto</div>

      {!profile.currentKm&&<div style={{background:"rgba(232,131,26,0.1)",border:"1px solid rgba(232,131,26,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:13,color:"#E8831A"}}>
        ⚠️ Configure a quilometragem atual no Perfil para ver alertas de troca
      </div>}

      <Btn onClick={()=>setShowManutForm(true)}>+ Registrar Manutenção</Btn>

      {manutList.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:12}}>Histórico</div>
          {manutList.map(item => {
            const typeDef = MANUT_TYPES.find(t=>t.id===item.type);
            const label = item.type==="other" ? item.customLabel : typeDef?.label;
            const alert = getManutAlert(item);
            const alertColor = alert ? (alert.diff<=0?"#E84040":alert.diff<=500?"#F07D1A":"#00C896") : null;
            return <div key={item.id} style={{background:"#2a2a3a",borderRadius:14,padding:14,marginBottom:10,border:`1px solid ${alert&&alert.diff<=500?"rgba(240,125,26,0.4)":"#3a3a4a"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{typeDef?.icon} {label}</div>
                  <div style={{fontSize:11,color:"#666",marginTop:2}}>{item.date}{item.km?` · ${item.km} km`:""}</div>
                  {item.product&&<div style={{fontSize:12,color:"#888",marginTop:2}}>Produto: {item.product}</div>}
                </div>
                {alert&&<div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,fontWeight:700,color:alertColor,background:`${alertColor}18`,padding:"3px 8px",borderRadius:99,whiteSpace:"nowrap"}}>
                    {alert.diff<=0?"VENCIDA":alert.diff<=500?`${alert.diff} km restantes`:`Próx: ${alert.nextKm} km`}
                  </div>
                </div>}
              </div>
              <button onClick={()=>deleteManut(item.id)} style={{background:"rgba(232,64,64,0.1)",border:"none",color:"#E84040",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>🗑 Remover</button>
            </div>;
          })}
        </div>
      )}

      {showManutForm && <Modal title="Registrar Manutenção" onClose={()=>setShowManutForm(false)}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#888",marginBottom:8,fontWeight:600}}>Tipo de Manutenção</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {MANUT_TYPES.map(t=><button key={t.id} onClick={()=>setManutForm(f=>({...f,type:t.id}))} style={{padding:"7px 12px",borderRadius:99,border:"1.5px solid",borderColor:manutForm.type===t.id?"#E8831A":"#3a3a4a",background:manutForm.type===t.id?"rgba(232,131,26,0.15)":"transparent",color:manutForm.type===t.id?"#E8831A":"#888",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
              {t.icon} {t.label}
            </button>)}
          </div>
        </div>
        {manutForm.type==="other"&&<Input label="Descrição" value={manutForm.customLabel} onChange={v=>setManutForm(f=>({...f,customLabel:v}))} placeholder="Ex: Limpeza do carburador"/>}
        <Input label="Produto/Marca utilizado" value={manutForm.product} onChange={v=>setManutForm(f=>({...f,product:v}))} placeholder="Ex: Motul 10W-30"/>
        <Input label="Quilometragem na troca" value={manutForm.km} onChange={v=>setManutForm(f=>({...f,km:v}))} type="number" placeholder="Ex: 15230"/>
        <Input label="Data" value={manutForm.date} onChange={v=>setManutForm(f=>({...f,date:v}))} type="date"/>
        {manutForm.type!=="other"&&MANUT_TYPES.find(t=>t.id===manutForm.type)?.kmAlert&&<div style={{background:"rgba(0,200,150,0.08)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#00C896"}}>
          ℹ️ Próxima troca sugerida em {MANUT_TYPES.find(t=>t.id===manutForm.type)?.kmAlert} km
        </div>}
        <Btn onClick={addManut} disabled={manutForm.type==="other"&&!manutForm.customLabel}>Salvar Manutenção</Btn>
      </Modal>}
    </div>
  );

  // ---- PERFIL ----
  const renderProfile = () => {
    const form = profileForm || profile;
    const editing = !!profileForm;
    return (
      <div style={{flex:1,overflowY:"auto",padding:"20px 16px 80px",WebkitOverflowScrolling:"touch"}}>
        <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:20}}>👤 Meu Perfil</div>

        {/* Avatar */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24}}>
          <div style={{width:90,height:90,borderRadius:"50%",background:"#2a2a3a",border:"3px solid #E8831A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,marginBottom:10,overflow:"hidden"}}>
            {profile.photoUrl ? <img src={profile.photoUrl} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "👤"}
          </div>
          <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>{profile.name||"Sem nome"}</div>
          <div style={{fontSize:13,color:"#888"}}>{profile.moto||"Moto não cadastrada"}{profile.year?` · ${profile.year}`:""}</div>
        </div>

        {/* Stats */}
        {(profile.kmpl||profile.tankL||profile.currentKm)&&<div style={{display:"flex",gap:10,marginBottom:20}}>
          {profile.currentKm&&<div style={{flex:1,background:"#2a2a3a",borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#E8831A"}}>{parseInt(profile.currentKm).toLocaleString()}</div>
            <div style={{fontSize:10,color:"#666",marginTop:2}}>km atual</div>
          </div>}
          {profile.kmpl&&<div style={{flex:1,background:"#2a2a3a",borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#00C896"}}>{profile.kmpl}</div>
            <div style={{fontSize:10,color:"#666",marginTop:2}}>km/litro</div>
          </div>}
          {profile.tankL&&<div style={{flex:1,background:"#2a2a3a",borderRadius:14,padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#4A90E2"}}>{profile.tankL}L</div>
            <div style={{fontSize:10,color:"#666",marginTop:2}}>tanque</div>
          </div>}
        </div>}

        {!editing ? (
          <Btn onClick={()=>setProfileForm({...profile})}>✏️ Editar Perfil</Btn>
        ) : (
          <div style={{background:"#2a2a3a",borderRadius:16,padding:16,border:"1px solid #3a3a4a"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:16}}>Editar informações</div>
            <Input label="Seu nome" value={form.name} onChange={v=>setProfileForm(f=>({...f,name:v}))} placeholder="Ex: Victor"/>
            <Input label="URL da foto (opcional)" value={form.photoUrl} onChange={v=>setProfileForm(f=>({...f,photoUrl:v}))} placeholder="https://..."/>
            <Input label="Modelo da moto" value={form.moto} onChange={v=>setProfileForm(f=>({...f,moto:v}))} placeholder="Ex: Yamaha Crosser ZTX"/>
            <Input label="Ano" value={form.year} onChange={v=>setProfileForm(f=>({...f,year:v}))} type="number" placeholder="Ex: 2019"/>
            <Input label="Consumo (km/litro)" value={form.kmpl} onChange={v=>setProfileForm(f=>({...f,kmpl:v}))} type="number" placeholder="Ex: 30"/>
            <Input label="Capacidade do tanque (litros)" value={form.tankL} onChange={v=>setProfileForm(f=>({...f,tankL:v}))} type="number" placeholder="Ex: 14"/>
            <Input label="Quilometragem atual" value={form.currentKm} onChange={v=>setProfileForm(f=>({...f,currentKm:v}))} type="number" placeholder="Ex: 15230"/>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn onClick={()=>setProfileForm(null)} color="#2a2a3a" style={{flex:1}}>Cancelar</Btn>
              <Btn onClick={()=>saveProfile(profileForm)} disabled={profileSaving} style={{flex:2}}>{profileSaving?"Salvando...":"Salvar"}</Btn>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{height:100%;}
        body{background:#1a1a2a;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;height:100%;overscroll-behavior-y:none;}
        #root{height:100%;}
        .gm-style-iw{background:transparent!important;box-shadow:none!important;padding:0!important;}
        .gm-style-iw-d{overflow:visible!important;}
        .gm-style-iw-t::after{display:none!important;}
        .gm-ui-hover-effect{display:none!important;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        input::placeholder{color:#555;}
        input[type=date]{color-scheme:dark;}
      `}</style>

      <div style={{width:"100%",maxWidth:480,margin:"0 auto",height:"100dvh",background:"#1a1a2a",display:"flex",flexDirection:"column",fontFamily:"'Inter',sans-serif",position:"relative"}}>

        {/* TOP BAR */}
        <div style={{background:"#E8831A",padding:"48px 16px 12px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>🏍️</span>
              <span style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:-0.5}}>Mi<span style={{color:"#1a1a2a"}}>Moto</span></span>
            </div>
            <div onClick={()=>setActiveNav("profile")} style={{width:36,height:36,borderRadius:"50%",background:"rgba(0,0,0,0.2)",border:"2px solid rgba(255,255,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",overflow:"hidden"}}>
              {profile.photoUrl?<img src={profile.photoUrl} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        {activeNav==="map" && renderMap()}
        {activeNav==="fuel" && renderFuel()}
        {activeNav==="maint" && renderManut()}
        {activeNav==="profile" && renderProfile()}

        {/* BOTTOM NAV */}
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#111118",borderTop:"1px solid #2a2a3a",padding:"10px 0 28px",display:"flex",zIndex:100}}>
          {[
            {id:"map",label:"Mapa",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>},
            {id:"fuel",label:"Abastecimento",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22V8l9-6 9 6v14"/><path d="M9 22V12h6v10"/></svg>},
            {id:"maint",label:"Manutenção",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>},
            {id:"profile",label:"Perfil",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
          ].map(item => {
            const active=activeNav===item.id;
            return <button key={item.id} onClick={()=>setActiveNav(item.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"transparent",border:"none",cursor:"pointer",color:active?"#E8831A":"#555",fontFamily:"'Inter',sans-serif",WebkitTapHighlightColor:"transparent"}}>
              {item.icon}
              <span style={{fontSize:10,fontWeight:active?700:500}}>{item.label}</span>
            </button>;
          })}
        </div>
      </div>
    </>
  );
}
