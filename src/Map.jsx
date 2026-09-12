import {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Building2, Camera, Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSun, Eye, Maximize, Menu, Moon, Pause, Play, RotateCcw, Sun, Sunrise, Sunset, TreePine, Volume2, VolumeX, Waves, X, Zap} from 'lucide-react';
import {createMap} from './createMap.js';
import {WEATHER_PRESETS} from './weatherPresets.js';
import SceneSelect from './SceneSelect.jsx';
import RadioPlayer from './RadioPlayer.jsx';
import WeatherBadge from './WeatherBadge.jsx';
import CityNavigation from './CityNavigation.jsx';
import CityPlaces from './CityPlaces.jsx';
import {LANDMARKS, ALL_LANDMARKS} from './landmarks.js';
import {coordinateLabel} from './cityNavigation.js';
import ModelLibrary from './ModelLibrary.jsx';
import LandmarkDetails from './LandmarkDetails.jsx';
import {LANDMARK_STORIES} from './landmarkStories.js';
import ExplorationControls from './ExplorationControls.jsx';
import {createAudioAmbience} from './audioAmbience.js';

const compactQuery = '(max-width: 760px), (max-height: 500px) and (max-width: 1100px)';
const cameraNames = ['Aerial', 'City overview', 'Lakeside'];
const cameraIcons = [Camera, Building2, Waves];
const lightingOptions = [
  {value:'morning', label:'Morning', description:'A low sun over the lake', icon:Sunrise},
  {value:'daylight', label:'Daylight', description:'Soft sun & natural colors', icon:Sun},
  {value:'golden', label:'Golden hour', description:'A warm, low evening sun', icon:Sunset},
  {value:'night', label:'Night', description:'A lit skyline under the stars', icon:Moon},
];
const weatherIcons = {clear:CloudSun, cloudy:Cloud, rain:CloudDrizzle, heavy:CloudRain, storm:CloudLightning};
const weatherOptions = Object.entries(WEATHER_PRESETS).map(([value,preset]) => ({value,...preset,icon:weatherIcons[value]}));

