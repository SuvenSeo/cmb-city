import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/rajdhani/latin-500.css';
import Map from './Map.jsx';
import './map.css';

// Every entry opens this one map. Canonicalize old bookmarked viewer URLs.
if (location.pathname !== '/') history.replaceState(null, '', '/' + location.search + location.hash);
createRoot(document.getElementById('root')).render(<Map />);
