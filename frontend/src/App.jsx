import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Chart } from 'chart.js';

Chart.register(zoomPlugin);

const DRIVER_COLORS = ['#36a2eb', '#ff6384', '#00ff9d', '#ff9f40', '#9966ff', '#ffcd56'];

function App() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Ref
  const deltaChartRef = useRef(null);
  const speedChartRef = useRef(null);
  const throttleChartRef = useRef(null);
  const brakeChartRef = useRef(null);
  const rpmChartRef = useRef(null);
  const longGChartRef = useRef(null);
  
  const [inputs, setInputs] = useState({ year: 2023, race: 'Bahrain', session: 'Qualifying', drivers: 'VER, LEC' });
  const [activeDrivers, setActiveDrivers] = useState([]);

  const fetchData = async () => {
    if (!inputs.race || !inputs.session) return;
    setLoading(true);
    setError(null);
    try {
      // 1. DEFINE PARAMS HERE
      const params = { ...inputs };

      // 2. NOW 'params' EXISTS AND CAN BE USED
      const res = await axios.get(`${API_BASE_URL}/analyze`, { params: params });
      
      if (res.data.status === 'error') throw new Error(res.data.message);
      
      res.data.data.ai_insights = res.data.ai_insights;
      setTelemetryData(res.data.data);
      if(!raceLapData) setActiveDrivers(inputs.drivers.split(',').map(d => d.trim().toUpperCase()));

    } catch (err) { setError(err.message || "Failed to fetch telemetry."); }
    setLoading(false);
  };

  const resetChart = (ref) => { if (ref.current) ref.current.resetZoom(); };

  const resetAllCharts = () => {
    [deltaChartRef, speedChartRef, throttleChartRef, brakeChartRef, rpmChartRef, longGChartRef].forEach(ref => {
        if (ref.current) ref.current.resetZoom();
    });
  };

  const formatTime = (seconds) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const getSectorColor = (val, sessionBest) => {
    if (val <= sessionBest + 0.001) return '#d042ff'; // Purple
    return '#888'; // Grey (standard)
    // Note: We don't have "personal best" stored easily in this structure, so simpler logic for now
  };

  const getDatasets = (metric, tension = 0) => {
    if (!data) return [];
    return activeDrivers.map((driver, idx) => ({
        label: driver,
        data: data.drivers[driver]?.telemetry[metric] || [],
        borderColor: DRIVER_COLORS[idx % DRIVER_COLORS.length],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: tension
    }));
  };

  const fastestTime = data ? data.pole_lap_time : 0;

  const sectorPlugin = {
    id: 'sectorLines',
    beforeDraw: (chart) => {
        if (!data || activeDrivers.length === 0) return;
        const ctx = chart.ctx;
        const xAxis = chart.scales.x;
        const yAxis = chart.scales.y;
        
        const driverKey = activeDrivers[0];
        const distanceArray = data.drivers[driverKey]?.telemetry.distance;
        if (!distanceArray) return;
        const totalTrackLength = distanceArray[distanceArray.length - 1];
        const s1 = totalTrackLength * 0.33;
        const s2 = totalTrackLength * 0.66;

        const drawLine = (val, label) => {
            const x = xAxis.getPixelForValue(val);
            if (x < xAxis.left || x > xAxis.right) return;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.moveTo(x, yAxis.top); ctx.lineTo(x, yAxis.bottom); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText(label, x + 5, yAxis.top + 10);
            ctx.restore();
        };
        drawLine(s1, "S1"); drawLine(s2, "S2");
    }
  };

  const commonOptions = {
    animation: false, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      zoom: {
        zoom: { drag: { enabled: true, backgroundColor: 'rgba(225, 6, 0, 0.3)', borderColor: '#e10600', borderWidth: 1 }, mode: 'x' },
        pan: { enabled: true, mode: 'x', modifierKey: 'shift' }
      }
    },
    scales: {
      x: { type: 'linear', ticks: { color: '#666' }, grid: { color: '#2a2a2a' } },
      y: { ticks: { color: '#666' }, grid: { color: '#2a2a2a' } }
    }
  };

  return (
    <div style={{ padding: '20px', background: '#121212', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h1 style={{margin:0, fontSize: '1.5em'}}>🏎️ Beyond The Apex</h1>
        <div style={{fontSize:'0.8em', color:'#666', background:'#1a1a1a', padding:'5px 10px', borderRadius:'4px'}}>
          🖱️ <b>Drag</b> to Zoom &nbsp; | &nbsp; ⇧ <b>Shift + Drag</b> to Pan &nbsp; | &nbsp; 
          <span style={{cursor:'pointer', color:'#e10600', fontWeight:'bold'}} onClick={resetAllCharts}>⟲ Reset All</span>
        </div>
      </div>
      
      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input placeholder="YEAR" value={inputs.year} onChange={e => setInputs({...inputs, year: e.target.value})} style={inputStyle}/>
        <input placeholder="RACE" value={inputs.race} onChange={e => setInputs({...inputs, race: e.target.value})} style={inputStyle}/>
        {/* Session dropdown removed. Session is always 'Qualifying'. */}
        <input placeholder="DRIVERS (e.g. VER, HAM, NOR)" value={inputs.drivers} onChange={e => setInputs({...inputs, drivers: e.target.value})} style={{...inputStyle, width: '300px'}}/>
        <button onClick={fetchData} disabled={loading} style={btnStyle}>{loading ? 'ANALYZING...' : 'Analyze Telemetry'}</button>
      </div>

      {error && <div style={{padding: '15px', background: '#4a1010', borderRadius: '4px', marginBottom: '20px', borderLeft: '4px solid #e10600'}}>⚠️ {error}</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
          
          {/* LEFT COLUMN: TELEMETRY STACK */}
          <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            
            {/* 1. DELTA TO POLE */}
            <div style={chartContainerStyle}>
                <div style={headerStyle}>
                    <h5 style={chartTitleStyle}>DELTA TO POLE (SEC)</h5>
                    <button onClick={() => resetChart(deltaChartRef)} style={miniBtnStyle}>⟲ Reset</button>
                </div>
                <div style={{height: '180px'}}>
                    <Line ref={deltaChartRef} data={{ labels: data.drivers[activeDrivers[0]].telemetry.distance.map(d => Math.round(d)), datasets: getDatasets('delta_to_pole') }} 
                    options={{...commonOptions, scales:{...commonOptions.scales, y:{reverse:true, grid:{color:'#444'}}}}} 
                    plugins={[sectorPlugin]} />
                </div>
            </div>

            {/* 2. SPEED */}
            <div style={chartContainerStyle}>
                <div style={headerStyle}>
                    <h5 style={chartTitleStyle}>SPEED (KM/H)</h5>
                    <button onClick={() => resetChart(speedChartRef)} style={miniBtnStyle}>⟲ Reset</button>
                </div>
                <div style={{height: '200px'}}>
                    <Line ref={speedChartRef} data={{ labels: data.drivers[activeDrivers[0]].telemetry.distance.map(d => Math.round(d)), datasets: getDatasets('speed') }} 
                    options={commonOptions} plugins={[sectorPlugin]} />
                </div>
            </div>

            {/* 3. THROTTLE */}
            <div style={chartContainerStyle}>
                <div style={headerStyle}>
                    <h5 style={chartTitleStyle}>THROTTLE (%)</h5>
                    <button onClick={() => resetChart(throttleChartRef)} style={miniBtnStyle}>⟲ Reset</button>
                </div>
                <div style={{height: '180px'}}>
                    <Line ref={throttleChartRef} data={{ labels: data.drivers[activeDrivers[0]].telemetry.distance.map(d => Math.round(d)), datasets: getDatasets('throttle', 0) }} 
                    options={{...commonOptions, scales: {y: {min:0, max:105, grid:{color:'#2a2a2a'}}}}} plugins={[sectorPlugin]} />
                </div>
            </div>

            {/* 4. BRAKE */}
            <div style={chartContainerStyle}>
                <div style={headerStyle}>
                    <h5 style={chartTitleStyle}>BRAKE PRESSURE (%)</h5>
                    <button onClick={() => resetChart(brakeChartRef)} style={miniBtnStyle}>⟲ Reset</button>
                </div>
                <div style={{height: '180px'}}>
                    <Line ref={brakeChartRef} data={{ labels: data.drivers[activeDrivers[0]].telemetry.distance.map(d => Math.round(d)), datasets: getDatasets('brake', 0) }} 
                    options={{...commonOptions, scales: {y: {min:0, max:105, grid:{color:'#2a2a2a'}}}}} plugins={[sectorPlugin]} />
                </div>
            </div>

             {/* 5. ENGINE & G-FORCE */}
             <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                <div style={chartContainerStyle}>
                    <div style={headerStyle}>
                        <h5 style={chartTitleStyle}>RPM & GEAR</h5>
                        <button onClick={() => resetChart(rpmChartRef)} style={miniBtnStyle}>⟲ Reset</button>
                    </div>
                    <div style={{height: '150px'}}>
                        <Line ref={rpmChartRef} data={{ labels: data.drivers[activeDrivers[0]].telemetry.distance.map(d => Math.round(d)), datasets: getDatasets('rpm') }} 
                        options={commonOptions} plugins={[sectorPlugin]} />
                    </div>
                </div>
                <div style={chartContainerStyle}>
                    <div style={headerStyle}>
                        <h5 style={chartTitleStyle}>LONGITUDINAL G</h5>
                        <button onClick={() => resetChart(longGChartRef)} style={miniBtnStyle}>⟲ Reset</button>
                    </div>
                    <div style={{height: '150px'}}>
                        <Line ref={longGChartRef} data={{ labels: data.drivers[activeDrivers[0]].telemetry.distance.map(d => Math.round(d)), datasets: getDatasets('long_g') }} 
                        options={commonOptions} plugins={[sectorPlugin]} />
                    </div>
                </div>
             </div>

          </div>

          {/* RIGHT COLUMN: INFO WIDGETS */}
          <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
            
            {/* TIMING & TYRE BOARD */}
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border:'1px solid #333' }}>
                <h3 style={{marginTop:0, borderBottom:'1px solid #444', paddingBottom:'10px', fontSize:'1.1em'}}>⏱️ Lap & Tyres</h3>
                {activeDrivers.map((d, i) => {
                    const dData = data.drivers[d]; if (!dData) return null;
                    const delta = dData.lap_time - fastestTime;
                    const tyreColor = dData.tyre_info.compound === 'SOFT' ? '#ff3b30' : dData.tyre_info.compound === 'MEDIUM' ? '#ffcc00' : '#d0d0d0';
                    return (
                        <div key={d} style={{marginBottom:'15px', borderBottom:'1px solid #2a2a2a', paddingBottom:'10px'}}>
                            <div style={{display:'grid', gridTemplateColumns:'0.8fr 1.2fr 1fr', gap:'5px', alignItems:'center'}}>
                                <div style={{fontWeight:'bold', color: DRIVER_COLORS[i % DRIVER_COLORS.length], fontSize:'1.2em'}}>{d}</div>
                                <div style={{textAlign:'center', fontFamily:'monospace', color:'white'}}>
                                    {formatTime(dData.lap_time)} <br/>
                                    <span style={{color: delta === 0 ? '#d042ff' : '#ffee00', fontSize:'0.8em'}}>{delta === 0 ? 'POLE' : `+${delta.toFixed(3)}`}</span>
                                </div>
                                <div style={{textAlign:'right', fontSize:'0.8em'}}>
                                    <span style={{color: tyreColor, fontWeight:'bold', border:'1px solid '+tyreColor, padding:'2px 4px', borderRadius:'4px'}}>
                                        {dData.tyre_info.compound?.[0] || 'S'}
                                    </span>
                                    <div style={{color:'#666', marginTop:'2px'}}>{dData.tyre_info.age} Laps</div>
                                </div>
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'8px', fontSize:'0.75em', fontFamily:'monospace', width:'100%'}}>
                                {dData.sectors.map((s, idx) => ( 
                                    <span key={idx} style={{color: getSectorColor(s, data.session_best_sectors[idx])}}>
                                        S{idx+1}:{s.toFixed(3)}
                                    </span> 
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* WEATHER WIDGET */}
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border:'1px solid #333' }}>
                <h3 style={{marginTop:0, borderBottom:'1px solid #444', paddingBottom:'10px', fontSize:'1.1em'}}>⛅ Weather</h3>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', fontSize:'0.9em', color:'#ccc'}}>
                    <div>
                        <span style={{color:'#666', display:'block', fontSize:'0.8em'}}>🌡️ TRACK</span>
                        <span style={{fontSize:'1.2em', fontWeight:'bold'}}>{data.weather.track_temp}°C</span>
                    </div>
                    <div>
                        <span style={{color:'#666', display:'block', fontSize:'0.8em'}}>💨 AIR</span>
                        <span style={{fontSize:'1.2em', fontWeight:'bold'}}>{data.weather.air_temp}°C</span>
                    </div>
                    <div>
                        <span style={{color:'#666', display:'block', fontSize:'0.8em'}}>💧 HUMIDITY</span>
                        <span style={{fontSize:'1.2em', fontWeight:'bold'}}>{data.weather.humidity}%</span>
                    </div>
                    <div>
                        <span style={{color:'#666', display:'block', fontSize:'0.8em'}}>🌧️ RAIN</span>
                        <span style={{fontSize:'1.2em', fontWeight:'bold', color: data.weather.rain ? '#36a2eb' : '#ccc'}}>
                            {data.weather.rain ? 'YES' : 'NO'}
                        </span>
                    </div>
                </div>
            </div>

            {/* AI ENGINEER WIDGET */}
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', border:'1px solid #333', borderTop:'3px solid #00ff9d', flex: 1 }}>
               <h3 style={{marginTop:0, fontSize:'1.1em'}}>🤖 AI Race Engineer</h3>
               <div style={{fontSize: '0.85em', color:'#ccc', lineHeight:'1.5'}}>
                 {data.ai_insights && data.ai_insights.length > 0 ? (
                    data.ai_insights.map((insight, idx) => ( <div key={idx} style={{ marginBottom: '10px', paddingBottom:'10px', borderBottom:'1px solid #2a2a2a' }}>{insight}</div> ))
                 ) : ( <div style={{color: '#666', fontStyle: 'italic'}}>Add 2+ drivers for AI comparison.</div> )}
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white', fontWeight:'bold', fontSize:'0.9em' };
const btnStyle = { padding: '8px 20px', background: '#e10600', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', fontSize:'0.9em' };
const miniBtnStyle = { padding: '2px 8px', background: '#333', color: '#aaa', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7em' };

const chartContainerStyle = { background: '#1a1a1a', padding: '10px 15px', borderRadius: '8px', border:'1px solid #333', position: 'relative' };
const headerStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' };
const chartTitleStyle = { margin:0, color:'#666', fontSize:'0.8em', letterSpacing:'1px' };


export default App;



