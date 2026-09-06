import {useEffect,useRef,useState} from 'react';
import {ChevronUp,ExternalLink,Headphones,LoaderCircle,Pause,Play,Radio,Volume2,X} from 'lucide-react';
import {RADIO_STATIONS} from './radioStations.js';

export default function RadioPlayer(){
  const [station,setStation]=useState(RADIO_STATIONS[0]),[status,setStatus]=useState('idle');
  const [open,setOpen]=useState(false),[language,setLanguage]=useState('All'),[volume,setVolume]=useState(.4);
  const root=useRef(null),trigger=useRef(null),audioHost=useRef(null),audio=useRef(null),timeout=useRef(null),generation=useRef(0);
  const active=status==='playing'||status==='buffering';
  function release(){
    generation.current++;clearTimeout(timeout.current);
    const previous=audio.current;audio.current=null;
    if(previous){previous.pause();previous.removeAttribute('src');previous.load();previous.remove();}
  }
  function stop(){release();setStatus('idle');}
  function tune(next){
    release();setStation(next);setStatus('buffering');
    const token=generation.current,player=new Audio();audio.current=player;
    player.preload='none';player.volume=volume;player.src=next.stream;audioHost.current.appendChild(player);
    const valid=()=>generation.current===token;
    const fail=()=>{if(valid()){release();setStatus('error');}};
    const buffering=()=>{if(valid()){setStatus('buffering');clearTimeout(timeout.current);timeout.current=setTimeout(fail,15000);}};
    player.addEventListener('playing',()=>{if(valid()){clearTimeout(timeout.current);setStatus('playing');}});
    player.addEventListener('waiting',buffering);player.addEventListener('stalled',buffering);
    player.addEventListener('error',fail);player.addEventListener('ended',fail);
    player.addEventListener('pause',()=>{if(valid()){release();setStatus('idle');}});
    buffering();player.play().catch(fail);
  }
  useEffect(()=>()=>release(),[]);
  useEffect(()=>{
    if(!open)return;
    const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  function close(){setOpen(false);trigger.current?.focus();}
  return <section className="city-radio" aria-label="Sri Lankan radio" ref={root} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close();}}}>
    <div ref={audioHost} hidden />
    <div className="radio-mini">
      <button className="radio-toggle" onClick={()=>active?stop():tune(station)} aria-label={active?'Stop radio':`Play ${station.name} radio`}>
        {status==='buffering'?<LoaderCircle className="loading-spin"/>:active?<Pause/>:<Play/>}
      </button>
      <button className="radio-open" ref={trigger} onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="radio-panel" aria-label="Choose radio station">
        <span className="radio-mini-copy"><small><i className={active?'is-on':''}/>{status==='playing'?'ON AIR':status==='buffering'?'CONNECTING':status==='error'?'TRY AGAIN':'CITY RADIO'}</small><b>{station.name}</b></span><ChevronUp/>
      </button>
    </div>
    {open&&<div className="radio-panel" id="radio-panel">
      <div className="panel-heading"><span><Headphones/>A soundtrack for the city</span><div className="radio-panel-actions">
        <button className="icon-button" onClick={()=>active?stop():tune(station)} aria-label={active?'Stop current station':'Play selected station'}>{active?<Pause/>:<Play/>}</button>
        <button className="icon-button" onClick={close} aria-label="Close radio menu"><X/></button>
      </div></div>
      <p className="radio-intro">A little company, wherever you wander.</p>
      <div className="radio-filters" role="group" aria-label="Station language">{['All','English','Sinhala'].map(name=><button key={name} aria-pressed={language===name} onClick={()=>setLanguage(name)}>{name}</button>)}</div>
      <div className="radio-stations">{RADIO_STATIONS.filter(item=>language==='All'||item.language===language).map(item=>item.stream?
        <button className={`station-row${station.id===item.id?' is-selected':''}`} key={item.id} onClick={()=>tune(item)} aria-label={`Tune to ${item.name}, ${item.language}`}>
          <span className="station-mark" style={{'--station-color':item.color}}><Radio/></span><span><b>{item.name}<small>{item.language}</small></b><em>{item.description}</em></span><Play className="station-arrow"/>
        </button>:
        <a className="station-row" key={item.id} href={item.website} target="_blank" rel="noreferrer" onClick={stop} aria-label={`Open ${item.name} official player, ${item.language}`}>
          <span className="station-mark" style={{'--station-color':item.color}}><Radio/></span><span><b>{item.name}<small>{item.language}</small></b><em>{item.description}</em></span><ExternalLink className="station-arrow"/>
        </a>)}</div>
      <label className="radio-volume"><Volume2/><span>Volume</span><input type="range" aria-label="Radio volume" min="0" max="1" step=".05" value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);if(audio.current)audio.current.volume=value;}}/></label>
      <p className="radio-status" role="status">{status==='error'?'This stream is unavailable. Try again or open the station’s player.':status==='buffering'?'Connecting to the live broadcast…':status==='playing'?`Listening to ${station.name} · ${station.language}`:'Choose a station to listen live.'}</p>
      <a className="radio-source" href={station.website} target="_blank" rel="noreferrer" onClick={stop}>Official {station.name} player <ExternalLink/></a>
    </div>}
  </section>;
}
