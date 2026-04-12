import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, orderBy, query } from "firebase/firestore";

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

// Brand colors
const C = {
  navy:    "#1B2D5B",
  navyDark:"#0F1E3E",
  navyMid: "#243870",
  navyLight:"#2E4A8A",
  accent:  "#4A7FD4",
  accentLight:"#6B9CE8",
  white:   "#FFFFFF",
  offWhite:"#F4F6FA",
  surface: "#EDF0F7",
  border:  "rgba(27,45,91,0.12)",
  borderStrong:"rgba(27,45,91,0.25)",
  text:    "#1B2D5B",
  textMid: "#5A6E99",
  textLight:"#9AAABF",
  red:     "#E84040",
  green:   "#1DB069",
  orange:  "#F07D1A",
};

const GOOGLE_MAPS_API_KEY = "AIzaSyAWK94SwutfM0M6dxukmrUTQCfg4a83ltE";
const CATEGORIES = [
  { id:"tire", label:"Borracharias", icon:"🔧", type:"car_repair",  keyword:"borracharia",    color:C.red },
  { id:"gas",  label:"Postos",       icon:"⛽", type:"gas_station", keyword:null,             color:C.orange },
  { id:"tow",  label:"Reboques",     icon:"🚛", type:null,          keyword:"reboque 24h",    color:C.accent },
];
const MANUT_TYPES = [
  { id:"oil",    label:"Troca de Óleo",   icon:"🛢️", kmAlert:3000 },
  { id:"filter", label:"Filtro de Ar",    icon:"🌬️", kmAlert:6000 },
  { id:"tire",   label:"Pneu",            icon:"⚫", kmAlert:15000 },
  { id:"chain",  label:"Corrente",        icon:"⛓️", kmAlert:5000 },
  { id:"brake",  label:"Freio",           icon:"🔴", kmAlert:8000 },
  { id:"spark",  label:"Vela de Ignição", icon:"⚡", kmAlert:8000 },
  { id:"other",  label:"Outro",           icon:"🔧", kmAlert:null },
];

