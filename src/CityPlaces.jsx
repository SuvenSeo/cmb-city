import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Eye,MapPin,X} from 'lucide-react';
import {LANDMARKS} from './landmarks.js';
import {LANDMARK_STORIES} from './landmarkStories.js';
import {coordinateLabel} from './cityNavigation.js';

export default function CityPlaces({ready,selected,onSelect,showTags,onShowTags,compact}){
  const root=useRef(null),trigger=useRef(null);
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open)return;
    const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  function close(){setOpen(false);trigger.current?.focus();}
  function choose(id){close();onSelect(id);}
  return <div className="places-control" ref={root} onKeyDown={event=>{
    if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();}
  }}>
    <button className="places-trigger" ref={trigger} disabled={!ready} aria-expanded={open} aria-controls="places-panel" onClick={()=>setOpen(!open)}><MapPin/>Explore places<span>{LANDMARKS.length}</span></button>
    {open&&<div className="places-panel" id="places-panel">
      <div className="panel-heading"><span>Places of Colombo</span><button className="icon-button" aria-label="Close places" onClick={close}><X/></button></div>
      <p>Choose a place. We'll take you there.</p>
      <div className="places-list">{LANDMARKS.map((place,index)=><button key={place.id} className={selected===place.id?'is-selected':''} onClick={()=>choose(place.id)} aria-label={`Fly to ${place.name}`}>
        <span className="place-number">{String(index+1).padStart(2,'0')}</span><span><b lang="si">{place.sinhala}</b><strong>{place.name}</strong><em lang="ta">{LANDMARK_STORIES[place.id].tamil}</em><small>{coordinateLabel(place.coordinates)}</small></span><ArrowUpRight/>
      </button>)}</div>
      {!compact&&<label className="places-visibility"><Eye/><span>Show map tags</span><input type="checkbox" role="switch" checked={showTags} onChange={event=>onShowTags(event.target.checked)}/></label>}
    </div>}
  </div>;
}
