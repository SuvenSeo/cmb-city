import {useEffect,useRef} from 'react';
import {Box,MapPin,X} from 'lucide-react';
import {coordinateLabel} from './cityNavigation.js';
import {LANDMARK_STORIES} from './landmarkStories.js';
import LandmarkStory from './LandmarkStory.jsx';

export default function LandmarkDetails({place,onClose,onModel}){
  const dialog=useRef(null);
  useEffect(()=>{if(place&&!dialog.current.open)dialog.current.showModal();else if(!place&&dialog.current.open)dialog.current.close();},[place]);
  return <dialog ref={dialog} className="landmark-details" aria-labelledby="place-story-title" onClose={onClose} onClick={event=>{if(event.target===dialog.current){const b=dialog.current.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.current.close();}}}>
    {place&&<><header className="place-story-header"><div><span className="studio-eyebrow">PLACES OF COLOMBO</span><h2 id="place-story-title">{place.name}</h2><p lang="si">{place.sinhala}</p><p lang="ta">{LANDMARK_STORIES[place.id].tamil}</p></div><button className="icon-button" aria-label="Close landmark details" onClick={()=>dialog.current.close()}><X/></button></header>
      <div className="place-story-scroll" tabIndex="0" role="region" aria-label={`${place.name} history and architecture`}><LandmarkStory place={place}/></div>
      <footer className="place-story-footer"><span><MapPin/>{coordinateLabel(place.coordinates)}</span><button className="studio-primary" onClick={()=>onModel(place.id)}><Box/>Explore the 3D model</button></footer>
    </>}
  </dialog>;
}