function getDistance(lat1,lng1,lat2,lng2){const R=6371000,dLat=((lat2-lat1)*Math.PI)/180,dLng=((lng2-lng1)*Math.PI)/180,a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function distLabel(m){return m<1000?`${Math.round(m)}m`:`${(m/1000).toFixed(1)}km`;}
function getWA(phone){if(!phone)return null;const d=phone.replace(/\D/g,"");if(d.length<10||d.length>13)return null;return`https://wa.me/${d.startsWith("55")?d:"55"+d}`;}
function is24h(place){return place.opening_hours?.periods?.some(p=>p.open&&!p.close)??false;}
function loadMaps(){return new Promise(resolve=>{if(window.google?.maps?.places)return resolve();const s=document.createElement("script");s.src=`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;s.onload=resolve;document.head.appendChild(s);});}

// ---- LOGO SVG ----
function Logo({ size=28, light=false }) {
  const color = light ? C.white : C.navy;
  return (
    <svg width={size*1.1} height={size} viewBox="0 0 44 40" fill="none">
      <path d="M22 2L6 9v12c0 8 7 15 16 17 9-2 16-9 16-17V9L22 2z" stroke={color} strokeWidth="2.2" fill="none"/>
      <path d="M14 24c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="22" cy="24" r="2.5" fill={color}/>
      <path d="M16 20l-2-4h4l1.5 2.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M28 20l2-4h-3l-1.5 2.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M19 14l3-4 3 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Stars({ rating }) {
  if (!rating) return null;
  return <span style={{color:"#F5A623",fontSize:12}}>
    {"★".repeat(Math.round(rating))}{"☆".repeat(5-Math.round(rating))}
    <span style={{color:C.textLight,marginLeft:3,fontSize:11}}>{rating.toFixed(1)}</span>
  </span>;
}

function FuelGauge({ liters, capacity, reserveL=3, kmpl=36 }) {
  const pct = capacity>0 ? Math.min(100,Math.round((liters/capacity)*100)) : 0;
  const reservePct = capacity>0 ? Math.round((reserveL/capacity)*100) : 25;
  const inReserve = pct<=reservePct;
  const color = pct>reservePct*2 ? C.green : pct>reservePct ? C.orange : C.red;
  const kmLeft = Math.round(liters*kmpl);
  const arcLen = 220;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px 8px",width:"100%"}}>
      <div style={{width:"100%",maxWidth:260}}>
        <svg viewBox="0 0 160 95" width="100%" style={{display:"block"}}>
          <path d="M10 85 A70 70 0 0 1 150 85" fill="none" stroke={C.surface} strokeWidth="14" strokeLinecap="round"/>
          <path d="M10 85 A70 70 0 0 1 150 85" fill="none" stroke="rgba(232,64,64,0.15)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${(reservePct/100)*arcLen} ${arcLen}`}/>
          <path d="M10 85 A70 70 0 0 1 150 85" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${(pct/100)*arcLen} ${arcLen}`}/>
          <text x="80" y="68" textAnchor="middle" fill={color} fontSize="24" fontWeight="800" fontFamily="Outfit,sans-serif">{pct}%</text>
          <text x="80" y="80" textAnchor="middle" fill={C.textLight} fontSize="9" fontFamily="Outfit,sans-serif">{liters.toFixed(1)}L / {capacity}L</text>
        </svg>
      </div>
      <div style={{display:"flex",gap:8,width:"100%",maxWidth:260,marginTop:4}}>
        <div style={{flex:1,background:C.surface,borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:800,color:inReserve?C.red:C.navy}}>{kmLeft} km</div>
          <div style={{fontSize:9,color:C.textLight,marginTop:1}}>autonomia est.</div>
        </div>
        <div style={{flex:1,background:C.surface,borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:800,color:inReserve?C.red:C.green}}>{inReserve?"RESERVA":"OK"}</div>
          <div style={{fontSize:9,color:C.textLight,marginTop:1}}>reserva: {reserveL}L</div>
        </div>
      </div>
      {inReserve&&<div style={{marginTop:8,background:"rgba(232,64,64,0.08)",border:`1px solid rgba(232,64,64,0.25)`,borderRadius:10,padding:"8px 12px",fontSize:12,color:C.red,fontWeight:600,textAlign:"center",width:"100%",maxWidth:260}}>
        ⚠️ No reserva! Abasteça em breve
      </div>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(11,19,38,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:C.white,borderRadius:20,width:"100%",maxWidth:440,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(11,19,38,0.4)"}}>
        <div style={{padding:"18px 18px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:17,fontWeight:700,color:C.navy}}>{title}</div>
            <button onClick={onClose} style={{background:C.surface,border:"none",color:C.textMid,borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"0 18px 24px",WebkitOverflowScrolling:"touch",flex:1}}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,color:C.textMid,marginBottom:5,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase"}}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",background:C.offWhite,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 12px",color:C.navy,fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif"}}/>
    </div>
  );
}

function Btn({ onClick, children, variant="primary", disabled=false, style={} }) {
  const styles = {
    primary: { background:C.navy, color:C.white },
    secondary: { background:C.surface, color:C.navy },
    danger: { background:"rgba(232,64,64,0.08)", color:C.red, border:`1px solid rgba(232,64,64,0.2)` },
    success: { background:"rgba(29,176,105,0.1)", color:C.green, border:`1px solid rgba(29,176,105,0.25)` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%",padding:"13px",borderRadius:12,border:"none",
      ...styles[variant],
      opacity:disabled?0.4:1,
      fontSize:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",
      fontFamily:"'Outfit',sans-serif",...style
    }}>{children}</button>
  );
}

function Badge({ children, color=C.navy, bg="rgba(27,45,91,0.08)" }) {
  return <span style={{fontSize:10,fontWeight:700,color,background:bg,padding:"2px 8px",borderRadius:99,whiteSpace:"nowrap"}}>{children}</span>;
}

export default function App() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  const scrollRef = useRef(null);

  const [activeNav, setActiveNav] = useState("map");
  const [mapsReady, setMapsReady] = useState(false);

  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState({tire:[],gas:[],tow:[]});
  const [activeTab, setActiveTab] = useState("tire");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [locError, setLocError] = useState(null);
  const [search, setSearch] = useState("");
  const [only24h, setOnly24h] = useState(false);

  const [profile, setProfile] = useState({name:"Victor",moto:"Yamaha Crosser ZTX",year:"2019",kmpl:"36",tankL:"12",reserveL:"3",currentKm:"77903",photoUrl:""});
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [manutList, setManutList] = useState([]);
  const [showManutForm, setShowManutForm] = useState(false);
  const [manutForm, setManutForm] = useState({type:"oil",customLabel:"",product:"",date:new Date().toISOString().slice(0,10),km:""});

  const [fuelList, setFuelList] = useState([]);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelForm, setFuelForm] = useState({liters:"",pricePerLiter:"",km:"",date:new Date().toISOString().slice(0,10),tankFull:false});
  const [currentFuelLiters, setCurrentFuelLiters] = useState(0);

  useEffect(() => { loadMaps().then(()=>setMapsReady(true)); loadProfile(); loadManut(); loadFuel(); }, []);

  async function loadProfile() {
    try {
      const snap = await getDoc(doc(db,"users",USER_ID));
      const defaults = {name:"Victor",moto:"Yamaha Crosser ZTX",year:"2019",kmpl:"36",tankL:"12",reserveL:"3",currentKm:"77903",photoUrl:""};
      if (snap.exists()) setProfile({...defaults,...snap.data()});
      else await setDoc(doc(db,"users",USER_ID),defaults);
    } catch(e) {}
  }
  async function saveProfile(data) {
    setProfileSaving(true);
    try { await setDoc(doc(db,"users",USER_ID),data); setProfile(data); setProfileForm(null); } catch(e) {}
    setProfileSaving(false);
  }
  async function loadManut() {
    try {
      const snap = await getDocs(query(collection(db,"users",USER_ID,"manut"),orderBy("date","desc")));
      setManutList(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) {}
  }
  async function addManut() {
    try { await addDoc(collection(db,"users",USER_ID,"manut"),manutForm); setShowManutForm(false); setManutForm({type:"oil",customLabel:"",product:"",date:new Date().toISOString().slice(0,10),km:""}); loadManut(); } catch(e) {}
  }
  async function deleteManut(id) { try { await deleteDoc(doc(db,"users",USER_ID,"manut",id)); loadManut(); } catch(e) {} }
  async function loadFuel() {
    try {
      const snap = await getDocs(query(collection(db,"users",USER_ID,"fuel"),orderBy("date","desc")));
      const list = snap.docs.map(d=>({id:d.id,...d.data()}));
      setFuelList(list);
      if (list.length>0) { const last=list[0]; setCurrentFuelLiters(last.tankFull?(parseFloat(profile.tankL)||12):parseFloat(last.liters)||0); }
    } catch(e) {}
  }
  async function addFuel() {
    try {
      await addDoc(collection(db,"users",USER_ID,"fuel"),fuelForm);
      setCurrentFuelLiters(fuelForm.tankFull?(parseFloat(profile.tankL)||12):parseFloat(fuelForm.liters)||0);
      setShowFuelForm(false);
      setFuelForm({liters:"",pricePerLiter:"",km:"",date:new Date().toISOString().slice(0,10),tankFull:false});
      loadFuel();
    } catch(e) {}
  }
  async function deleteFuel(id) { try { await deleteDoc(doc(db,"users",USER_ID,"fuel",id)); loadFuel(); } catch(e) {} }

  useEffect(() => {
    if (mapsReady&&mapRef.current&&!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom:14, center:{lat:-3.7319,lng:-38.5267}, disableDefaultUI:true, zoomControl:true,
        styles:[
          {elementType:"geometry",stylers:[{color:"#E8EDF5"}]},
          {elementType:"labels.text.fill",stylers:[{color:"#4A6080"}]},
          {elementType:"labels.text.stroke",stylers:[{color:"#E8EDF5"}]},
          {featureType:"road",elementType:"geometry",stylers:[{color:"#FFFFFF"}]},
          {featureType:"road.arterial",elementType:"geometry",stylers:[{color:"#F0F3FA"}]},
          {featureType:"road.highway",elementType:"geometry",stylers:[{color:"#D0DBF0"}]},
          {featureType:"water",elementType:"geometry",stylers:[{color:"#B8CFEA"}]},
          {featureType:"poi",elementType:"geometry",stylers:[{color:"#DDE4F0"}]},
          {featureType:"poi",elementType:"labels",stylers:[{visibility:"off"}]},
          {featureType:"transit",elementType:"geometry",stylers:[{color:"#E0E8F5"}]},
        ],
      });
    }
  }, [mapsReady]);

  // Quando voltar para o mapa, forçar resize para o Google Maps reajustar
  useEffect(() => {
    if (activeNav === "map" && mapInstance.current) {
      setTimeout(() => {
        window.google?.maps?.event?.trigger(mapInstance.current, "resize");
      }, 50);
    }
  }, [activeNav]);

  const clearMarkers = () => { markersRef.current.forEach(m=>m.setMap(null)); markersRef.current=[]; if(circleRef.current){circleRef.current.setMap(null);circleRef.current=null;} };

  const placeMarkers = useCallback((lat,lng,allPlaces) => {
    if (!mapInstance.current) return;
    clearMarkers();
    new window.google.maps.Marker({position:{lat,lng},map:mapInstance.current,zIndex:10,
      icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:10,fillColor:C.navy,fillOpacity:1,strokeColor:C.white,strokeWeight:3}});
    circleRef.current = new window.google.maps.Circle({strokeColor:C.navy,strokeOpacity:0.2,strokeWeight:1,fillColor:C.navy,fillOpacity:0.05,map:mapInstance.current,center:{lat,lng},radius:800});
    CATEGORIES.forEach(cat=>{
      (allPlaces[cat.id]||[]).forEach(place=>{
        const plat=place.geometry.location.lat(),plng=place.geometry.location.lng();
        const dist=distLabel(getDistance(lat,lng,plat,plng));
        const isOpen=place.opening_hours?.isOpen?.()??null;
        const h24=is24h(place);
        const iw=new window.google.maps.InfoWindow({content:`<div style="background:${C.navy};border-radius:10px;padding:10px 12px;color:#fff;font-family:Outfit,sans-serif;min-width:140px;box-shadow:0 4px 16px rgba(0,0,0,0.2)"><div style="font-weight:700;font-size:13px">${place.name}</div><div style="font-size:11px;opacity:0.7;margin-top:3px">${isOpen!==null?(isOpen?"● Aberto":"● Fechado"):""}${h24?" · 24h":""} · ${dist}</div></div>`});
        const marker=new window.google.maps.Marker({position:{lat:plat,lng:plng},map:mapInstance.current,title:place.name,
          icon:{url:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="${cat.color}"/><circle cx="18" cy="18" r="11" fill="rgba(255,255,255,0.2)"/><text x="18" y="23" text-anchor="middle" font-size="13" fill="white">${cat.id==="tire"?"🔧":cat.id==="gas"?"⛽":"🚛"}</text></svg>`)}`,
            scaledSize:new window.google.maps.Size(32,40),anchor:new window.google.maps.Point(16,40)}});
        marker._placeId=place.place_id;
        marker.addListener("click",()=>iw.open(mapInstance.current,marker));
        markersRef.current.push(marker);
      });
    });
    mapInstance.current.panTo({lat,lng}); mapInstance.current.setZoom(14);
  },[]);

  const fetchPlaces = useCallback(async(lat,lng)=>{
    if(!mapsReady)return;
    setLoading(true);setSearched(true);setLocError(null);
    const map=new window.google.maps.Map(document.createElement("div"));
    const service=new window.google.maps.places.PlacesService(map);
    const center=new window.google.maps.LatLng(lat,lng);
    const result={tire:[],gas:[],tow:[]};let done=0;
    CATEGORIES.forEach(cat=>{
      service.nearbySearch({location:center,radius:5000,...(cat.type&&{type:cat.type}),...(cat.keyword&&{keyword:cat.keyword})},(results,status)=>{
        const OK=window.google.maps.places.PlacesServiceStatus.OK;
        const items=status===OK&&results?results.slice(0,10):[];
        if(!items.length){done++;if(done===CATEGORIES.length){placeMarkers(lat,lng,result);setPlaces({...result});setLoading(false);}return;}
        let dd=0;
        items.forEach(place=>{
          service.getDetails({placeId:place.place_id,fields:["name","formatted_phone_number","international_phone_number","geometry","vicinity","rating","user_ratings_total","opening_hours","place_id"]},(detail,ds)=>{
            result[cat.id].push(ds===OK&&detail?detail:place);dd++;
            if(dd===items.length){result[cat.id].sort((a,b)=>getDistance(lat,lng,a.geometry.location.lat(),a.geometry.location.lng())-getDistance(lat,lng,b.geometry.location.lat(),b.geometry.location.lng()));done++;if(done===CATEGORIES.length){placeMarkers(lat,lng,result);setPlaces({...result});setLoading(false);}}
          });
        });
      });
    });
  },[mapsReady,placeMarkers]);

  const handleGPS=()=>{setLocError(null);if(!navigator.geolocation){setLocError("Geolocalização não suportada.");return;}navigator.geolocation.getCurrentPosition(pos=>{const loc={lat:pos.coords.latitude,lng:pos.coords.longitude};setLocation(loc);fetchPlaces(loc.lat,loc.lng);},()=>setLocError("Permissão negada. Verifique as configurações."));};
  const handleCardClick=(place)=>{const marker=markersRef.current.find(m=>m._placeId===place.place_id);if(marker&&mapInstance.current){mapInstance.current.panTo(marker.getPosition());mapInstance.current.setZoom(17);window.google.maps.event.trigger(marker,"click");if(scrollRef.current)scrollRef.current.scrollTo({top:0,behavior:"smooth"});}};

  const activeCat=CATEGORIES.find(c=>c.id===activeTab);
  const activePlaces=(places[activeTab]||[]).filter(p=>(!search||p.name.toLowerCase().includes(search.toLowerCase()))&&(!only24h||is24h(p)));
  const tankCapacity=parseFloat(profile.tankL)||0;
  const getManutAlert=(item)=>{const t=MANUT_TYPES.find(t=>t.id===item.type);if(!t?.kmAlert||!item.km||!profile.currentKm)return null;const next=parseInt(item.km)+t.kmAlert,diff=next-parseInt(profile.currentKm);return{nextKm:next,diff};};

  // ---- MAP TAB ----
  const renderMap=()=>(
    <div ref={scrollRef} style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingBottom:80,WebkitOverflowScrolling:"touch"}}>
      <div style={{padding:"16px 16px 12px",background:C.white}}>
        <div style={{fontSize:20,fontWeight:700,color:C.navy,marginBottom:12}}>
          Olá, <span style={{color:C.accent}}>{profile.name||"Victor"}</span> 👋
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,background:C.offWhite,borderRadius:12,padding:"10px 14px",border:`1.5px solid ${C.border}`}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar locais..."
            style={{background:"transparent",border:"none",outline:"none",color:C.navy,fontSize:14,flex:1,fontFamily:"'Outfit',sans-serif"}}/>
        </div>
      </div>

      <div style={{padding:"8px 16px 12px",background:C.white,display:"flex",gap:8,overflowX:"auto",borderBottom:`1px solid ${C.border}`}}>
        {CATEGORIES.map(cat=>{
          const active=activeTab===cat.id;
          return <button key={cat.id} onClick={()=>{setActiveTab(cat.id);setOnly24h(false);}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:99,border:`1.5px solid ${active?cat.color:C.border}`,cursor:"pointer",background:active?cat.color:C.white,color:active?C.white:C.textMid,fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
            <span>{cat.icon}</span>{cat.label}
          </button>;
        })}
      </div>

      <div style={{position:"relative",height:240}}>
        <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
        {locError&&<div style={{position:"absolute",top:10,left:12,right:12,background:C.red,borderRadius:10,padding:"8px 12px",fontSize:12,color:C.white,fontWeight:500}}>{locError}</div>}
        <button onClick={handleGPS} disabled={loading} style={{position:"absolute",bottom:12,right:12,display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:99,border:`1.5px solid ${C.border}`,background:C.white,color:loading?C.textLight:C.navy,fontSize:13,fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:loading?"not-allowed":"pointer",boxShadow:"0 2px 12px rgba(27,45,91,0.15)",WebkitTapHighlightColor:"transparent"}}>
          {loading?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 0.8s linear infinite"}}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>}
          GPS
        </button>
      </div>

      <div style={{padding:"16px 16px 0",background:C.white,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:C.navy}}>Serviços Próximos</div>
          {searched&&!loading&&<div style={{fontSize:12,color:C.textLight,marginTop:2}}>{activePlaces.length} resultado{activePlaces.length!==1?"s":""}{only24h?" · apenas 24h":""}</div>}
        </div>
        {searched&&!loading&&<button onClick={()=>setOnly24h(v=>!v)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${only24h?C.green:C.border}`,background:only24h?"rgba(29,176,105,0.08)":C.white,color:only24h?C.green:C.textMid,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",WebkitTapHighlightColor:"transparent"}}>
          🕐 Apenas 24h
        </button>}
      </div>

      <div style={{padding:"12px 16px 0",background:C.white}}>
        {!searched&&!loading&&<div style={{background:C.offWhite,borderRadius:16,padding:"28px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginBottom:12,border:`1px solid ${C.border}`}}>
          <span style={{fontSize:40}}>📍</span>
          <div style={{fontSize:14,color:C.textMid,textAlign:"center",lineHeight:1.6}}>Toque em <strong style={{color:C.navy}}>GPS</strong> para encontrar serviços próximos</div>
        </div>}

        {loading&&[1,2,3].map(i=><div key={i} style={{background:C.offWhite,borderRadius:16,padding:16,marginBottom:12,border:`1px solid ${C.border}`}}>
          {[60,40,80].map((w,j)=><div key={j} style={{height:j===0?14:10,background:C.surface,borderRadius:6,marginBottom:j===2?0:8,width:`${w}%`}}/>)}
          <div style={{height:36,background:C.surface,borderRadius:10,marginTop:16}}/>
        </div>)}

        {!loading&&searched&&activePlaces.length===0&&<div style={{background:C.offWhite,borderRadius:16,padding:"28px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10,border:`1px solid ${C.border}`}}>
          <span style={{fontSize:32}}>🔍</span>
          <div style={{fontSize:14,color:C.textMid,textAlign:"center"}}>{only24h?"Nenhum serviço 24h encontrado.":"Nenhum resultado."}</div>
        </div>}

        {!loading&&activePlaces.map((place,i)=>{
          const dist=location?distLabel(getDistance(location.lat,location.lng,place.geometry.location.lat(),place.geometry.location.lng())):null;
          const phone=place.formatted_phone_number||place.international_phone_number;
          const waUrl=getWA(phone);
          const isOpen=place.opening_hours?.isOpen?.()??null;
          const h24=is24h(place);
          const mapsUrl=`https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}`;
          return <div key={place.place_id||i} style={{background:C.white,borderRadius:16,padding:16,marginBottom:12,border:`1.5px solid ${h24?"rgba(29,176,105,0.3)":C.border}`,animation:`fadeUp 0.3s ease ${i*0.04}s both`,boxShadow:"0 2px 8px rgba(27,45,91,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div onClick={()=>handleCardClick(place)} style={{fontSize:15,fontWeight:700,color:C.navy,lineHeight:1.3,flex:1,paddingRight:10,cursor:"pointer",borderBottom:`1px dashed ${C.border}`,paddingBottom:2}}>{place.name}</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                {dist&&<Badge color={activeCat?.color} bg={`${activeCat?.color}18`}>{dist}</Badge>}
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  {h24&&<Badge color={C.green} bg="rgba(29,176,105,0.1)">24H</Badge>}
                  {isOpen!==null&&<span style={{fontSize:11,color:isOpen?C.green:C.red,fontWeight:600}}>{isOpen?"● Aberto":"● Fechado"}</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Stars rating={place.rating}/>{place.user_ratings_total&&<span style={{fontSize:11,color:C.textLight}}>{place.user_ratings_total} aval.</span>}</div>
            {place.vicinity&&<div style={{fontSize:12,color:C.textLight,marginBottom:6,display:"flex",gap:5,alignItems:"flex-start",lineHeight:1.5}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.5" style={{marginTop:1,flexShrink:0}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{place.vicinity}</div>}
            {phone&&<div style={{fontSize:12,color:C.textLight,marginBottom:12,display:"flex",gap:5,alignItems:"center"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.1z"/></svg>{phone}</div>}
            <div style={{display:"flex",gap:8}}>
              {phone&&<a href={waUrl||`tel:${phone}`} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 0",borderRadius:10,background:waUrl?"rgba(37,211,102,0.08)":C.surface,color:waUrl?"#25D366":C.textMid,border:waUrl?"1px solid rgba(37,211,102,0.2)":`1px solid ${C.border}`,textDecoration:"none",fontSize:13,fontWeight:600}}>
                {waUrl?<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.39 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.1z"/></svg>}
                {waUrl?"WhatsApp":"Ligar"}
              </a>}
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{flex:phone?1.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 0",borderRadius:10,background:activeCat?.color,color:C.white,textDecoration:"none",fontSize:13,fontWeight:600}}>
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

  // ---- FUEL TAB ----
  const renderFuel=()=>(
    <div style={{flex:1,overflowY:"auto",padding:"20px 16px 80px",background:C.white,WebkitOverflowScrolling:"touch"}}>
      <div style={{fontSize:20,fontWeight:700,color:C.navy,marginBottom:2}}>⛽ Abastecimento</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Controle o combustível da sua moto</div>

      {tankCapacity>0 ? (
        <div style={{background:C.offWhite,borderRadius:16,marginBottom:16,border:`1.5px solid ${C.border}`}}>
          <FuelGauge liters={currentFuelLiters} capacity={tankCapacity} reserveL={parseFloat(profile.reserveL)||3} kmpl={parseFloat(profile.kmpl)||36}/>
          <div style={{padding:"0 16px 14px",textAlign:"center",fontSize:12,color:C.textLight}}>
            Último abastecimento: <strong style={{color:C.navy}}>{fuelList[0]?.date||"—"}</strong>
          </div>
        </div>
      ) : (
        <div style={{background:"rgba(240,125,26,0.06)",border:`1px solid rgba(240,125,26,0.2)`,borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:13,color:C.orange}}>
          ⚠️ Configure a capacidade do tanque no Perfil para ver o indicador
        </div>
      )}

      <Btn onClick={()=>setShowFuelForm(true)}>+ Registrar Abastecimento</Btn>

      {fuelList.length>0&&<div style={{marginTop:20}}>
        <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:12}}>Histórico</div>
        {fuelList.map(f=>{
          const total=(parseFloat(f.liters)||0)*(parseFloat(f.pricePerLiter)||0);
          return <div key={f.id} style={{background:C.offWhite,borderRadius:14,padding:14,marginBottom:10,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.navy,display:"flex",alignItems:"center",gap:6}}>
                  ⛽ {parseFloat(f.liters).toFixed(1)}L
                  {f.tankFull&&<Badge color={C.green} bg="rgba(29,176,105,0.1)">Tanque cheio</Badge>}
                </div>
                <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{f.date}{f.km?` · ${parseInt(f.km).toLocaleString()} km`:""}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:14,fontWeight:700,color:C.orange}}>R$ {total.toFixed(2)}</div>
                <div style={{fontSize:11,color:C.textLight}}>R$ {parseFloat(f.pricePerLiter||0).toFixed(2)}/L</div>
              </div>
            </div>
            <button onClick={()=>deleteFuel(f.id)} style={{background:"transparent",border:"none",color:C.red,fontSize:11,cursor:"pointer",fontFamily:"'Outfit',sans-serif",padding:0}}>🗑 Remover</button>
          </div>;
        })}
      </div>}

      {showFuelForm&&<Modal title="Registrar Abastecimento" onClose={()=>setShowFuelForm(false)}>
        <Input label="Litros abastecidos" value={fuelForm.liters} onChange={v=>setFuelForm(f=>({...f,liters:v}))} type="number" placeholder="Ex: 12.5"/>
        <Input label="Preço por litro (R$)" value={fuelForm.pricePerLiter} onChange={v=>setFuelForm(f=>({...f,pricePerLiter:v}))} type="number" placeholder="Ex: 6.49"/>
        <Input label="Quilometragem atual" value={fuelForm.km} onChange={v=>setFuelForm(f=>({...f,km:v}))} type="number" placeholder="Ex: 77903"/>
        <Input label="Data" value={fuelForm.date} onChange={v=>setFuelForm(f=>({...f,date:v}))} type="date"/>
        <div onClick={()=>setFuelForm(f=>({...f,tankFull:!f.tankFull}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:fuelForm.tankFull?"rgba(29,176,105,0.06)":C.offWhite,border:`1.5px solid ${fuelForm.tankFull?C.green:C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:14,cursor:"pointer"}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:fuelForm.tankFull?C.green:C.navy}}>🔋 Completei o tanque</div>
            <div style={{fontSize:11,color:C.textLight,marginTop:2}}>O indicador vai mostrar 100%</div>
          </div>
          <div style={{width:44,height:26,borderRadius:99,background:fuelForm.tankFull?C.green:C.surface,position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:fuelForm.tankFull?20:3,width:20,height:20,borderRadius:"50%",background:C.white,transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
          </div>
        </div>
        {fuelForm.liters&&fuelForm.pricePerLiter&&<div style={{background:"rgba(240,125,26,0.06)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:13,color:C.orange,fontWeight:600}}>
          Total: R$ {((parseFloat(fuelForm.liters)||0)*(parseFloat(fuelForm.pricePerLiter)||0)).toFixed(2)}
          {fuelForm.tankFull?" · Tanque: 100% ✓":tankCapacity>0&&` · Tanque: ${Math.min(100,Math.round((parseFloat(fuelForm.liters)/tankCapacity)*100))}%`}
        </div>}
        <Btn onClick={addFuel} disabled={!fuelForm.liters||!fuelForm.pricePerLiter}>Salvar Abastecimento</Btn>
      </Modal>}
    </div>
  );

  // ---- MANUT TAB ----
  const renderManut=()=>(
    <div style={{flex:1,overflowY:"auto",padding:"20px 16px 80px",background:C.white,WebkitOverflowScrolling:"touch"}}>
      <div style={{fontSize:20,fontWeight:700,color:C.navy,marginBottom:2}}>🔧 Manutenção</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:20}}>Histórico e alertas da sua moto</div>

      {!profile.currentKm&&<div style={{background:"rgba(240,125,26,0.06)",border:`1px solid rgba(240,125,26,0.2)`,borderRadius:12,padding:"12px 14px",marginBottom:16,fontSize:13,color:C.orange}}>
        ⚠️ Configure a quilometragem atual no Perfil para ver alertas de troca
      </div>}

      <Btn onClick={()=>setShowManutForm(true)}>+ Registrar Manutenção</Btn>

      {manutList.length>0&&<div style={{marginTop:20}}>
        <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:12}}>Histórico</div>
        {manutList.map(item=>{
          const typeDef=MANUT_TYPES.find(t=>t.id===item.type);
          const label=item.type==="other"?item.customLabel:typeDef?.label;
          const alert=getManutAlert(item);
          const alertColor=alert?(alert.diff<=0?C.red:alert.diff<=500?C.orange:C.green):null;
          return <div key={item.id} style={{background:C.offWhite,borderRadius:14,padding:14,marginBottom:10,border:`1.5px solid ${alert&&alert.diff<=500?"rgba(240,125,26,0.3)":C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.navy}}>{typeDef?.icon} {label}</div>
                <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{item.date}{item.km?` · ${parseInt(item.km).toLocaleString()} km`:""}</div>
                {item.product&&<div style={{fontSize:12,color:C.textMid,marginTop:2}}>📦 {item.product}</div>}
              </div>
              {alert&&<Badge color={alertColor} bg={`${alertColor}18`}>{alert.diff<=0?"VENCIDA":alert.diff<=500?`${alert.diff} km restantes`:`Próx: ${parseInt(alert.nextKm).toLocaleString()} km`}</Badge>}
            </div>
            <button onClick={()=>deleteManut(item.id)} style={{background:"transparent",border:"none",color:C.red,fontSize:11,cursor:"pointer",fontFamily:"'Outfit',sans-serif",padding:0}}>🗑 Remover</button>
          </div>;
        })}
      </div>}

      {showManutForm&&<Modal title="Registrar Manutenção" onClose={()=>setShowManutForm(false)}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:C.textMid,marginBottom:8,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase"}}>Tipo de Manutenção</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {MANUT_TYPES.map(t=><button key={t.id} onClick={()=>setManutForm(f=>({...f,type:t.id}))} style={{padding:"7px 12px",borderRadius:99,border:`1.5px solid ${manutForm.type===t.id?C.navy:C.border}`,background:manutForm.type===t.id?C.navy:"transparent",color:manutForm.type===t.id?C.white:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
              {t.icon} {t.label}
            </button>)}
          </div>
        </div>
        {manutForm.type==="other"&&<Input label="Descrição" value={manutForm.customLabel} onChange={v=>setManutForm(f=>({...f,customLabel:v}))} placeholder="Ex: Limpeza do carburador"/>}
        <Input label="Produto/Marca utilizado" value={manutForm.product} onChange={v=>setManutForm(f=>({...f,product:v}))} placeholder="Ex: Motul 10W-30"/>
        <Input label="Quilometragem na troca" value={manutForm.km} onChange={v=>setManutForm(f=>({...f,km:v}))} type="number" placeholder="Ex: 77903"/>
        <Input label="Data" value={manutForm.date} onChange={v=>setManutForm(f=>({...f,date:v}))} type="date"/>
        {manutForm.type!=="other"&&MANUT_TYPES.find(t=>t.id===manutForm.type)?.kmAlert&&<div style={{background:"rgba(74,127,212,0.06)",borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:12,color:C.accent}}>
          ℹ️ Próxima troca sugerida em {MANUT_TYPES.find(t=>t.id===manutForm.type)?.kmAlert?.toLocaleString()} km
        </div>}
        <Btn onClick={addManut} disabled={manutForm.type==="other"&&!manutForm.customLabel}>Salvar Manutenção</Btn>
      </Modal>}
    </div>
  );

  // ---- PROFILE TAB ----
  const renderProfile=()=>{
    const form=profileForm||profile;
    return (
      <div style={{flex:1,overflowY:"auto",padding:"20px 16px 80px",background:C.white,WebkitOverflowScrolling:"touch"}}>
        <div style={{fontSize:20,fontWeight:700,color:C.navy,marginBottom:20}}>Meu Perfil</div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:24,background:C.offWhite,borderRadius:20,padding:"24px 16px",border:`1px solid ${C.border}`}}>
          <div style={{width:84,height:84,borderRadius:"50%",background:C.surface,border:`3px solid ${C.navy}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:12,overflow:"hidden"}}>
            {profile.photoUrl?<img src={profile.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
          </div>
          <div style={{fontSize:20,fontWeight:800,color:C.navy}}>{profile.name||"Sem nome"}</div>
          <div style={{fontSize:13,color:C.textMid,marginTop:2}}>{profile.moto||"Moto não cadastrada"}{profile.year?` · ${profile.year}`:""}</div>
        </div>

        {(profile.kmpl||profile.tankL||profile.currentKm)&&<div style={{display:"flex",gap:10,marginBottom:20}}>
          {profile.currentKm&&<div style={{flex:1,background:C.offWhite,borderRadius:14,padding:"12px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:16,fontWeight:800,color:C.navy}}>{parseInt(profile.currentKm).toLocaleString()}</div>
            <div style={{fontSize:10,color:C.textLight,marginTop:2}}>km atual</div>
          </div>}
          {profile.kmpl&&<div style={{flex:1,background:C.offWhite,borderRadius:14,padding:"12px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:16,fontWeight:800,color:C.accent}}>{profile.kmpl}</div>
            <div style={{fontSize:10,color:C.textLight,marginTop:2}}>km/litro</div>
          </div>}
          {profile.tankL&&<div style={{flex:1,background:C.offWhite,borderRadius:14,padding:"12px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:16,fontWeight:800,color:C.navy}}>{profile.tankL}L</div>
            <div style={{fontSize:10,color:C.textLight,marginTop:2}}>tanque</div>
          </div>}
        </div>}

        {!profileForm ? (
          <Btn onClick={()=>setProfileForm({...profile})}>✏️ Editar Perfil</Btn>
        ) : (
          <div style={{background:C.offWhite,borderRadius:16,padding:16,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:16}}>Editar informações</div>
            <Input label="Seu nome" value={form.name} onChange={v=>setProfileForm(f=>({...f,name:v}))} placeholder="Ex: Victor"/>
            <Input label="URL da foto (opcional)" value={form.photoUrl||""} onChange={v=>setProfileForm(f=>({...f,photoUrl:v}))} placeholder="https://..."/>
            <Input label="Modelo da moto" value={form.moto} onChange={v=>setProfileForm(f=>({...f,moto:v}))} placeholder="Ex: Yamaha Crosser ZTX"/>
            <Input label="Ano" value={form.year} onChange={v=>setProfileForm(f=>({...f,year:v}))} type="number" placeholder="Ex: 2019"/>
            <Input label="Consumo (km/litro)" value={form.kmpl} onChange={v=>setProfileForm(f=>({...f,kmpl:v}))} type="number" placeholder="Ex: 36"/>
            <Input label="Capacidade do tanque (litros)" value={form.tankL} onChange={v=>setProfileForm(f=>({...f,tankL:v}))} type="number" placeholder="Ex: 12"/>
            <Input label="Litros de reserva" value={form.reserveL||""} onChange={v=>setProfileForm(f=>({...f,reserveL:v}))} type="number" placeholder="Ex: 3"/>
            <Input label="Quilometragem atual" value={form.currentKm} onChange={v=>setProfileForm(f=>({...f,currentKm:v}))} type="number" placeholder="Ex: 77903"/>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn onClick={()=>setProfileForm(null)} variant="secondary" style={{flex:1}}>Cancelar</Btn>
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
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{height:100%;}
        body{background:${C.white};font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased;height:100%;overscroll-behavior-y:none;}
        #root{height:100%;}
        .gm-style-iw{background:transparent!important;box-shadow:none!important;padding:0!important;}
        .gm-style-iw-d{overflow:visible!important;}
        .gm-style-iw-t::after{display:none!important;}
        .gm-ui-hover-effect{display:none!important;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        input::placeholder{color:${C.textLight};}
        input[type=date]{color-scheme:light;}
      `}</style>

      <div style={{width:"100%",maxWidth:480,margin:"0 auto",height:"100dvh",background:C.white,display:"flex",flexDirection:"column",fontFamily:"'Outfit',sans-serif",position:"relative"}}>

        {/* TOP BAR */}
        <div style={{background:C.navy,padding:"48px 16px 14px",flexShrink:0,boxShadow:"0 2px 16px rgba(27,45,91,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Logo size={28} light/>
              <span style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>
                <span style={{color:C.white}}>Mi</span><span style={{color:C.accentLight}}>Moto</span>
              </span>
            </div>
            <div onClick={()=>setActiveNav("profile")} style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"2px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",overflow:"hidden",WebkitTapHighlightColor:"transparent"}}>
              {profile.photoUrl?<img src={profile.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
            </div>
          </div>
        </div>

        {/* CONTENT — mantém todas as abas no DOM para o mapa não desmontar */}
        <div style={{display:activeNav==="map"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>{renderMap()}</div>
        <div style={{display:activeNav==="fuel"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>{renderFuel()}</div>
        <div style={{display:activeNav==="maint"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>{renderManut()}</div>
        <div style={{display:activeNav==="profile"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>{renderProfile()}</div>

        {/* BOTTOM NAV */}
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.white,borderTop:`1px solid ${C.border}`,padding:"10px 0 28px",display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(27,45,91,0.08)"}}>
          {[
            {id:"map",label:"Mapa",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>},
            {id:"fuel",label:"Combustível",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22V8l9-6 9 6v14"/><path d="M9 22V12h6v10"/></svg>},
            {id:"maint",label:"Manutenção",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>},
            {id:"profile",label:"Perfil",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
          ].map(item=>{
            const active=activeNav===item.id;
            return <button key={item.id} onClick={()=>setActiveNav(item.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",color:active?C.navy:C.textLight,fontFamily:"'Outfit',sans-serif",WebkitTapHighlightColor:"transparent",transition:"color 0.15s"}}>
              {item.icon}
              {active&&<div style={{width:4,height:4,borderRadius:"50%",background:C.navy,marginTop:-2}}/>}
              <span style={{fontSize:10,fontWeight:active?700:500}}>{item.label}</span>
            </button>;
          })}
        </div>
      </div>
    </>
  );
}
