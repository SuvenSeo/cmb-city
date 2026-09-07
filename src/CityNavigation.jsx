import {useImperativeHandle,useRef} from 'react';
import {MapPin} from 'lucide-react';
import {LANDMARKS} from './landmarks.js';
import {LANDMARK_STORIES} from './landmarkStories.js';
import {compassLabel} from './cityNavigation.js';

export default function CityNavigation({ref,selected,onSelect,ready,showTags}){
  const labels=useRef({}),rose=useRef(null),bearingText=useRef(null),compass=useRef(null);
  useImperativeHandle(ref,()=>({update(view){
    const heading=Math.round(view.bearing)%360;
    if(rose.current)rose.current.style.transform=`rotate(${-view.bearing}deg)`;
    if(bearingText.current)bearingText.current.textContent=`${compassLabel(heading)} · ${String(heading).padStart(3,'0')}°`;
    if(compass.current)compass.current.setAttribute('aria-label',`Facing ${compassLabel(heading)}, ${heading} degrees`);
    for(const item of view.labels){const element=labels.current[item.id];if(element){element.hidden=!item.visible;element.style.transform=`translate(${item.x.toFixed(1)}px,${item.y.toFixed(1)}px) translate(-50%,-100%)`;}}
  }}),[]);
  return <>
    <div className={`landmark-tags${showTags&&ready?'':' tags-hidden'}`} aria-label="Landmarks on the map">
      {LANDMARKS.map(place=><button hidden key={place.id} ref={element=>{labels.current[place.id]=element;}} className={`landmark-tag${selected===place.id?' is-selected':''}`} onClick={()=>onSelect(place.id)} aria-label={`Explore ${place.name}`}>
        <MapPin/><span><b lang="si">{place.sinhala}</b><small>{place.name}</small><small lang="ta">{LANDMARK_STORIES[place.id].tamil}</small></span><i/>
      </button>)}
    </div>
    <div className="map-compass" ref={compass} role="img" aria-label="Camera direction">
      <span className="compass-lubber"/><div className="compass-face" ref={rose}><span className="compass-n">N</span><span className="compass-e">E</span><span className="compass-s">S</span><span className="compass-w">W</span><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5L25 23L20 20L15 23Z" fill="#ead3a1"/><path d="M20 35L25 17L20 20L15 17Z" fill="#90a9b4"/></svg></div>
      <small ref={bearingText}>—</small>
    </div>
  </>;
}
