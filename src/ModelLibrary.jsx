import {lazy,Suspense,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowUpRight,Box,Download,FileBox,MapPin,X} from 'lucide-react';
import {LANDMARKS,ALL_LANDMARKS} from './landmarks.js';
import {LANDMARK_STORIES} from './landmarkStories.js';
import {coordinateLabel} from './cityNavigation.js';
import {studioModelUrl} from './modelStudioMath.js';
import LandmarkStory from './LandmarkStory.jsx';

const ModelViewer=lazy(()=>import('./ModelViewer.jsx'));
const size=bytes=>`${(bytes/1048576).toFixed(1)} MB`;

function Downloads({model}){
  const base=`/landmarks/${model.id}`;
  return <div className="studio-downloads">
    <h3>Keep a piece of Colombo.</h3><p>Download the object for your own scenes and creative projects.</p>
    {model.downloadBytes&&<a className="studio-download-pack" href={`${base}/${model.id}-model.zip`} download><Download/><span>Complete model pack<small>Blender, GLB, renders & reference notes</small></span><b>{size(model.downloadBytes)}</b></a>}
    <a className="studio-download-file" href={studioModelUrl(model)} download><FileBox/><span>3D object · GLB<small>{model.id==='lotus'?'City model · Meshopt-compatible viewers':'Standalone model · original metre scale'}</small></span><Download/></a>
    {model.downloadBytes&&<>
      <a className="studio-download-file" href={`${base}/${model.id}.blend`} download><Box/><span>Editable Blender source<small>Organized architectural collections</small></span><Download/></a>
      <a className="studio-text-link" href={`${base}/README.md`} target="_blank" rel="noreferrer">Model notes & usage <ArrowUpRight/></a>
    </>}
    <div className="studio-model-note"><h4>About this reconstruction</h4><p>{model.interiors?'Includes selected interiors. Room layouts, dimensions and fine ornament are interpretations based on photographs.':'An exterior visualization with approximate dimensions and decorative details.'} {model.downloadBytes?'Review the model notes before reuse.':'The city GLB uses Meshopt compression and does not include an editable Blender source.'}</p></div>
  </div>;
}

