export const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=6.92703&longitude=79.85832&current=temperature_2m,weather_code&timezone=Asia%2FColombo&timeformat=unixtime';
export const WEATHER_REFRESH=15*60*1000;

export function readCurrentWeather(data, now=Date.now()) {
  const temperature=data?.current?.temperature_2m, timestamp=data?.current?.time;
  if(typeof temperature!=='number'||!Number.isFinite(temperature)||typeof timestamp!=='number'||!Number.isFinite(timestamp)||data?.current_units?.temperature_2m!=='°C') throw Error('Weather response unavailable');
  if(timestamp*1000>now+30*60*1000||now-timestamp*1000>2*60*60*1000) throw Error('Weather observation is out of date');
  const code=data.current.weather_code;
  const condition=code===0?'Clear':code<=3?'Cloudy':code<=48?'Fog':code>=95?'Thunderstorms':code>=71&&code<=77?'Snow':code>=51?'Rain':'Current weather';
  return {temperature:Math.round(temperature),timestamp:timestamp*1000,condition};
}
