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

const C = {
  navy:"#1B2D5B", navyDark:"#0F1E3E", navyMid:"#243870",
  accent:"#4A7FD4", accentLight:"#6B9CE8",
  white:"#FFFFFF", offWhite:"#F4F6FA", surface:"#EDF0F7",
  border:"rgba(27,45,91,0.1)", borderMid:"rgba(27,45,91,0.2)",
  text:"#1B2D5B", textMid:"#5A6E99", textLight:"#9AAABF",
  red:"#E84040", green:"#1DB069", orange:"#F07D1A",
  glass:"rgba(255,255,255,0.85)",
};

const MAPS_KEY = "AIzaSyAWK94SwutfM0M6dxukmrUTQCfg4a83ltE";
const CATS = [
  {id:"tire",label:"Borracharias",icon:"🔧",color:C.red,
   searches:[
     {type:"car_repair",keyword:"borracharia"},
     {type:"car_repair",keyword:"borracharia moto"},
     {type:null,keyword:"borracharia"},
     {type:null,keyword:"vulcanizadora"},
   ]},
  {id:"gas",label:"Postos",icon:"⛽",color:C.orange,
   searches:[
     {type:"gas_station",keyword:null},
     {type:"gas_station",keyword:"posto combustivel"},
     {type:null,keyword:"posto gasolina"},
     {type:null,keyword:"posto combustivel"},
   ]},
  {id:"tow",label:"Reboques",icon:"🚛",color:C.accent,
   searches:[
     {type:null,keyword:"reboque"},
     {type:null,keyword:"guincho reboque"},
     {type:null,keyword:"guincho 24h"},
     {type:"car_repair",keyword:"reboque"},
   ]},
];
const MANUT = [
  {id:"oil",label:"Troca de Óleo",icon:"🛢️",kmAlert:3000},
  {id:"filter",label:"Filtro de Ar",icon:"🌬️",kmAlert:6000},
  {id:"tire",label:"Pneu",icon:"⚫",kmAlert:15000},
  {id:"chain",label:"Corrente",icon:"⛓️",kmAlert:5000},
  {id:"brake",label:"Freio",icon:"🔴",kmAlert:8000},
  {id:"spark",label:"Vela",icon:"⚡",kmAlert:8000},
  {id:"other",label:"Outro",icon:"🔧",kmAlert:null},
];