export default function Map() {
  const stage = useRef(null), viewer = useRef(null), credits = useRef(null), cameraTabs = useRef([]);
  const navigation=useRef(null),library=useRef(null),menu=useRef(null),menuTrigger=useRef(null);
  const [compact,setCompact]=useState(()=>matchMedia(compactQuery).matches);
  const [menuOpen,setMenuOpen]=useState(false),[showTags,setShowTags]=useState(true),[arrived,setArrived]=useState(null);
  const [infoId,setInfoId]=useState(null),[libraryOpen,setLibraryOpen]=useState(false);
  const infoPlace=(ALL_LANDMARKS||LANDMARKS).find(place=>place.id===infoId);
  const [landmark,setLandmark]=useState(null);
  const selectedPlace=(ALL_LANDMARKS||LANDMARKS).find(place=>place.id===landmark);
  const [ready, setReady] = useState(false), [progress, setProgress] = useState(0);
  const [error, setError] = useState(''), [camera, setCamera] = useState(0);
  const [trees, setTrees] = useState(true), [metadata, setMetadata] = useState(null);
  const [background, setBackground] = useState('Loading distant skyline…');
  const [notice, setNotice] = useState('');
  const [lighting, setLighting] = useState('daylight');
  const [weather, setWeather] = useState('clear'), [openControl, setOpenControl] = useState(null);
  const [lightning, setLightning] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [animated, setAnimated] = useState(false);
  const [explorationMode, setExplorationMode] = useState('orbit');
  const [walkSpot, setWalkSpot] = useState('galle_face');
  const [tukData, setTukData] = useState({ speedKmH: 36, tukIndex: 0, totalTuks: 36 });
  const [tourData, setTourData] = useState({ waypoint: null, index: 0, total: 7, isPaused: false, progress: 0 });
  const [audioPlaying, setAudioPlaying] = useState(false);
  const ambienceRef = useRef(null);
  const openLight = useCallback(open => setOpenControl(open ? 'light' : null), []);
  const openWeather = useCallback(open => setOpenControl(open ? 'weather' : null), []);

  useEffect(() => {
    let active = true;
    setReady(false); setError(''); setProgress(0);
    setLighting('daylight'); setWeather('clear'); setAnimated(false); setTrees(true); setLightning(true); setOpenControl(null);
    setLandmark(null); setExplorationMode('orbit');
    ambienceRef.current = createAudioAmbience();
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const preferenceChanged = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', preferenceChanged);
    try {
      viewer.current = createMap(stage.current, {
        onReady: () => active && setReady(true),
        onProgress: n => active && setProgress(n),
        onError: e => active && setError(e),
        onCamera: n => active && setCamera(n),
        onMetadata: m => active && setMetadata(m),
        onBackground: s => active && setBackground(s),
        onAnimation: enabled => active && setAnimated(enabled),
        onLandmark: id => {if(active){setLandmark(id);setArrived(null);}},
        onArrival: id => active && setArrived(id),
        onView: view => active && navigation.current?.update(view),
        onModeChange: (m, details) => {
          if (active) {
            setExplorationMode(m);
            if (details?.spot) setWalkSpot(details.spot);
          }
        },
        onTukTukTelemetry: data => active && setTukData(data),
        onTourTelemetry: data => active && setTourData(data),
        onEngineAudio: (spd, throt) => {
          if (active && ambienceRef.current && ambienceRef.current.isPlaying) {
            ambienceRef.current.updateTukTukEngine(spd, throt);
          }
        },
        onHonkHorn: () => {
          if (active && ambienceRef.current) {
            ambienceRef.current.playTukTukHorn();
          }
        },
      });
    } catch (failure) { setError(failure.message); }
    return () => {
      active = false;
      preference.removeEventListener('change', preferenceChanged);
      ambienceRef.current?.dispose();
      ambienceRef.current = null;
      viewer.current?.dispose();
      viewer.current = null;
    };
  }, []);

  useEffect(()=>{viewer.current?.suspend(libraryOpen);},[libraryOpen]);
  useEffect(()=>{
    const media=matchMedia(compactQuery);
    const changed=()=>{setCompact(media.matches);setMenuOpen(false);setOpenControl(null);};
    media.addEventListener('change',changed);
    return()=>media.removeEventListener('change',changed);
  },[]);
  useEffect(()=>{
    const panel=menu.current;
    if(compact){
      if(menuOpen&&!panel.open){panel.showModal();panel.querySelector('.map-menu-scroll').scrollTop=0;}
      else if(!menuOpen&&panel.open)panel.close();
    }else{
      // The same controls stay mounted at desktop positions, including live audio.
      if(panel.matches(':modal'))panel.close();
      panel.setAttribute('open','');
    }
  },[compact,menuOpen]);
  function closeMenu(){
    setOpenControl(null);
    if(compact){menu.current?.close();setMenuOpen(false);menuTrigger.current?.focus();}
  }
  function explorePlace(id){closeMenu();setInfoId(null);viewer.current?.landmark(id);}
  function changeCamera(index){closeMenu();viewer.current?.camera(index);}
  function libraryChanged(open){
    setLibraryOpen(open);
    if(open)closeMenu();
    else if(compact)menuTrigger.current?.focus();
  }

  async function fullscreen() {
    closeMenu();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setNotice('');
    } catch { setNotice('Fullscreen is unavailable here. The map still fills this window.'); }
  }

  function toggleTrees() {
    viewer.current?.trees(!trees);
    setTrees(!trees);
  }

  function handleModeChange(m, options={}) {
    setExplorationMode(m);
    viewer.current?.setMode(m, options);
  }
  function handleWalkSpot(spot) {
    setWalkSpot(spot);
    viewer.current?.setMode('walk', { spot });
  }
  function handleWalkMove(move) {
    viewer.current?.walkMoveDir(move);
  }
  function handleNextTuk() {
    viewer.current?.nextTukTuk();
  }
  function handleTukPerspective(p) {
    viewer.current?.setTukTukPerspective(p);
  }
  function handleTukDriveMode(m) {
    viewer.current?.setTukTukDriveMode(m);
  }
  function handleTukMove(move) {
    viewer.current?.setTukTukInput(move);
  }
  function handleHonk() {
    ambienceRef.current?.playTukTukHorn();
  }
  function handleTourAction(act) {
    viewer.current?.tourAction(act);
  }
  function toggleAmbience() {
    if (!ambienceRef.current) return;
    const playing = ambienceRef.current.toggle();
    setAudioPlaying(playing);
  }

  return <main className={`map${compact?' is-compact':''}`} aria-label="Colombo Map">
    <div className="map-stage" id="map-scene" role="tabpanel" aria-labelledby={camera===null?'landmark-caption':`camera-${camera}`} ref={stage} />
    <div className="map-shade" />
    <header className="map-header">
      <div className="map-brand"><strong>COLOMBO</strong><span>CITY ATLAS</span><WeatherBadge/></div>
      <button className="map-menu-trigger" ref={menuTrigger} aria-label="Open map menu" aria-haspopup="dialog" aria-controls="map-menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu/><span>Menu</span></button>
    </header>
    <CityNavigation ref={navigation} ready={ready} selected={landmark} onSelect={explorePlace} showTags={showTags}/>
    {ready && !error && (
      <ExplorationControls
        mode={explorationMode}
        onModeChange={handleModeChange}
        walkSpot={walkSpot}
        onWalkSpotChange={handleWalkSpot}
        onWalkMove={handleWalkMove}
        tukData={tukData}
        onNextTukTuk={handleNextTuk}
        onTukPerspectiveChange={handleTukPerspective}
        onTukDriveModeChange={handleTukDriveMode}
        onTukMove={handleTukMove}
        onHonkHorn={handleHonk}
        tourData={tourData}
        onTourAction={handleTourAction}
      />
    )}
    {ready && !error && explorationMode === 'orbit' && <footer className="map-footer">
      <div className="map-caption">
        <span className="landmark-eyebrow">{selectedPlace?'A CLOSER LOOK':'EXPLORE SRI LANKA'}</span>
        <h1 id="landmark-caption" lang="si">{selectedPlace?.sinhala||'කොළඹ'}</h1>
        <span className="landmark-tamil" lang="ta">{selectedPlace?LANDMARK_STORIES[selectedPlace.id].tamil:'கொழும்பு'}</span>
        <span className="landmark-english">{selectedPlace?.name||'Colombo · A city by the water'}</span>
        <span className="landmark-coordinates">{coordinateLabel(selectedPlace?.coordinates||[6.92703,79.85832])}</span>
        {selectedPlace&&<div className="landmark-arrival" key={selectedPlace.id}>
          {arrived===selectedPlace.id?<button className="landmark-details-prompt" onClick={()=>setInfoId(selectedPlace.id)} aria-label={`More details about ${selectedPlace.name}`}><span>Curious about this place?<strong>Tap for its story</strong></span><ArrowUpRight/></button>:<span className="landmark-travelling" role="status">Taking you to {selectedPlace.name}…</span>}
        </div>}
      </div>
    </footer>}
    <dialog ref={menu} id="map-menu" className="map-controls" aria-labelledby={compact?'map-menu-title':undefined} role={compact?'dialog':'presentation'} onClose={()=>{if(compact)setMenuOpen(false);setOpenControl(null);}} onClick={event=>{
      if(compact&&event.target===menu.current){const bounds=menu.current.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeMenu();}
    }}>
      <header className="map-menu-heading"><div><span>MAKE YOURSELF AT HOME</span><h2 id="map-menu-title">Your Colombo</h2></div><button className="icon-button" aria-label="Close map menu" onClick={closeMenu}><X/></button></header>
      <div className="map-menu-scroll">
        <CityPlaces ready={ready} selected={landmark} onSelect={explorePlace} showTags={showTags} onShowTags={setShowTags} compact={compact}/>
      <div className="map-tools">
        <div className="map-atmosphere">
          <SceneSelect label="Time of day" value={lighting} options={lightingOptions} disabled={!ready}
            open={openControl === 'light'} onOpen={openLight}
            onChange={value => {setLighting(value);viewer.current?.environment(value);}} />
          <SceneSelect label="Weather" value={weather} options={weatherOptions} disabled={!ready}
            open={openControl === 'weather'} onOpen={openWeather}
            onChange={value => {setWeather(value);viewer.current?.weather(value);}}>
            {weather === 'storm' ? <label className="lightning-control">
              <Zap aria-hidden="true" /><span>Lightning flashes<small>{reducedMotion ? 'Off with reduced motion' : 'Occasional, gentle flashes'}</small></span>
              <input type="checkbox" role="switch" aria-label="Lightning flashes" checked={lightning && !reducedMotion} disabled={reducedMotion}
                onChange={event => {setLightning(event.target.checked);viewer.current?.lightning(event.target.checked);}} />
            </label> : <p className="weather-hint">Explore the city in different conditions.</p>}
          </SceneSelect>
        </div>
        <div className="map-actions">
          <button className="icon-button" onClick={() => {viewer.current?.animate(!animated); setAnimated(!animated);}}
            aria-label={animated ? 'Pause atmosphere' : 'Animate atmosphere'} aria-pressed={animated} disabled={!ready}
            title={animated ? 'Pause atmosphere' : 'Animate atmosphere'}>{animated ? <Pause /> : <Play />}<span className="control-label">{animated?'Pause atmosphere':'Animate atmosphere'}</span></button>
          <button className="icon-button" onClick={toggleAmbience} aria-label={audioPlaying ? 'Mute soundscape' : 'Play Indian Ocean soundscape'} aria-pressed={audioPlaying} disabled={!ready} title={audioPlaying ? 'Mute Ocean & City Soundscape' : 'Play Indian Ocean Waves & City Soundscape'}><Volume2 /><span className="control-label">{audioPlaying ? 'Mute audio' : 'Soundscape'}</span></button>
          <button className="icon-button" onClick={toggleTrees} aria-label={trees ? 'Hide trees' : 'Show trees'} aria-pressed={trees} disabled={!ready} title="Trees"><TreePine /><span className="control-label">Trees</span></button>
          <button className="icon-button" onClick={fullscreen} aria-label="Toggle fullscreen" title="Fullscreen"><Maximize /><span className="control-label">Fullscreen</span></button>
          <button className="icon-button map-tags-toggle" onClick={()=>setShowTags(!showTags)} aria-label="Show map tags" aria-pressed={showTags}><Eye/><span className="control-label">Map tags</span></button>
        </div>
      </div>
      <nav className="camera-dock" aria-label="Map camera views">
        <div className="map-cameras" role="tablist" aria-label="Camera views">
          {cameraNames.map((name,index) => {
            const Icon = cameraIcons[index];
            return <button key={name} id={`camera-${index}`} role="tab" aria-selected={camera === index} aria-controls="map-scene" disabled={!ready}
              tabIndex={camera === index || (camera===null&&index===0) ? 0 : -1} ref={element => {cameraTabs.current[index] = element;}}
              onClick={() => changeCamera(index)} onKeyDown={event => {
                let next;
                if(event.key === 'ArrowRight')next=(index+1)%cameraNames.length;
                if(event.key === 'ArrowLeft')next=(index+cameraNames.length-1)%cameraNames.length;
                if(event.key === 'Home')next=0;if(event.key === 'End')next=cameraNames.length-1;
                if(next !== undefined){event.preventDefault();viewer.current?.camera(next);cameraTabs.current[next]?.focus();}
              }}><Icon aria-hidden="true" /><span>{name}</span></button>;
          })}
        </div>
        <span className="dock-divider" />
        <button className="icon-button camera-reset" onClick={() => {closeMenu();viewer.current?.reset();}} disabled={!ready} aria-label="Reset current camera" title="Reset view"><RotateCcw /></button>
      </nav>
        <RadioPlayer/>
        <div className="map-menu-links"><ModelLibrary ref={library} onOpenChange={libraryChanged} selected={landmark} onExplore={explorePlace}/><button onClick={()=>{closeMenu();credits.current.showModal();}}>Map credits</button></div>
      </div>
    </dialog>
    {ready && background && <div className="map-background" role="status">{background}</div>}
    {notice && <div className="map-notice" role="status">{notice}</div>}
    {!ready && !error && <div className="map-loading" role="status">
      <div className="map-brand"><strong>COLOMBO</strong><span>CITY ATLAS</span></div>
      <p>Opening the map</p>
      <div className="map-progress"><i style={{width: `${progress * 100}%`}} /></div>
      <small>{progress >= .94 ? 'Preparing the map…' : `${Math.round(progress * 100)}%`}</small>
    </div>}
    {error && <div className="map-error" role="alert"><h1>The map could not open.</h1><p>{error}</p><button onClick={() => location.reload()}>Reload map</button></div>}
    <LandmarkDetails place={infoPlace} onClose={()=>setInfoId(null)} onModel={id=>{setInfoId(null);library.current?.open(id);}}/>
    <dialog className="map-credits" aria-labelledby="credits-title" ref={credits}>
      <button className="map-credits-close" aria-label="Close credits" onClick={() => credits.current.close()}><X /></button>
      <h1 id="credits-title">Map credits</h1>
      <p>{metadata?.buildings.toLocaleString()} mapped buildings around Lotus Tower and Beira Lake, with more of Colombo in the distance.</p>
      <p>{metadata?.accuracy}</p>
      <p>Landmark labels mark approximate mapped centres. Altair, the World Trade Center, Gangaramaya Temple, Fort Station and the National Museum have separate exterior reconstructions. Editable models and their reference notes are available in the 3D model library. Tamil type is Noto Sans Tamil (SIL Open Font License). Sinhala type is Abhaya Libre by Pushpananda Ekanayake, Sol Matas and Mooniak (SIL Open Font License).</p>
      <p>Current temperature is provided by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> and refreshes every 15 minutes. The Weather menu controls the scene’s simulated atmosphere independently. Radio broadcasts come directly from the linked broadcasters.</p>
      <ul>{metadata?.sources.map(source => <li key={source.name}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a><span>{source.use}</span></li>)}</ul>
    </dialog>
  </main>;
}
