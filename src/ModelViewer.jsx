import {useEffect,useRef,useState} from 'react';
import {Expand,Minimize,Minus,Plus,RotateCcw,RotateCw} from 'lucide-react';
import {createModelStudio} from './createModelStudio.js';

export default function ModelViewer({model,expanded,onExpand}){
  const container=useRef(null),api=useRef(null);
  const [state,setState]=useState({status:'loading',error:''}),[view,setView]=useState('exterior');
  useEffect(()=>{
    try{api.current=createModelStudio(container.current,setState);}catch(error){setState({status:'error',error:'3D is unavailable in this browser. You can still read the story and download the model.'});}
    return()=>{api.current?.dispose();api.current=null;};
  },[]);
  useEffect(()=>{setView('exterior');api.current?.mode('exterior');api.current?.load(model);},[model]);
  function changeView(value){setView(value);api.current?.mode(value);}
  const ready=state.status==='ready';
  return <section className="studio-viewer" aria-label={`${model.name} interactive 3D viewer`}>
    <div className="studio-stage-wrap"><div className="studio-stage" ref={container}/>
      <div className="studio-stage-label"><span className="studio-live-dot"/>INTERACTIVE 3D<span>{model.name}</span></div>
      <button className="studio-expand icon-button" aria-label={expanded?'Exit expanded 3D view':'Expand 3D view'} aria-pressed={expanded} onClick={onExpand}>{expanded?<Minimize/>:<Expand/>}</button>
      {state.status==='loading'&&<div className="studio-loading" role="status"><span className="studio-loader"/>Opening the 3D model…</div>}
      {state.status==='error'&&<div className="studio-loading" role="alert"><p>{state.error}</p>{api.current&&<button onClick={()=>api.current.load(model)}>Retry model</button>}</div>}
      <p className="studio-gesture-hint">Drag to rotate <i/> Scroll or pinch to zoom</p>
    </div>
    <div className="studio-viewer-tools">
      <div className="studio-view-modes" role="group" aria-label="Model view">
        {[['exterior','Exterior'],...(model.interiors?[['cutaway','Cutaway'],['interior','Interior']]:[])].map(([id,title])=><button key={id} disabled={!ready} aria-pressed={view===id} onClick={()=>changeView(id)}>{title}</button>)}
      </div>
      <div className="studio-orbit-tools" role="group" aria-label="3D camera controls">
        <button className="icon-button" disabled={!ready} onClick={()=>api.current?.zoom(1/1.2)} aria-label="Zoom in model"><Plus/></button>
        <button className="icon-button" disabled={!ready} onClick={()=>api.current?.zoom(1.2)} aria-label="Zoom out model"><Minus/></button>
        <button className="icon-button" disabled={!ready} onClick={()=>api.current?.orbit(Math.PI/6)} aria-label="Rotate model"><RotateCw/></button>
        <button className="icon-button" disabled={!ready} onClick={()=>api.current?.reset()} aria-label="Reset model view"><RotateCcw/></button>
      </div>
    </div>
  </section>;
}
