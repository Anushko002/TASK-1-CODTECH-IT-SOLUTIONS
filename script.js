// WeatherNow – Open-Meteo demo (no API key required)
// Fetches coordinates via Open-Meteo Geocoding, then fetches current + 7-day forecast.

const el = (id) => document.getElementById(id);
const statusEl = el('status');

const cityInput = el('city-input');
const searchForm = el('search-form');
const dailyContainer = el('daily');

const placeEl = el('place');
const coordsEl = el('coords');
const tempEl = el('temp');
const iconEl = el('icon');
const summaryEl = el('summary');
const humidityEl = el('humidity');
const windEl = el('wind');
const timeEl = el('time');

// Weather code → text + emoji (Open-Meteo standard codes)
function codeToInfo(code){
  // Reference: https://open-meteo.com/en/docs
  if(code === 0) return {text:'Clear sky', icon:'☀️'};
  if([1,2].includes(code)) return {text:'Mostly clear', icon:'🌤️'};
  if(code === 3) return {text:'Overcast', icon:'☁️'};
  if([45,48].includes(code)) return {text:'Fog', icon:'🌫️'};
  if([51,53,55].includes(code)) return {text:'Drizzle', icon:'🌦️'};
  if([56,57].includes(code)) return {text:'Freezing drizzle', icon:'🌧️'};
  if([61,63,65].includes(code)) return {text:'Rain', icon:'🌧️'};
  if([66,67].includes(code)) return {text:'Freezing rain', icon:'🌧️'};
  if([71,73,75,77].includes(code)) return {text:'Snow', icon:'❄️'};
  if([80,81,82].includes(code)) return {text:'Rain showers', icon:'🌦️'};
  if([85,86].includes(code)) return {text:'Snow showers', icon:'❄️'};
  if(code === 95) return {text:'Thunderstorm', icon:'⛈️'};
  if([96,99].includes(code)) return {text:'Thunderstorm w/ hail', icon:'🌩️'};
  return {text:'—', icon:'⛅'};
}

function showStatus(msg){
  statusEl.textContent = msg ?? '';
}
function fmt(n, digits=2){ return Number(n).toFixed(digits); }
function weekday(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday:'short', day:'numeric', month:'short' });
}

async function geocodeCity(name){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Geocoding failed.');
  const data = await res.json();
  if(!data.results || data.results.length === 0) throw new Error('City not found.');
  return data.results[0]; // { name, latitude, longitude, country, timezone, ...}
}

async function fetchWeather(lat, lon, tzHint){
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone: 'auto', // auto picks local TZ for the given coords
    current: ['temperature_2m','relative_humidity_2m','wind_speed_10m','weather_code'].join(','),
    daily: ['weather_code','temperature_2m_max','temperature_2m_min'].join(','),
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather fetch failed.');
  return res.json();
}

function renderCurrent(place, coords, current, tz){
  placeEl.textContent = place;
  coordsEl.textContent = `Lat ${fmt(coords.lat, 2)}, Lon ${fmt(coords.lon, 2)} · ${tz}`;
  const info = codeToInfo(current.weather_code);
  tempEl.textContent = `${Math.round(current.temperature_2m)}°C`;
  iconEl.textContent = info.icon;
  summaryEl.textContent = info.text;
  humidityEl.textContent = `Humidity: ${current.relative_humidity_2m}%`;
  windEl.textContent = `Wind: ${fmt(current.wind_speed_10m, 0)} km/h`;
  // Convert ISO/timezone to local string of that tz:
  const now = new Date();
  timeEl.textContent = `As of ${now.toLocaleString()}`;
}

function renderDaily(daily){
  dailyContainer.innerHTML = '';
  const { time, weather_code, temperature_2m_min, temperature_2m_max } = daily;
  for(let i=0; i<time.length; i++){
    const info = codeToInfo(weather_code[i]);
    const card = document.createElement('article');
    card.className = 'day';
    card.innerHTML = `
      <div class="dtop">
        <div class="dname">${weekday(time[i])}</div>
        <div class="dicon" title="${info.text}">${info.icon}</div>
      </div>
      <div class="dtemp">${Math.round(temperature_2m_min[i])}°C — <strong>${Math.round(temperature_2m_max[i])}°C</strong></div>
      <div class="dmeta"><span>${info.text}</span></div>
    `;
    dailyContainer.appendChild(card);
  }
}

async function loadCityWeather(name){
  try{
    showStatus('Loading…');
    const g = await geocodeCity(name);
    const w = await fetchWeather(g.latitude, g.longitude, g.timezone);
    renderCurrent(
      `${g.name}, ${g.country_code ?? g.country ?? ''}`.replace(/,\s*$/, ''),
      {lat:g.latitude, lon:g.longitude},
      w.current,
      g.timezone || w.timezone || 'local'
    );
    renderDaily(w.daily);
    showStatus(`Showing weather for “${g.name}”`);
  }catch(err){
    console.error(err);
    showStatus(`⚠️ ${err.message || 'Something went wrong.'}`);
    // Clear sections on error for clarity
    placeEl.textContent = '—';
    coordsEl.textContent = '—';
    tempEl.textContent = '—';
    summaryEl.textContent = '—';
    dailyContainer.innerHTML = '';
  }
}

// Form submit
searchForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const q = (cityInput.value || '').trim();
  if(q) loadCityWeather(q);
});

// Quick city chips
document.querySelectorAll('.chip').forEach(btn=>{
  btn.addEventListener('click', ()=> loadCityWeather(btn.dataset.city));
});

// Initial load (based on your region, start with Kolkata)
document.addEventListener('DOMContentLoaded', ()=>{
  loadCityWeather('Kolkata');
});
