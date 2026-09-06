import {useEffect,useImperativeHandle,useRef,useState} from 'react';
import {ArrowUpRight,Eye,MapPin,X} from 'lucide-react';
import {LANDMARKS} from './landmarks.js';
import {LANDMARK_STORIES} from './landmarkStories.js';
import {compassLabel,coordinateLabel} from './cityNavigation.js';

export default function CityNavigation({ref,selected,onSelect,ready}){
  const labels=useRef({}),rose=useRef(null),bearingText=useRef(null),compass=useRef(null),root=useRef(null),trigger=useRef(null);
  const [open,setOpen]=useState(false),[showTags,setShowTags]=useState(true);
  useEffect(()=>{
    if(!open)return;
    const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  useImperativeHandle(ref,()=>({update(view){
    const heading=Math.round(view.bearing)%360;
    if(rose.current)rose.current.style.transform=`rotate(${-view.bearing}deg)`;
    if(bearingText.current)bearingText.current.textContent=`${compassLabel(heading)} · ${String(heading).padStart(3,'0')}°`;
    if(compass.current)compass.current.setAttribute('aria-label',`Facing ${compassLabel(heading)}, ${heading} degrees`);
    for(const item of view.labels){const element=labels.current[item.id];if(element){element.hidden=!item.visible;element.style.transform=`translate(${item.x.toFixed(1)}px,${item.y.toFixed(1)}px) translate(-50%,-100%)`;}}
  }}),[]);
  function choose(id){onSelect(id);setOpen(false);trigger.current?.focus();}
  return <>
    <div className={`landmark-tags${showTags&&ready?'':' tags-hidden'}`} aria-label="Landmarks on the map">
      {LANDMARKS.map(place=><button hidden key={place.id} ref={element=>{labels.current[place.id]=element;}} className={`landmark-tag${selected===place.id?' is-selected':''}`} onClick={()=>choose(place.id)} aria-label={`Explore ${place.name}`}>
        <MapPin/><span><b lang="si">{place.sinhala}</b><small>{place.name}</small><small lang="ta">{LANDMARK_STORIES[place.id].tamil}</small></span><i/>
      </button>)}
    </div>
    <div className="map-compass" ref={compass} role="img" aria-label="Camera direction">
      <span className="compass-lubber"/><div className="compass-face" ref={rose}><span className="compass-n">N</span><span className="compass-e">E</span><span className="compass-s">S</span><span className="compass-w">W</span><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5L25 23L20 20L15 23Z" fill="#ead3a1"/><path d="M20 35L25 17L20 20L15 17Z" fill="#90a9b4"/></svg></div>
      <small ref={bearingText}>—</small>
    </div>
    <div className="places-control" ref={root} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}}>
      <button className="places-trigger" ref={trigger} disabled={!ready} aria-expanded={open} aria-controls="places-panel" onClick={()=>setOpen(!open)}><MapPin/>Explore places<span>{LANDMARKS.length}</span></button>
      {open&&<div className="places-panel" id="places-panel">
        <div className="panel-heading"><span>Places of Colombo</span><button className="icon-button" aria-label="Close places" onClick={()=>{setOpen(false);trigger.current?.focus();}}><X/></button></div>
        <p>Find a new perspective.</p>
        <div className="places-list">{LANDMARKS.map((place,index)=><button key={place.id} className={selected===place.id?'is-selected':''} onClick={()=>choose(place.id)} aria-label={`Explore ${place.name} details`}>
          <span className="place-number">{String(index+1).padStart(2,'0')}</span><span><b lang="si">{place.sinhala}</b><strong>{place.name}</strong><em lang="ta">{LANDMARK_STORIES[place.id].tamil}</em><small>{coordinateLabel(place.coordinates)}</small></span><ArrowUpRight/>
        </button>)}</div>
        <label className="places-visibility"><Eye/><span>Show map tags</span><input type="checkbox" role="switch" checked={showTags} onChange={event=>setShowTags(event.target.checked)}/></label>
      </div>}
    </div>
  </>;
}