export default function ModelLibrary({ref,selected,onExplore,onOpenChange}){
  const dialog=useRef(null),scroll=useRef(null),activeItem=useRef(null),trigger=useRef(null);
  const [open,setOpen]=useState(false),[models,setModels]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const [activeId,setActiveId]=useState('museum'),[tab,setTab]=useState('story'),[expanded,setExpanded]=useState(false);
  function show(id){setActiveId(id||selected||'museum');setExpanded(false);setTab('story');setOpen(true);onOpenChange(true);dialog.current.showModal();}
  useImperativeHandle(ref,()=>({open:show}));
  useEffect(()=>{
    if(!open||models)return;
    const abort=new AbortController();setError('');
    Promise.all([
      fetch('/landmarks/catalog.json',{signal:abort.signal}).then(r=>r.json()),
      fetch('/map/manifest.json',{signal:abort.signal}).then(r=>r.json()),
      fetch('/landmarks/expansion_catalog.json',{signal:abort.signal}).then(r=>r.json()).catch(()=>[])
    ]).then(([catalog,manifest,expansionCatalog])=>{
      const allEntries=[...catalog,...(expansionCatalog||[])];
      const validLandmarks=ALL_LANDMARKS.filter(p=>allEntries.some(e=>e.id===p.id)||p.id==='lotus');
      const entries=validLandmarks.map(place=>allEntries.find(item=>item.id===place.id)||{id:place.id,name:place.name,bytes:manifest.assets.tower.bytes,interiors:false});
      setModels(entries);
    }).catch(failure=>{if(failure.name!=='AbortError')setError(failure.message);});
    return()=>abort.abort();
  },[open,models,attempt]);
  const model=models?.find(item=>item.id===activeId),place=ALL_LANDMARKS.find(item=>item.id===activeId)||LANDMARKS.find(item=>item.id===activeId);
  const story=LANDMARK_STORIES[activeId]||{category:'Colombo Landmark',tamil:''};
  useEffect(()=>{if(open&&models)activeItem.current?.scrollIntoView({block:'nearest',inline:'nearest'});},[open,models,activeId]);
  function select(id){setActiveId(id);setTab('story');if(scroll.current)scroll.current.scrollTop=0;}
  function close(){dialog.current.close();}
  return <>
    <button ref={trigger} className="model-library-trigger" onClick={()=>show()}><Box/>3D model library</button>
    {createPortal(<dialog ref={dialog} className={`model-library${expanded?' is-expanded':''}`} aria-labelledby="model-library-title" onClose={()=>{setOpen(false);setExpanded(false);onOpenChange(false);trigger.current?.focus();}} onCancel={event=>{if(expanded){event.preventDefault();setExpanded(false);}}}>
      <header className="library-header"><div><span className="studio-eyebrow">THE COLOMBO COLLECTION</span><h1 id="model-library-title">A city, in your hands.</h1></div><button className="icon-button" aria-label="Close model library" onClick={close}><X/></button></header>
      {open&&(error?<div className="library-error" role="alert"><p>{error}</p><button className="studio-primary" onClick={()=>setAttempt(n=>n+1)}>Retry collection</button></div>:!models?<p className="library-error" role="status">Opening the collection…</p>:<div className="library-body">
        <nav className="library-collection" aria-label="Choose a 3D landmark"><span className="studio-eyebrow">THE LANDMARKS <i>{models.length}</i></span><div className="library-collection-scroll">
          {models.map((entry,index)=>{const p=ALL_LANDMARKS.find(item=>item.id===entry.id)||LANDMARKS.find(item=>item.id===entry.id);return <button key={entry.id} ref={activeId===entry.id?activeItem:null} className={`collection-item${activeId===entry.id?' is-active':''}`} aria-pressed={activeId===entry.id} aria-label={`Open ${entry.name} 3D model`} onClick={()=>select(entry.id)}><span className="collection-number">{String(index+1).padStart(2,'0')}</span><span><strong>{entry.name}</strong><b lang="si">{p?.sinhala}</b><small lang="ta">{LANDMARK_STORIES[entry.id]?.tamil}</small></span><ArrowUpRight/></button>;})}
        </div><a className="collection-download" href="/landmarks/colombo-landmarks.zip" download><Download/><span>Blender collection<small>Five editable model packs</small></span></a></nav>
        <div className="library-workbench" ref={scroll}>
          <Suspense fallback={<div className="studio-viewer studio-boot" role="status">Preparing the 3D viewer…</div>}><ModelViewer model={model} expanded={expanded} onExpand={()=>setExpanded(value=>!value)}/></Suspense>
          <aside className="studio-inspector">
            <header className="studio-model-heading"><span className="studio-eyebrow">{story.category}</span><h2>{model?.name}</h2><p lang="si">{place?.sinhala}</p><p lang="ta">{story.tamil}</p><small><MapPin/>{place?coordinateLabel(place.coordinates):''}</small></header>
            <div className="studio-inspector-tabs" role="tablist" aria-label="Landmark information">{[['story','The story'],['downloads','Downloads']].map(([id,title])=><button key={id} id={`studio-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`studio-panel-${id}`} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'story':event.key==='End'?'downloads':tab==='story'?'downloads':'story';setTab(next);document.getElementById(`studio-tab-${next}`)?.focus();}}}>{title}</button>)}</div>
            <div key={`${activeId}-${tab}`} className="studio-inspector-scroll" id={`studio-panel-${tab}`} role="tabpanel" aria-labelledby={`studio-tab-${tab}`} tabIndex="0">{tab==='story'?<LandmarkStory place={place}/>:<Downloads model={model}/>}</div>
            <button className="studio-city-link" onClick={()=>{close();onExplore(activeId);}}>View {place?.name} in the city<ArrowUpRight/></button>
          </aside>
        </div>
      </div>)}
    </dialog>,document.body)}
  </>;
}
