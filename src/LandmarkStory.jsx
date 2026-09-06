import {ExternalLink} from 'lucide-react';
import {LANDMARK_STORIES} from './landmarkStories.js';

export default function LandmarkStory({place}){
  const story=LANDMARK_STORIES[place.id];
  return <div className="landmark-story">
    <p className="story-introduction">{story.introduction}</p>
    <div className="story-facts"><span>{story.era}</span><span>{story.category}</span></div>
    {['history','architecture','significance'].map(section=><section key={section}><h3>{section==='significance'?'Why it matters':section[0].toUpperCase()+section.slice(1)}</h3><p>{story[section]}</p></section>)}
    <div className="story-sources"><h3>Read the sources</h3>{story.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink aria-hidden="true"/></a>)}</div>
  </div>;
}
