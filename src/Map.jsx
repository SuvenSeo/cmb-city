import {useEffect, useRef, useState} from 'react';
import {Camera, Maximize, RotateCcw, TreePine, X} from 'lucide-react';
import {createMap} from './createMap.js';

const cameraNames = ['Aerial', 'City overview', 'Lakeside'];

export default function Map() {
  const stage = useRef(null), viewer = useRef(null), credits = useRef(null);
  const [ready, setReady] = useState(false), [progress, setProgress] = useState(0);
  const [error, setError] = useState(''), [camera, setCamera] = useState(0);
  const [trees, setTrees] = useState(true), [metadata, setMetadata] = useState(null);
  const [background, setBackground] = useState('Loading distant skyline…');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    try {
      viewer.current = createMap(stage.current, {
        onReady: () => active && setReady(true),
        onProgress: n => active && setProgress(n),
        onError: e => active && setError(e),
        onCamera: n => active && setCamera(n),
        onMetadata: m => active && setMetadata(m),
        onBackground: s => active && setBackground(s),
      });
    } catch (failure) { setError(failure.message); }
    return () => { active = false; viewer.current?.dispose(); viewer.current = null; };
  }, []);

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
    <div className="map-stage" ref={stage} />
    <div className="map-shade" />
    <header className="map-header">
      <div className="map-brand"><strong>COLOMBO</strong><span>MAP</span></div>
      <div className="map-tools">
        <button onClick={toggleTrees} aria-label={trees ? 'Hide trees' : 'Show trees'} aria-pressed={trees} disabled={!ready} title="Trees"><TreePine /></button>
        <button onClick={fullscreen} aria-label="Toggle fullscreen" title="Fullscreen"><Maximize /></button>
      </div>
    </header>
    {ready && !error && <footer className="map-footer">
      <div className="map-caption"><span>Lotus Tower · Beira Lake</span><button onClick={() => credits.current.showModal()}>Map & model credits</button></div>
      <nav className="map-cameras" aria-label="Map camera views">
        {cameraNames.map((name, index) => <button key={name} aria-pressed={camera === index} onClick={() => viewer.current?.camera(index)}>{index === 0 && <Camera />}{name}</button>)}
        <button onClick={() => viewer.current?.reset()} aria-label="Reset current camera" title="Reset view"><RotateCcw /></button>
      </nav>
      <p className="map-guide">Drag to orbit · Scroll or pinch to zoom</p>
    </footer>}
    {ready && background && <div className="map-background" role="status">{background}</div>}
    {notice && <div className="map-notice" role="status">{notice}</div>}
    {!ready && !error && <div className="map-loading" role="status">
      <div className="map-brand"><strong>COLOMBO</strong><span>MAP</span></div>
      <p>Opening the map</p>
      <div className="map-progress"><i style={{width: `${progress * 100}%`}} /></div>
      <small>{progress >= .94 ? 'Preparing the map…' : `${Math.round(progress * 100)}%`}</small>
    </div>}
    {error && <div className="map-error" role="alert"><h1>The map could not open.</h1><p>{error}</p><button onClick={() => location.reload()}>Reload map</button></div>}
    <dialog className="map-credits" aria-labelledby="credits-title" ref={credits}>
      <button className="map-credits-close" aria-label="Close credits" onClick={() => credits.current.close()}><X /></button>
      <h1 id="credits-title">Map credits</h1>
      <p>{metadata?.buildings.toLocaleString()} mapped buildings around Lotus Tower and Beira Lake, with more of Colombo in the distance.</p>
      <p>{metadata?.accuracy}</p>
      <ul>{metadata?.sources.map(source => <li key={source.name}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a><span>{source.use}</span></li>)}</ul>
    </dialog>
  </main>;
}
