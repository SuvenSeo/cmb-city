import {useCallback, useEffect, useRef, useState} from 'react';
import {Building2, Camera, Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSun, Maximize, Pause, Play, RotateCcw, Sun, Sunrise, Sunset, TreePine, Waves, X, Zap} from 'lucide-react';
import {createMap} from './createMap.js';
import {WEATHER_PRESETS} from './weatherPresets.js';
import SceneSelect from './SceneSelect.jsx';
import RadioPlayer from './RadioPlayer.jsx';
import WeatherBadge from './WeatherBadge.jsx';
import CityNavigation from './CityNavigation.jsx';
import {LANDMARKS} from './landmarks.js';
import {coordinateLabel} from './cityNavigation.js';
import ModelLibrary from './ModelLibrary.jsx';
import LandmarkDetails from './LandmarkDetails.jsx';
import {LANDMARK_STORIES} from './landmarkStories.js';

const cameraNames = ['Aerial', 'City overview', 'Lakeside'];
const cameraIcons = [Camera, Building2, Waves];
const lightingOptions = [
  {value:'morning', label:'Morning', description:'A low sun over the lake', icon:Sunrise},
  {value:'daylight', label:'Daylight', description:'Soft sun & natural colors', icon:Sun},
  {value:'golden', label:'Golden hour', description:'A warm, low evening sun', icon:Sunset},
];
const weatherIcons = {clear:CloudSun, cloudy:Cloud, rain:CloudDrizzle, heavy:CloudRain, storm:CloudLightning};
const weatherOptions = Object.entries(WEATHER_PRESETS).map(([value,preset]) => ({value,...preset,icon:weatherIcons[value]}));

export default function Map() {
  const stage = useRef(null), viewer = useRef(null), credits = useRef(null), cameraTabs = useRef([]);
  const navigation=useRef(null),library=useRef(null);
  const [infoId,setInfoId]=useState(null),[libraryOpen,setLibraryOpen]=useState(false);
  const infoPlace=LANDMARKS.find(place=>place.id===infoId);
  const [landmark,setLandmark]=useState(null);
  const selectedPlace=LANDMARKS.find(place=>place.id===landmark);
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
  const openLight = useCallback(open => setOpenControl(open ? 'light' : null), []);
  const openWeather = useCallback(open => setOpenControl(open ? 'weather' : null), []);

  useEffect(() => {
    let active = true;
    setReady(false); setError(''); setProgress(0);
    setLighting('daylight'); setWeather('clear'); setAnimated(false); setTrees(true); setLightning(true); setOpenControl(null);
    setLandmark(null);
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
        onLandmark: id => active && setLandmark(id),
        onView: view => active && navigation.current?.update(view),
      });
    } catch (failure) { setError(failure.message); }
    return () => { active = false; preference.removeEventListener('change', preferenceChanged); viewer.current?.dispose(); viewer.current = null; };
  }, []);

  // A place card keeps its landmark visible while the camera finishes moving.
  // The separate model studio pauses the city to avoid rendering two scenes.
  useEffect(()=>{viewer.current?.suspend(libraryOpen);},[libraryOpen]);
  function explorePlace(id){viewer.current?.landmark(id);setInfoId(id);}

  async function fullscreen() {
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

  return <main className="map" aria-label="Colombo Map">
    <div className="map-stage" id="map-scene" role="tabpanel" aria-labelledby={camera===null?'landmark-caption':`camera-${camera}`} ref={stage} />
    <div className="map-shade" />
    <header className="map-header">
      <div className="map-brand"><strong>COLOMBO</strong><span>CITY ATLAS</span><WeatherBadge/></div>
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
            title={animated ? 'Pause atmosphere' : 'Animate atmosphere'}>{animated ? <Pause /> : <Play />}</button>
          <button className="icon-button" onClick={toggleTrees} aria-label={trees ? 'Hide trees' : 'Show trees'} aria-pressed={trees} disabled={!ready} title="Trees"><TreePine /></button>
          <button className="icon-button" onClick={fullscreen} aria-label="Toggle fullscreen" title="Fullscreen"><Maximize /></button>
        </div>
      </div>
    </header>
    <CityNavigation ref={navigation} ready={ready} selected={landmark} onSelect={explorePlace}/>
    {ready && !error && <footer className="map-footer">
      <div className="map-caption">
        <span className="landmark-eyebrow">{selectedPlace?'A CLOSER LOOK':'EXPLORE SRI LANKA'}</span>
        <h1 id="landmark-caption" lang="si">{selectedPlace?.sinhala||'කොළඹ'}</h1>
        <span className="landmark-tamil" lang="ta">{selectedPlace?LANDMARK_STORIES[selectedPlace.id].tamil:'கொழும்பு'}</span>
        <span className="landmark-english">{selectedPlace?.name||'Colombo · A city by the water'}</span>
        <span className="landmark-coordinates">{coordinateLabel(selectedPlace?.coordinates||[6.92703,79.85832])}</span>
        <div className="caption-links"><ModelLibrary ref={library} onOpenChange={setLibraryOpen} selected={landmark} onExplore={id=>viewer.current?.landmark(id)}/>{selectedPlace&&<button onClick={()=>setInfoId(selectedPlace.id)}>About this place</button>}<button onClick={() => credits.current.showModal()}>Credits</button></div>
      </div>
      <nav className="camera-dock" aria-label="Map camera views">
        <div className="map-cameras" role="tablist" aria-label="Camera views">
          {cameraNames.map((name,index) => {
            const Icon = cameraIcons[index];
            return <button key={name} id={`camera-${index}`} role="tab" aria-selected={camera === index} aria-controls="map-scene"
              tabIndex={camera === index || (camera===null&&index===0) ? 0 : -1} ref={element => {cameraTabs.current[index] = element;}}
              onClick={() => viewer.current?.camera(index)} onKeyDown={event => {
                let next;
                if(event.key === 'ArrowRight')next=(index+1)%cameraNames.length;
                if(event.key === 'ArrowLeft')next=(index+cameraNames.length-1)%cameraNames.length;
                if(event.key === 'Home')next=0;if(event.key === 'End')next=cameraNames.length-1;
                if(next !== undefined){event.preventDefault();viewer.current?.camera(next);cameraTabs.current[next]?.focus();}
              }}><Icon aria-hidden="true" /><span>{name}</span></button>;
          })}
        </div>
        <span className="dock-divider" />
        <button className="icon-button camera-reset" onClick={() => viewer.current?.reset()} aria-label="Reset current camera" title="Reset view"><RotateCcw /></button>
      </nav>
      <RadioPlayer/>
    </footer>}
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