function gd(a1,o1,a2,o2){const R=6371000,da=((a2-a1)*Math.PI)/180,dl=((o2-o1)*Math.PI)/180,a=Math.sin(da/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(dl/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function dl(m){return m<1000?`${Math.round(m)}m`:`${(m/1000).toFixed(1)}km`;}
function wa(p){if(!p)return null;const d=p.replace(/\D/g,"");if(d.length<10||d.length>13)return null;return`https://wa.me/${d.startsWith("55")?d:"55"+d}`;}
function h24(pl){return pl.opening_hours?.periods?.some(p=>p.open&&!p.close)??false;}
function loadMaps(){return new Promise(r=>{if(window.google?.maps?.places)return r();const s=document.createElement("script");s.src=`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;s.onload=r;document.head.appendChild(s);});}

function Stars({rating}){
  if(!rating)return null;
  return<span style={{color:"#F5A623",fontSize:11}}>{"★".repeat(Math.round(rating))}{"☆".repeat(5-Math.round(rating))}<span style={{color:C.textLight,marginLeft:3,fontSize:10}}>{rating.toFixed(1)}</span></span>;
}

function AnimGauge({pct,color,size=140}){
  const r=52,circ=2*Math.PI*r,half=circ/2,filled=(pct/100)*half;
  return(
    <svg width={size} height={size/2+20} viewBox={`0 0 ${size} ${size/2+20}`}>
      <path d={`M${size*0.07} ${size/2} A${size*0.43} ${size*0.43} 0 0 1 ${size*0.93} ${size/2}`} fill="none" stroke={C.surface} strokeWidth={size*0.09} strokeLinecap="round"/>
      <path d={`M${size*0.07} ${size/2} A${size*0.43} ${size*0.43} 0 0 1 ${size*0.93} ${size/2}`} fill="none" stroke={color} strokeWidth={size*0.09} strokeLinecap="round"
        strokeDasharray={`${(pct/100)*(Math.PI*size*0.43)} ${Math.PI*size*0.43}`}
        style={{transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)"}}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={color} fontSize={size*0.22} fontWeight="800" fontFamily="Outfit,sans-serif">{pct}%</text>
    </svg>
  );
}

function Sheet({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,18,40,0.7)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.white,borderRadius:"28px 28px 0 0",width:"100%",maxWidth:480,margin:"0 auto",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(27,45,91,0.2)"}}>
        <div style={{padding:"12px 20px 0",flexShrink:0}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.surface,margin:"0 auto 16px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:18,fontWeight:700,color:C.navy}}>{title}</div>
            <button onClick={onClose} style={{background:C.surface,border:"none",color:C.textMid,borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"0 20px 48px",WebkitOverflowScrolling:"touch"}}>{children}</div>
      </div>
    </div>
  );
}

function Field({label,value,onChange,type="text",placeholder=""}){
  return(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:C.textMid,marginBottom:5,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase"}}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",background:C.offWhite,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",color:C.navy,fontSize:14,outline:"none",fontFamily:"Outfit,sans-serif",WebkitAppearance:"none"}}/>
    </div>
  );
}

function PrimaryBtn({onClick,children,disabled,color=C.navy,style={}}){
  return<button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:disabled?"#C8D0E0":color,color:C.white,fontSize:15,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:"Outfit,sans-serif",letterSpacing:0.3,...style}}>{children}</button>;
}

export default function App(){
  const mapRef=useRef(null),mapInst=useRef(null),markers=useRef([]),circle=useRef(null),scrollRef=useRef(null);
  const [nav,setNav]=useState("map");
  const [mapsOk,setMapsOk]=useState(false);
  const [loc,setLoc]=useState(null);
  const [places,setPlaces]=useState({tire:[],gas:[],tow:[]});
  const [tab,setTab]=useState("tire");
  const [busy,setBusy]=useState(false);
  const [searched,setSearched]=useState(false);
  const [locErr,setLocErr]=useState(null);
  const [q,setQ]=useState("");
  const [f24,setF24]=useState(false);
  const [sheetPlace,setSheetPlace]=useState(null);
  const [profile,setProfile]=useState({name:"Victor",moto:"Yamaha Crosser ZTX",year:"2019",kmpl:"36",tankL:"12",reserveL:"3",currentKm:"77903",photoUrl:""});
  const [editProfile,setEditProfile]=useState(null);
  const [saving,setSaving]=useState(false);
  const [manut,setManut]=useState([]);
  const [manutSheet,setManutSheet]=useState(false);
  const [mf,setMf]=useState({type:"oil",customLabel:"",product:"",date:new Date().toISOString().slice(0,10),km:""});
  const [fuel,setFuel]=useState([]);
  const [fuelSheet,setFuelSheet]=useState(false);
  const [ff,setFf]=useState({liters:"",pricePerLiter:"",km:"",date:new Date().toISOString().slice(0,10),tankFull:false});
  const [fuelLiters,setFuelLiters]=useState(0);
  const [kmCheckVisible,setKmCheckVisible]=useState(false);
  const [kmInput,setKmInput]=useState("");
  const [kmSaving,setKmSaving]=useState(false);

  useEffect(()=>{loadMaps().then(()=>setMapsOk(true));loadProfile();loadManut();loadFuel();},[]);

  // Check diário de km — aparece ao meio-dia (12h), uma vez por dia
  useEffect(()=>{
    function checkKmPrompt(){
      const now=new Date();
      const hour=now.getHours();
      const today=now.toISOString().slice(0,10);
      const lastAsked=localStorage.getItem("mimoto_km_asked");
      // Mostra a partir das 12h se ainda não perguntou hoje
      if(hour>=12&&lastAsked!==today){
        setKmCheckVisible(true);
      }
    }
    // Checa ao abrir
    checkKmPrompt();
    // Checa a cada 5 minutos (caso o app fique aberto passando das 12h)
    const interval=setInterval(checkKmPrompt,5*60*1000);
    return()=>clearInterval(interval);
  },[]);

  async function loadProfile(){try{const s=await getDoc(doc(db,"users",USER_ID));const def={name:"Victor",moto:"Yamaha Crosser ZTX",year:"2019",kmpl:"36",tankL:"12",reserveL:"3",currentKm:"77903",photoUrl:""};if(s.exists())setProfile({...def,...s.data()});else await setDoc(doc(db,"users",USER_ID),def);}catch(e){}}
  async function saveProfile(d){setSaving(true);try{await setDoc(doc(db,"users",USER_ID),d);setProfile(d);setEditProfile(null);}catch(e){}setSaving(false);}

  async function saveKmCheck(){
    const km=parseInt(kmInput);
    if(!km||km<1000)return;
    setKmSaving(true);
    try{
      // 1. Atualiza perfil com nova km
      const newProfile={...profile,currentKm:String(km)};
      await setDoc(doc(db,"users",USER_ID),newProfile);
      setProfile(newProfile);

      // 2. Calcula litros consumidos desde último abastecimento
      if(fuel.length>0){
        const lastFuel=fuel[0];
        const lastKm=parseInt(lastFuel.km)||0;
        const lastLiters=lastFuel.tankFull?(parseFloat(profile.tankL)||12):parseFloat(lastFuel.liters)||0;
        const kmRodados=km-lastKm;
        const kmplVal=parseFloat(profile.kmpl)||36;
        if(kmRodados>0&&lastKm>0){
          const consumed=kmRodados/kmplVal;
          const remaining=Math.max(0,lastLiters-consumed);
          setFuelLiters(remaining);
        }
      }

      // 3. Marca hoje como perguntado
      localStorage.setItem("mimoto_km_asked",new Date().toISOString().slice(0,10));
      setKmCheckVisible(false);
      setKmInput("");
    }catch(e){}
    setKmSaving(false);
  }

  function dismissKmCheck(){
    localStorage.setItem("mimoto_km_asked",new Date().toISOString().slice(0,10));
    setKmCheckVisible(false);
    setKmInput("");
  }
  async function loadManut(){try{const s=await getDocs(query(collection(db,"users",USER_ID,"manut"),orderBy("date","desc")));setManut(s.docs.map(d=>({id:d.id,...d.data()})));}catch(e){}}
  async function saveManut(){try{await addDoc(collection(db,"users",USER_ID,"manut"),mf);setManutSheet(false);setMf({type:"oil",customLabel:"",product:"",date:new Date().toISOString().slice(0,10),km:""});loadManut();}catch(e){}}
  async function delManut(id){try{await deleteDoc(doc(db,"users",USER_ID,"manut",id));loadManut();}catch(e){}}
  async function loadFuel(){try{const s=await getDocs(query(collection(db,"users",USER_ID,"fuel"),orderBy("date","desc")));const l=s.docs.map(d=>({id:d.id,...d.data()}));setFuel(l);if(l.length>0){const la=l[0];setFuelLiters(la.tankFull?(parseFloat(profile.tankL)||12):parseFloat(la.liters)||0);}}catch(e){}}
  async function saveFuel(){try{await addDoc(collection(db,"users",USER_ID,"fuel"),ff);setFuelLiters(ff.tankFull?(parseFloat(profile.tankL)||12):parseFloat(ff.liters)||0);setFuelSheet(false);setFf({liters:"",pricePerLiter:"",km:"",date:new Date().toISOString().slice(0,10),tankFull:false});loadFuel();}catch(e){}}
  async function delFuel(id){try{await deleteDoc(doc(db,"users",USER_ID,"fuel",id));loadFuel();}catch(e){}}

  useEffect(()=>{
    if(mapsOk&&mapRef.current&&!mapInst.current){
      mapInst.current=new window.google.maps.Map(mapRef.current,{
        zoom:14,center:{lat:-3.7319,lng:-38.5267},disableDefaultUI:true,zoomControl:false,
        styles:[
          {elementType:"geometry",stylers:[{color:"#EBF0FA"}]},
          {elementType:"labels.text.fill",stylers:[{color:"#4A6080"}]},
          {elementType:"labels.text.stroke",stylers:[{color:"#EBF0FA"}]},
          {featureType:"road",elementType:"geometry",stylers:[{color:"#FFFFFF"}]},
          {featureType:"road.arterial",elementType:"geometry",stylers:[{color:"#E8EEF8"}]},
          {featureType:"road.highway",elementType:"geometry",stylers:[{color:"#D0DCEF"}]},
          {featureType:"water",elementType:"geometry",stylers:[{color:"#AECBE8"}]},
          {featureType:"poi",elementType:"geometry",stylers:[{color:"#DDE5F2"}]},
          {featureType:"poi",elementType:"labels",stylers:[{visibility:"off"}]},
          {featureType:"transit",elementType:"geometry",stylers:[{color:"#E0E8F5"}]},
        ],
      });
    }
  },[mapsOk]);

  useEffect(()=>{
    if(nav==="map"&&mapInst.current){
      setTimeout(()=>window.google?.maps?.event?.trigger(mapInst.current,"resize"),80);
    }
  },[nav]);

  const clearMarkers=()=>{markers.current.forEach(m=>m.setMap(null));markers.current=[];if(circle.current){circle.current.setMap(null);circle.current=null;}};

  const pinMarkers=useCallback((lat,lng,all)=>{
    if(!mapInst.current)return;
    clearMarkers();
    new window.google.maps.Marker({position:{lat,lng},map:mapInst.current,zIndex:10,
      icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:10,fillColor:C.navy,fillOpacity:1,strokeColor:C.white,strokeWeight:3}});
    circle.current=new window.google.maps.Circle({strokeColor:C.accent,strokeOpacity:0.25,strokeWeight:1.5,fillColor:C.accent,fillOpacity:0.06,map:mapInst.current,center:{lat,lng},radius:800});
    CATS.forEach(cat=>{
      (all[cat.id]||[]).forEach(place=>{
        const plat=place.geometry.location.lat(),plng=place.geometry.location.lng();
        const dist=dl(gd(lat,lng,plat,plng));
        const open=place.opening_hours?.isOpen?.()??null;
        const iw=new window.google.maps.InfoWindow({content:`<div style="background:${C.navy};border-radius:12px;padding:10px 13px;color:#fff;font-family:Outfit,sans-serif;min-width:150px;box-shadow:0 6px 24px rgba(0,0,0,0.25)"><div style="font-weight:700;font-size:13px;margin-bottom:3px">${place.name}</div><div style="font-size:11px;opacity:0.65">${open!==null?(open?"● Aberto":"● Fechado"):""} · ${dist}</div></div>`});
        const mk=new window.google.maps.Marker({position:{lat:plat,lng:plng},map:mapInst.current,
          icon:{url:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48"><path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28s20-13 20-28C40 9 31 0 20 0z" fill="${cat.color}"/><circle cx="20" cy="20" r="12" fill="rgba(255,255,255,0.2)"/><text x="20" y="25" text-anchor="middle" font-size="14" fill="white">${cat.id==="tire"?"🔧":cat.id==="gas"?"⛽":"🚛"}</text></svg>`)}`,scaledSize:new window.google.maps.Size(36,44),anchor:new window.google.maps.Point(18,44)}});
        mk._placeId=place.place_id;
        mk.addListener("click",()=>{iw.open(mapInst.current,mk);});
        markers.current.push(mk);
      });
    });
    mapInst.current.panTo({lat,lng});mapInst.current.setZoom(14);
  },[]);

  const fetchPlaces=useCallback(async(lat,lng)=>{
    if(!mapsOk)return;
    setBusy(true);setSearched(true);setLocErr(null);
    const map=new window.google.maps.Map(document.createElement("div"));
    const svc=new window.google.maps.places.PlacesService(map);
    const ctr=new window.google.maps.LatLng(lat,lng);
    const res={tire:[],gas:[],tow:[]};
    const seen={tire:new Set(),gas:new Set(),tow:new Set()};
    const OK=window.google.maps.places.PlacesServiceStatus.OK;

    // Total de buscas = soma de todos os searches de cada categoria
    const totalSearches=CATS.reduce((s,c)=>s+c.searches.length,0);
    let searchesDone=0;
    let detailsPending=0;
    let detailsDone=0;

    function tryFinalize(){
      if(searchesDone===totalSearches&&detailsDone===detailsPending){
        // Ordenar por distância e limitar a 12 por categoria
        CATS.forEach(cat=>{
          res[cat.id].sort((a,b)=>
            gd(lat,lng,a.geometry.location.lat(),a.geometry.location.lng())-
            gd(lat,lng,b.geometry.location.lat(),b.geometry.location.lng())
          );
          res[cat.id]=res[cat.id].slice(0,12);
        });
        pinMarkers(lat,lng,res);setPlaces({...res});setBusy(false);
      }
    }

    CATS.forEach(cat=>{
      cat.searches.forEach(srch=>{
        svc.nearbySearch({location:ctr,radius:5000,...(srch.type&&{type:srch.type}),...(srch.keyword&&{keyword:srch.keyword})},(results,status)=>{
          const items=status===OK&&results?results:[];
          searchesDone++;
          // Filtrar só os que não vimos ainda
          const newItems=items.filter(pl=>!seen[cat.id].has(pl.place_id));
          newItems.forEach(pl=>seen[cat.id].add(pl.place_id));
          detailsPending+=newItems.length;
          if(!newItems.length){tryFinalize();return;}
          newItems.forEach(pl=>{
            svc.getDetails({placeId:pl.place_id,fields:["name","formatted_phone_number","international_phone_number","geometry","vicinity","rating","user_ratings_total","opening_hours","place_id"]},(det,ds)=>{
              res[cat.id].push(ds===OK&&det?det:pl);
              detailsDone++;
              tryFinalize();
            });
          });
        });
      });
    });
  },[mapsOk,pinMarkers]);

  const gps=()=>{setLocErr(null);if(!navigator.geolocation){setLocErr("Geolocalização não suportada.");return;}navigator.geolocation.getCurrentPosition(p=>{const l={lat:p.coords.latitude,lng:p.coords.longitude};setLoc(l);fetchPlaces(l.lat,l.lng);},()=>setLocErr("Permissão negada."));};

  const focusPlace=(place)=>{const mk=markers.current.find(m=>m._placeId===place.place_id);if(mk&&mapInst.current){mapInst.current.panTo(mk.getPosition());mapInst.current.setZoom(17);window.google.maps.event.trigger(mk,"click");}setSheetPlace(null);if(scrollRef.current)scrollRef.current.scrollTo({top:0,behavior:"smooth"});};

  const activeCat=CATS.find(c=>c.id===tab);
  const filteredPlaces=(places[tab]||[]).filter(p=>(!q||p.name.toLowerCase().includes(q.toLowerCase()))&&(!f24||h24(p)));
  const tankCap=parseFloat(profile.tankL)||0;
  const reserveL=parseFloat(profile.reserveL)||3;
  const kmpl=parseFloat(profile.kmpl)||36;
  const fuelPct=tankCap>0?Math.min(100,Math.round((fuelLiters/tankCap)*100)):0;
  const fuelColor=fuelPct>(reserveL/tankCap*100)*2?C.green:fuelPct>(reserveL/tankCap*100)?C.orange:C.red;
  const manutAlert=(item)=>{const t=MANUT.find(x=>x.id===item.type);if(!t?.kmAlert||!item.km||!profile.currentKm)return null;const nk=parseInt(item.km)+t.kmAlert,diff=nk-parseInt(profile.currentKm);return{nk,diff};};

  // Stats para fuel
  const totalSpent=fuel.reduce((s,f)=>(s+(parseFloat(f.liters)||0)*(parseFloat(f.pricePerLiter)||0)),0);
  const avgPrice=fuel.length>0?(fuel.reduce((s,f)=>s+(parseFloat(f.pricePerLiter)||0),0)/fuel.length):0;

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{height:100%;}
        body{background:${C.offWhite};font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased;overscroll-behavior:none;}
        input::placeholder{color:${C.textLight};}
        input[type=date]{color-scheme:light;}
        .gm-style-iw,.gm-style-iw-d{background:transparent!important;box-shadow:none!important;padding:0!important;overflow:visible!important;}
        .gm-style-iw-t::after,.gm-ui-hover-effect{display:none!important;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes up{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pop{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        .card{animation:up 0.35s ease both;}
        ::-webkit-scrollbar{display:none;}
      `}</style>

      <div style={{width:"100%",maxWidth:480,margin:"0 auto",height:"100dvh",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>

        {/* ═══ TOP BAR ═══ */}
        <div style={{background:`linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 60%, ${C.navyMid} 100%)`,padding:"52px 20px 16px",flexShrink:0,position:"relative",overflow:"hidden"}}>
          {/* Decorative circles */}
          <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:"rgba(107,156,232,0.08)"}}/>
          <div style={{position:"absolute",top:-20,right:20,width:80,height:80,borderRadius:"50%",background:"rgba(107,156,232,0.06)"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,0.2)"}}>
                <svg width="22" height="20" viewBox="0 0 44 40" fill="none">
                  <path d="M22 2L6 9v12c0 8 7 15 16 17 9-2 16-9 16-17V9L22 2z" stroke="white" strokeWidth="2.5" fill="none"/>
                  <path d="M14 24c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={C.accentLight} strokeWidth="2.2" strokeLinecap="round"/>
                  <circle cx="22" cy="24" r="2.5" fill="white"/>
                  <path d="M16 20l-2-4h4l1.5 2.5M28 20l2-4h-3l-1.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M19 14l3-4 3 4" stroke={C.accentLight} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{fontSize:20,fontWeight:900,letterSpacing:-0.5,lineHeight:1}}>
                  <span style={{color:C.white}}>Mi</span><span style={{color:C.accentLight}}>Moto</span>
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",letterSpacing:1,textTransform:"uppercase",marginTop:1}}>Seu companheiro de estrada</div>
              </div>
            </div>
            <div onClick={()=>setNav("profile")} style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.12)",border:"2px solid rgba(255,255,255,0.2)",cursor:"pointer",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              {profile.photoUrl?<img src={profile.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
            </div>
          </div>
        </div>

        {/* ═══ CONTENT AREA ═══ */}
        {/* MAP */}
        <div style={{display:nav==="map"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden",position:"relative"}}>
          {/* Map fullscreen */}
          <div ref={mapRef} style={{position:"absolute",inset:0}}/>

          {/* Search overlay */}
          <div style={{position:"absolute",top:12,left:12,right:12,zIndex:10}}>
            <div style={{background:C.glass,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:16,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(27,45,91,0.15)",border:`1px solid rgba(255,255,255,0.6)`}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar serviços..."
                style={{background:"transparent",border:"none",outline:"none",color:C.navy,fontSize:14,flex:1,fontFamily:"Outfit,sans-serif"}}/>
              {q&&<button onClick={()=>setQ("")} style={{background:"none",border:"none",color:C.textLight,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
            </div>
          </div>

          {/* Category pills overlay */}
          <div style={{position:"absolute",top:68,left:12,right:12,zIndex:10,display:"flex",gap:8}}>
            {CATS.map(cat=>{
              const active=tab===cat.id;
              return<button key={cat.id} onClick={()=>{setTab(cat.id);setF24(false);}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:99,border:"none",cursor:"pointer",background:active?cat.color:C.glass,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",color:active?C.white:C.navy,fontSize:12,fontWeight:700,fontFamily:"Outfit,sans-serif",boxShadow:active?"0 4px 14px "+cat.color+"55":"0 2px 8px rgba(27,45,91,0.1)",border:active?"none":`1px solid rgba(255,255,255,0.6)`,transition:"all 0.2s",WebkitTapHighlightColor:"transparent",flexShrink:0}}>
                {cat.icon} {cat.label}
              </button>;
            })}
          </div>

          {/* GPS + 24h buttons */}
          <div style={{position:"absolute",bottom:220,right:12,zIndex:10,display:"flex",flexDirection:"column",gap:8}}>
            {searched&&!busy&&<button onClick={()=>setF24(v=>!v)} style={{background:f24?C.green:C.glass,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:f24?"none":`1px solid rgba(255,255,255,0.6)`,borderRadius:12,padding:"8px 12px",color:f24?C.white:C.textMid,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Outfit,sans-serif",boxShadow:"0 2px 12px rgba(27,45,91,0.12)",WebkitTapHighlightColor:"transparent"}}>
              🕐 24h
            </button>}
            <button onClick={gps} disabled={busy} style={{background:busy?C.glass:C.navy,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:busy?`1px solid rgba(255,255,255,0.6)`:"none",borderRadius:12,padding:"10px 14px",color:busy?C.textMid:C.white,fontSize:12,fontWeight:700,cursor:busy?"not-allowed":"pointer",fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 16px rgba(27,45,91,0.25)",WebkitTapHighlightColor:"transparent"}}>
              {busy?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 0.8s linear infinite"}}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>}
              {busy?"...":"GPS"}
            </button>
          </div>

          {locErr&&<div style={{position:"absolute",top:120,left:12,right:12,zIndex:10,background:C.red,borderRadius:12,padding:"10px 14px",fontSize:12,color:C.white,fontWeight:500}}>{locErr}</div>}

          {/* Bottom sheet — services */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:20}}>
            <div style={{background:C.glass,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:"24px 24px 0 0",boxShadow:"0 -4px 30px rgba(27,45,91,0.12)",border:"1px solid rgba(255,255,255,0.7)",borderBottom:"none"}}>
              {/* Handle */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 8px"}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:C.navy}}>Serviços Próximos</div>
                  {searched&&!busy&&<div style={{fontSize:11,color:C.textLight,marginTop:1}}>{filteredPlaces.length} resultado{filteredPlaces.length!==1?"s":""}{f24?" · 24h":""}</div>}
                </div>
                <div style={{width:40,height:4,borderRadius:2,background:C.borderMid}}/>
              </div>

              {/* Horizontal cards */}
              <div style={{overflowX:"auto",paddingBottom:16,WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"flex",gap:10,padding:"4px 16px 0",width:"max-content"}}>

                  {!searched&&!busy&&<div style={{width:200,background:"rgba(255,255,255,0.6)",borderRadius:16,padding:"16px",border:"1px solid "+C.border,display:"flex",flexDirection:"column",alignItems:"center",gap:8,minHeight:100,justifyContent:"center"}}>
                    <span style={{fontSize:28}}>📍</span>
                    <div style={{fontSize:12,color:C.textMid,textAlign:"center",lineHeight:1.5}}>Toque em <strong style={{color:C.navy}}>GPS</strong> para buscar</div>
                  </div>}

                  {busy&&[1,2,3].map(i=><div key={i} style={{width:180,background:"rgba(255,255,255,0.6)",borderRadius:16,padding:14,border:"1px solid "+C.border,opacity:0.6,minHeight:100}}>
                    {[55,35,70].map((w,j)=><div key={j} style={{height:j===0?13:9,background:C.surface,borderRadius:5,marginBottom:8,width:`${w}%`}}/>)}
                    <div style={{height:32,background:C.surface,borderRadius:8,marginTop:8}}/>
                  </div>)}

                  {!busy&&filteredPlaces.map((place,i)=>{
                    const dist=loc?dl(gd(loc.lat,loc.lng,place.geometry.location.lat(),place.geometry.location.lng())):null;
                    const phone=place.formatted_phone_number||place.international_phone_number;
                    const wurl=wa(phone);
                    const open=place.opening_hours?.isOpen?.()??null;
                    const is24=h24(place);
                    const murl=`https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}`;
                    return<div key={place.place_id||i} className="card" style={{animationDelay:i*0.04+"s",width:210,background:"rgba(255,255,255,0.85)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderRadius:18,padding:14,border:`1px solid ${is24?"rgba(29,176,105,0.3)":C.border}`,flexShrink:0,boxShadow:"0 4px 16px rgba(27,45,91,0.08)",position:"relative",overflow:"hidden"}}>
                      {is24&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.green},${C.accent})`}}/>}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                        <div onClick={()=>focusPlace(place)} style={{fontSize:13,fontWeight:700,color:C.navy,lineHeight:1.3,flex:1,paddingRight:6,cursor:"pointer",borderBottom:`1px dashed ${C.border}`}}>{place.name}</div>
                        {dist&&<span style={{fontSize:11,fontWeight:800,color:activeCat?.color,background:`${activeCat?.color}15`,padding:"2px 7px",borderRadius:99,whiteSpace:"nowrap",flexShrink:0}}>{dist}</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,margin:"5px 0"}}>
                        <Stars rating={place.rating}/>
                        {open!==null&&<span style={{fontSize:10,color:open?C.green:C.red,fontWeight:700,marginLeft:"auto"}}>{open?"●  Aberto":"● Fechado"}</span>}
                      </div>
                      {is24&&<span style={{fontSize:9,fontWeight:800,color:C.green,background:"rgba(29,176,105,0.1)",padding:"2px 6px",borderRadius:99,border:`1px solid rgba(29,176,105,0.2)`}}>24 HORAS</span>}
                      {place.vicinity&&<div style={{fontSize:10,color:C.textLight,marginTop:5,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{place.vicinity}</div>}
                      <div style={{display:"flex",gap:6,marginTop:10}}>
                        {phone&&<a href={wurl||`tel:${phone}`} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"8px 0",borderRadius:10,background:wurl?"rgba(37,211,102,0.1)":C.surface,color:wurl?"#25D366":C.textMid,border:wurl?"1px solid rgba(37,211,102,0.2)":"1px solid "+C.border,textDecoration:"none",fontSize:11,fontWeight:700}}>
                          {wurl?"💬":"📞"}{wurl?"WA":"Ligar"}
                        </a>}
                        <a href={murl} target="_blank" rel="noreferrer" style={{flex:phone?1.4:2,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"8px 0",borderRadius:10,background:activeCat?.color,color:C.white,textDecoration:"none",fontSize:11,fontWeight:700}}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>Rota
                        </a>
                      </div>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FUEL ═══ */}
        <div style={{display:nav==="fuel"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
          <div ref={nav==="fuel"?scrollRef:null} style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:80}}>

            {/* Hero gauge */}
            <div style={{background:`linear-gradient(160deg,${C.navyDark},${C.navy})`,padding:"24px 20px 28px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(107,156,232,0.08)"}}/>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>Combustível</div>

              {tankCap>0?(
                <div style={{display:"flex",alignItems:"center",gap:20}}>
                  <AnimGauge pct={fuelPct} color={fuelColor} size={150}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:4}}>Autonomia est.</div>
                    <div style={{fontSize:28,fontWeight:800,color:C.white,lineHeight:1}}>{Math.round(fuelLiters*kmpl)}<span style={{fontSize:14,fontWeight:500,marginLeft:4}}>km</span></div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:6}}>{fuelLiters.toFixed(1)}L / {tankCap}L</div>
                    {fuelPct<=(reserveL/tankCap*100)&&<div style={{marginTop:8,background:"rgba(232,64,64,0.2)",border:"1px solid rgba(232,64,64,0.4)",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#FF8080",fontWeight:600}}>⚠️ Reserva!</div>}
                  </div>
                </div>
              ):<div style={{color:"rgba(255,255,255,0.4)",fontSize:14}}>Configure o tanque no Perfil</div>}

              {/* Stats row */}
              {fuel.length>0&&<div style={{display:"flex",gap:10,marginTop:20}}>
                {[
                  {label:"Total gasto",value:`R$ ${totalSpent.toFixed(0)}`},
                  {label:"Preço médio",value:`R$ ${avgPrice.toFixed(2)}/L`},
                  {label:"Registros",value:`${fuel.length}x`},
                ].map((s,i)=><div key={i} style={{flex:1,background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 8px",textAlign:"center",border:"1px solid rgba(255,255,255,0.1)"}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.white}}>{s.value}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginTop:2,textTransform:"uppercase",letterSpacing:0.5}}>{s.label}</div>
                </div>)}
              </div>}
            </div>

            <div style={{padding:"20px 16px 0"}}>
              <PrimaryBtn onClick={()=>setFuelSheet(true)}>⛽ Registrar Abastecimento</PrimaryBtn>

              {fuel.length>0&&<>
                <div style={{fontSize:14,fontWeight:700,color:C.navy,margin:"20px 0 12px"}}>Histórico</div>
                {fuel.map((f,i)=>{
                  const total=(parseFloat(f.liters)||0)*(parseFloat(f.pricePerLiter)||0);
                  const fDelay=i*0.04+"s";
                  return<div key={f.id} className="card" style={{animationDelay:fDelay,background:C.white,borderRadius:16,padding:"14px 16px",marginBottom:10,border:"1px solid "+C.border,boxShadow:"0 2px 8px rgba(27,45,91,0.05)",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:44,height:44,borderRadius:12,background:C.offWhite,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>⛽</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontSize:15,fontWeight:700,color:C.navy}}>{parseFloat(f.liters).toFixed(1)}L</span>
                        {f.tankFull&&<span style={{fontSize:9,fontWeight:800,color:C.green,background:"rgba(29,176,105,0.1)",padding:"2px 6px",borderRadius:99}}>CHEIO</span>}
                      </div>
                      <div style={{fontSize:11,color:C.textLight}}>{f.date}{f.km?` · ${parseInt(f.km).toLocaleString()} km`:""}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:15,fontWeight:800,color:C.orange}}>R${total.toFixed(2)}</div>
                      <div style={{fontSize:10,color:C.textLight}}>R${parseFloat(f.pricePerLiter||0).toFixed(2)}/L</div>
                    </div>
                    <button onClick={()=>delFuel(f.id)} style={{background:"none",border:"none",color:C.textLight,cursor:"pointer",fontSize:16,padding:"4px",flexShrink:0}}>🗑</button>
                  </div>;
                })}
              </>}
            </div>
          </div>
        </div>

        {/* ═══ MANUT ═══ */}
        <div style={{display:nav==="maint"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:80}}>

            {/* Header */}
            <div style={{background:`linear-gradient(160deg,${C.navyDark},${C.navy})`,padding:"24px 20px 28px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(107,156,232,0.08)"}}/>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Manutenção</div>
              <div style={{fontSize:26,fontWeight:800,color:C.white,lineHeight:1.1}}>{profile.moto||"Sua Moto"}</div>
              {profile.currentKm&&<div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:4}}>{parseInt(profile.currentKm).toLocaleString()} km rodados</div>}

              {/* Alerts summary */}
              {manut.length>0&&(()=>{
                const overdue=manut.filter(m=>{const a=manutAlert(m);return a&&a.diff<=0;}).length;
                const soon=manut.filter(m=>{const a=manutAlert(m);return a&&a.diff>0&&a.diff<=500;}).length;
                return(overdue>0||soon>0)&&<div style={{display:"flex",gap:8,marginTop:16}}>
                  {overdue>0&&<div style={{background:"rgba(232,64,64,0.2)",border:"1px solid rgba(232,64,64,0.3)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#FF8080",fontWeight:600}}>🚨 {overdue} vencida{overdue>1?"s":""}</div>}
                  {soon>0&&<div style={{background:"rgba(240,125,26,0.2)",border:"1px solid rgba(240,125,26,0.3)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#FFB070",fontWeight:600}}>⚠️ {soon} próxima{soon>1?"s":""}</div>}
                </div>;
              })()}
            </div>

            <div style={{padding:"20px 16px 0"}}>
              <PrimaryBtn onClick={()=>setManutSheet(true)}>🔧 Registrar Manutenção</PrimaryBtn>

              {manut.length>0&&<>
                <div style={{fontSize:14,fontWeight:700,color:C.navy,margin:"20px 0 12px"}}>Histórico</div>

                {/* Timeline */}
                <div style={{position:"relative"}}>
                  <div style={{position:"absolute",left:21,top:0,bottom:0,width:2,background:C.border}}/>
                  {manut.map((item,i)=>{
                    const tdef=MANUT.find(t=>t.id===item.type);
                    const label=item.type==="other"?item.customLabel:tdef?.label;
                    const alert=manutAlert(item);
                    const ac=alert?(alert.diff<=0?C.red:alert.diff<=500?C.orange:C.green):C.accent;
                    return<div key={item.id} className="card" style={{animationDelay:`${i*0.04}s`,display:"flex",gap:12,marginBottom:14,position:"relative"}}>
                      {/* Timeline dot */}
                      <div style={{width:44,height:44,borderRadius:"50%",background:C.white,border:"2.5px solid "+ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,zIndex:1,boxShadow:"0 0 0 4px "+ac+"18"}}>
                        {tdef?.icon}
                      </div>
                      <div style={{flex:1,background:C.white,borderRadius:16,padding:"12px 14px",border:`1px solid ${alert&&alert.diff<=500?"rgba(240,125,26,0.25)":C.border}`,boxShadow:"0 2px 8px rgba(27,45,91,0.05)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                          <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{label}</div>
                          {alert&&<span style={{fontSize:10,fontWeight:800,color:ac,background:ac+"15",padding:"2px 8px",borderRadius:99,border:"1px solid "+ac+"30",whiteSpace:"nowrap",marginLeft:6,flexShrink:0}}>{alert.diff<=0?"VENCIDA":alert.diff<=500?alert.diff+"km":parseInt(alert.nk).toLocaleString()+"km"}</span>}
                        </div>
                        <div style={{fontSize:11,color:C.textLight,marginBottom:item.product?4:0}}>{item.date}{item.km?` · ${parseInt(item.km).toLocaleString()} km`:""}</div>
                        {item.product&&<div style={{fontSize:12,color:C.textMid}}>📦 {item.product}</div>}
                        <button onClick={()=>delManut(item.id)} style={{background:"none",border:"none",color:C.textLight,cursor:"pointer",fontSize:11,padding:"4px 0 0",fontFamily:"Outfit,sans-serif"}}>🗑 Remover</button>
                      </div>
                    </div>;
                  })}
                </div>
              </>}
            </div>
          </div>
        </div>

        {/* ═══ PROFILE ═══ */}
        <div style={{display:nav==="profile"?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:80}}>

            {/* Cover + Avatar */}
            <div style={{background:`linear-gradient(160deg,${C.navyDark},${C.navyMid})`,padding:"24px 20px 60px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(107,156,232,0.08)"}}/>
              <div style={{position:"absolute",bottom:-40,left:-20,width:120,height:120,borderRadius:"50%",background:"rgba(107,156,232,0.05)"}}/>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>Meu Perfil</div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"3px solid rgba(255,255,255,0.3)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0}}>
                  {profile.photoUrl?<img src={profile.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
                </div>
                <div>
                  <div style={{fontSize:22,fontWeight:800,color:C.white,lineHeight:1.1}}>{profile.name||"Sem nome"}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:3}}>{profile.moto||"Moto não cadastrada"}{profile.year?` · ${profile.year}`:""}</div>
                </div>
              </div>
            </div>

            {/* Stats cards - overlap cover */}
            <div style={{margin:"-28px 16px 0",display:"flex",gap:10,position:"relative",zIndex:2}}>
              {[
                {label:"km atual",value:profile.currentKm?parseInt(profile.currentKm).toLocaleString():"—",icon:"🏁"},
                {label:"km/litro",value:profile.kmpl||"—",icon:"⚡"},
                {label:"tanque",value:profile.tankL?`${profile.tankL}L`:"—",icon:"🛢️"},
              ].map((s,i)=><div key={i} style={{flex:1,background:C.white,borderRadius:16,padding:"14px 8px",textAlign:"center",boxShadow:"0 4px 20px rgba(27,45,91,0.12)",border:"1px solid "+C.border}}>
                <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:15,fontWeight:800,color:C.navy,lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:9,color:C.textLight,marginTop:3,textTransform:"uppercase",letterSpacing:0.5}}>{s.label}</div>
              </div>)}
            </div>

            <div style={{padding:"20px 16px 0"}}>
              {!editProfile?(
                <PrimaryBtn onClick={()=>setEditProfile({...profile})}>✏️ Editar Perfil</PrimaryBtn>
              ):(
                <div style={{background:C.white,borderRadius:20,padding:"20px 16px",border:"1px solid "+C.border,boxShadow:"0 4px 20px rgba(27,45,91,0.08)"}}>
                  <div style={{fontSize:15,fontWeight:700,color:C.navy,marginBottom:16}}>Editar informações</div>
                  <Field label="Seu nome" value={editProfile.name} onChange={v=>setEditProfile(p=>({...p,name:v}))} placeholder="Victor"/>
                  <Field label="URL da foto" value={editProfile.photoUrl||""} onChange={v=>setEditProfile(p=>({...p,photoUrl:v}))} placeholder="https://..."/>
                  <Field label="Modelo da moto" value={editProfile.moto} onChange={v=>setEditProfile(p=>({...p,moto:v}))} placeholder="Yamaha Crosser ZTX"/>
                  <Field label="Ano" value={editProfile.year} onChange={v=>setEditProfile(p=>({...p,year:v}))} type="number" placeholder="2019"/>
                  <Field label="Consumo (km/litro)" value={editProfile.kmpl} onChange={v=>setEditProfile(p=>({...p,kmpl:v}))} type="number" placeholder="36"/>
                  <Field label="Capacidade do tanque (L)" value={editProfile.tankL} onChange={v=>setEditProfile(p=>({...p,tankL:v}))} type="number" placeholder="12"/>
                  <Field label="Litros de reserva" value={editProfile.reserveL||""} onChange={v=>setEditProfile(p=>({...p,reserveL:v}))} type="number" placeholder="3"/>
                  <Field label="Quilometragem atual" value={editProfile.currentKm} onChange={v=>setEditProfile(p=>({...p,currentKm:v}))} type="number" placeholder="77903"/>
                  <div style={{display:"flex",gap:10,marginTop:4}}>
                    <button onClick={()=>setEditProfile(null)} style={{flex:1,padding:"13px",borderRadius:14,border:`1.5px solid ${C.border}`,background:"transparent",color:C.textMid,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>Cancelar</button>
                    <div style={{flex:2}}><PrimaryBtn onClick={()=>saveProfile(editProfile)} disabled={saving}>{saving?"Salvando...":"Salvar"}</PrimaryBtn></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ BOTTOM NAV ═══ */}
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:50}}>
          <div style={{background:"rgba(255,255,255,0.88)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid "+C.border,padding:"10px 0 28px",display:"flex",boxShadow:"0 -4px 24px rgba(27,45,91,0.1)"}}>
            {[
              {id:"map",label:"Mapa",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>},
              {id:"fuel",label:"Combustível",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22V8l9-6 9 6v14"/><path d="M9 22V12h6v10"/></svg>},
              {id:"maint",label:"Manutenção",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>},
              {id:"profile",label:"Perfil",icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
            ].map(item=>{
              const active=nav===item.id;
              return<button key={item.id} onClick={()=>setNav(item.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",color:active?C.navy:C.textLight,fontFamily:"Outfit,sans-serif",WebkitTapHighlightColor:"transparent",transition:"all 0.15s",position:"relative"}}>
                {active&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",width:32,height:3,borderRadius:"0 0 3px 3px",background:C.navy}}/>}
                {item.icon}
                <span style={{fontSize:10,fontWeight:active?700:400}}>{item.label}</span>
              </button>;
            })}
          </div>
        </div>

        {/* ═══ SHEETS ═══ */}
        {fuelSheet&&<Sheet title="Registrar Abastecimento" onClose={()=>setFuelSheet(false)}>
          <Field label="Litros abastecidos" value={ff.liters} onChange={v=>setFf(f=>({...f,liters:v}))} type="number" placeholder="Ex: 12.5"/>
          <Field label="Preço por litro (R$)" value={ff.pricePerLiter} onChange={v=>setFf(f=>({...f,pricePerLiter:v}))} type="number" placeholder="Ex: 6.49"/>
          <Field label="Quilometragem atual" value={ff.km} onChange={v=>setFf(f=>({...f,km:v}))} type="number" placeholder="Ex: 77903"/>
          <Field label="Data" value={ff.date} onChange={v=>setFf(f=>({...f,date:v}))} type="date"/>

          <div onClick={()=>setFf(f=>({...f,tankFull:!f.tankFull}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:ff.tankFull?"rgba(29,176,105,0.06)":C.offWhite,border:`1.5px solid ${ff.tankFull?C.green:C.border}`,borderRadius:14,padding:"13px 14px",marginBottom:16,cursor:"pointer"}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:ff.tankFull?C.green:C.navy}}>🔋 Completei o tanque</div>
              <div style={{fontSize:11,color:C.textLight,marginTop:2}}>Indicador vai para 100%</div>
            </div>
            <div style={{width:46,height:26,borderRadius:99,background:ff.tankFull?C.green:C.surface,position:"relative",transition:"background 0.2s",flexShrink:0,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.1)"}}>
              <div style={{position:"absolute",top:3,left:ff.tankFull?22:3,width:20,height:20,borderRadius:"50%",background:C.white,transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
            </div>
          </div>

          {ff.liters&&ff.pricePerLiter&&<div style={{background:`${C.orange}10`,borderRadius:12,padding:"10px 13px",marginBottom:16,fontSize:13,color:C.orange,fontWeight:700}}>
            Total: R$ {((parseFloat(ff.liters)||0)*(parseFloat(ff.pricePerLiter)||0)).toFixed(2)}
            {ff.tankFull?" · Tanque 100% ✓":tankCap>0&&` · ${Math.min(100,Math.round((parseFloat(ff.liters)/tankCap)*100))}% do tanque`}
          </div>}
          <PrimaryBtn onClick={saveFuel} disabled={!ff.liters||!ff.pricePerLiter}>Salvar Abastecimento</PrimaryBtn>
        </Sheet>}

        {manutSheet&&<Sheet title="Registrar Manutenção" onClose={()=>setManutSheet(false)}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:C.textMid,marginBottom:10,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase"}}>Tipo</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {MANUT.map(t=><button key={t.id} onClick={()=>setMf(f=>({...f,type:t.id}))} style={{padding:"8px 12px",borderRadius:12,border:`1.5px solid ${mf.type===t.id?C.navy:C.border}`,background:mf.type===t.id?C.navy:"transparent",color:mf.type===t.id?C.white:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:5}}>
                {t.icon} {t.label}
              </button>)}
            </div>
          </div>
          {mf.type==="other"&&<Field label="Descrição" value={mf.customLabel} onChange={v=>setMf(f=>({...f,customLabel:v}))} placeholder="Ex: Limpeza do carburador"/>}
          <Field label="Produto/Marca" value={mf.product} onChange={v=>setMf(f=>({...f,product:v}))} placeholder="Ex: Motul 10W-30"/>
          <Field label="Quilometragem" value={mf.km} onChange={v=>setMf(f=>({...f,km:v}))} type="number" placeholder="Ex: 77903"/>
          <Field label="Data" value={mf.date} onChange={v=>setMf(f=>({...f,date:v}))} type="date"/>
          {mf.type!=="other"&&MANUT.find(t=>t.id===mf.type)?.kmAlert&&<div style={{background:`${C.accent}10`,borderRadius:12,padding:"10px 13px",marginBottom:16,fontSize:12,color:C.accent,fontWeight:600}}>
            ℹ️ Próxima troca sugerida em {MANUT.find(t=>t.id===mf.type)?.kmAlert?.toLocaleString()} km
          </div>}
          <PrimaryBtn onClick={saveManut} disabled={mf.type==="other"&&!mf.customLabel}>Salvar Manutenção</PrimaryBtn>
        </Sheet>}

        {/* ═══ KM CHECK DIÁRIO ═══ */}
        {kmCheckVisible&&(
          <div style={{position:"fixed",inset:0,background:"rgba(10,18,40,0.75)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
            <div style={{background:C.white,borderRadius:28,padding:"28px 24px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(27,45,91,0.25)",animation:"pop 0.3s cubic-bezier(.34,1.56,.64,1) both"}}>

              {/* Header */}
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,"+C.navyDark+","+C.navy+")",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28}}>🏍️</div>
                <div style={{fontSize:11,color:C.textLight,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Check diário · {new Date().toLocaleDateString("pt-BR",{weekday:"long"})}</div>
                <div style={{fontSize:22,fontWeight:800,color:C.navy,lineHeight:1.2}}>Qual a quilometragem da sua moto agora?</div>
                <div style={{fontSize:13,color:C.textMid,marginTop:8,lineHeight:1.5}}>
                  Isso atualiza o nível de combustível e os alertas de manutenção automaticamente.
                </div>
              </div>

              {/* Última km conhecida */}
              {profile.currentKm&&(
                <div style={{background:C.offWhite,borderRadius:12,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:C.textMid}}>Última km registrada</span>
                  <span style={{fontSize:14,fontWeight:800,color:C.navy}}>{parseInt(profile.currentKm).toLocaleString()} km</span>
                </div>
              )}

              {/* Input */}
              <div style={{marginBottom:8}}>
                <input
                  type="number"
                  value={kmInput}
                  onChange={e=>setKmInput(e.target.value)}
                  placeholder={"Ex: "+((parseInt(profile.currentKm)||77903)+50)}
                  autoFocus
                  style={{width:"100%",background:C.offWhite,border:"2px solid "+(kmInput&&parseInt(kmInput)>0?C.navy:C.border),borderRadius:14,padding:"14px 16px",color:C.navy,fontSize:18,fontWeight:700,outline:"none",fontFamily:"Outfit,sans-serif",textAlign:"center",WebkitAppearance:"none",transition:"border-color 0.2s"}}
                />
              </div>

              {/* Preview do combustível */}
              {kmInput&&parseInt(kmInput)>0&&fuel.length>0&&(()=>{
                const km=parseInt(kmInput);
                const lastFuel=fuel[0];
                const lastKm=parseInt(lastFuel.km)||0;
                const lastLiters=lastFuel.tankFull?(parseFloat(profile.tankL)||12):parseFloat(lastFuel.liters)||0;
                const kmRodados=km-(parseInt(profile.currentKm)||0);
                const kmDesdeAbast=km-lastKm;
                const kmplVal=parseFloat(profile.kmpl)||36;
                const consumed=Math.max(0,kmDesdeAbast/kmplVal);
                const remaining=Math.max(0,lastLiters-consumed);
                const pct=tankCap>0?Math.min(100,Math.round((remaining/tankCap)*100)):0;
                const pctColor=pct>50?C.green:pct>25?C.orange:C.red;
                return kmRodados>0&&lastKm>0?(
                  <div style={{background:"rgba(27,45,91,0.04)",borderRadius:12,padding:"12px 14px",marginBottom:16,border:"1px solid "+C.border}}>
                    <div style={{fontSize:11,color:C.textMid,marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Preview após atualização</div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,color:C.textLight}}>Km rodados hoje</div>
                        <div style={{fontSize:16,fontWeight:800,color:C.navy}}>+{kmRodados.toLocaleString()} km</div>
                      </div>
                      <div style={{flex:1,textAlign:"center"}}>
                        <div style={{fontSize:11,color:C.textLight}}>Combustível restante</div>
                        <div style={{fontSize:20,fontWeight:900,color:pctColor}}>{pct}%</div>
                        <div style={{fontSize:10,color:C.textLight}}>{remaining.toFixed(1)}L</div>
                      </div>
                    </div>
                  </div>
                ):null;
              })()}

              {/* Buttons */}
              <div style={{display:"flex",gap:10}}>
                <button onClick={dismissKmCheck} style={{flex:1,padding:"13px",borderRadius:14,border:"1.5px solid "+C.border,background:"transparent",color:C.textMid,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>
                  Agora não
                </button>
                <div style={{flex:2}}>
                  <PrimaryBtn
                    onClick={saveKmCheck}
                    disabled={kmSaving||!kmInput||parseInt(kmInput)<1000}
                  >
                    {kmSaving?"Salvando...":"Atualizar"}
                  </PrimaryBtn>
                </div>
              </div>

              <div style={{textAlign:"center",marginTop:12,fontSize:11,color:C.textLight}}>
                Aparece uma vez por dia · Próxima pergunta amanhã às 12h
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
