import {useEffect,useState} from 'react';
import {CloudSun} from 'lucide-react';
import {WEATHER_URL,WEATHER_REFRESH,readCurrentWeather} from './currentWeather.js';

export default function WeatherBadge(){
  const [reading,setReading]=useState(null),[status,setStatus]=useState('loading');
  useEffect(()=>{
    let alive=true,request=null,lastAttempt=0;
    async function update(){
      if(document.hidden||Date.now()-lastAttempt<WEATHER_REFRESH)return;
      lastAttempt=Date.now();request?.abort();request=new AbortController();
      const timeout=setTimeout(()=>request?.abort(),10000);
      try{
        const response=await fetch(WEATHER_URL,{signal:request.signal});
        if(!response.ok)throw Error('Weather unavailable');
        const current=readCurrentWeather(await response.json());
        if(alive){setReading(current);setStatus('ready');}
      }catch{if(alive){setReading(null);setStatus('unavailable');}}
      finally{clearTimeout(timeout);}
    }
    update();const interval=setInterval(update,WEATHER_REFRESH);
    document.addEventListener('visibilitychange',update);
    return()=>{alive=false;request?.abort();clearInterval(interval);document.removeEventListener('visibilitychange',update);};
  },[]);
  const time=reading&&new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Colombo'}).format(reading.timestamp);
  return <a className="weather-badge" href="https://open-meteo.com/" target="_blank" rel="noreferrer"
    aria-label={reading?`Colombo ${reading.temperature} degrees Celsius, ${reading.condition}, updated ${time} Colombo time. Weather by Open-Meteo.`:`Colombo temperature ${status==='loading'?'loading':'unavailable'}. Weather by Open-Meteo.`}
    title={reading?`${reading.condition} · Updated ${time} in Colombo · Open-Meteo`:'Weather by Open-Meteo'}>
    <CloudSun aria-hidden="true"/><b>{reading?`${reading.temperature}°C`:'—°'}</b><span>{status==='ready'?'Colombo now':status==='loading'?'Weather…':'Unavailable'}</span>
  </a>;
}
