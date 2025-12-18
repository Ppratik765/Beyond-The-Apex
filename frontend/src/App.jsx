import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Chart } from 'chart.js';

Chart.register(zoomPlugin);

const DRIVER_COLORS = [
  '#36a2eb', '#ff6384', '#00ff9d', '#ff9f40',
  '#9966ff', '#ffcd56', '#c9cbcf', '#e74c3c', '#2ecc71'
];

function App() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const deltaChartRef = useRef(null);
  const speedChartRef = useRef(null);
  const throttleChartRef = useRef(null);
  const brakeChartRef = useRef(null);
  const rpmChartRef = useRef(null);
  const longGChartRef = useRef(null);

  const [inputs, setInputs] = useState({
    year: 2025,
    race: 'Austin',
    session: 'Qualifying',
    drivers: 'VER, LEC, NOR, PIA'
  });

  const [activeDrivers, setActiveDrivers] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/analyze`, {
        params: { ...inputs }
      });

      if (res.data.status === 'error') {
        throw new Error(res.data.message);
      }

      setData(res.data.data);
      setActiveDrivers(
        inputs.drivers.split(',').map(d => d.trim().toUpperCase())
      );
    } catch (err) {
      console.error(err);
      setError('Failed to load data. The server might be waking up!');
    } finally {
      setLoading(false);
    }
  };

  const resetChart = ref => ref.current && ref.current.resetZoom();

  const resetAllCharts = () => {
    [
      deltaChartRef,
      speedChartRef,
      throttleChartRef,
      brakeChartRef,
      rpmChartRef,
      longGChartRef
    ].forEach(resetChart);
  };

  const formatTime = seconds => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(3, '0')}`;
  };

  const getDatasets = (metric, tension = 0) => {
    if (!data) return [];
    return activeDrivers.map((driver, idx) => ({
      label: driver,
      data: data.drivers?.[driver]?.telemetry?.[metric] || [],
      borderColor: DRIVER_COLORS[idx % DRIVER_COLORS.length],
      borderWidth: 1.5,
      pointRadius: 0,
      tension
    }));
  };

  const sectorPlugin = {
    id: 'sectorLines',
    beforeDraw(chart) {
      if (!data || !activeDrivers.length) return;

      const driverKey = activeDrivers[0];
      const dist = data.drivers?.[driverKey]?.telemetry?.distance;
      if (!dist) return;

      const ctx = chart.ctx;
      const xAxis = chart.scales.x;
      const yAxis = chart.scales.y;
      const total = dist[dist.length - 1];

      [total * 0.33, total * 0.66].forEach((val, i) => {
        const x = xAxis.getPixelForValue(val);
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(x, yAxis.top);
        ctx.lineTo(x, yAxis.bottom);
        ctx.stroke();
        ctx.restore();
      });
    }
  };

  const commonOptions = {
    animation: false,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      zoom: {
        zoom: { drag: { enabled: true }, mode: 'x' },
        pan: { enabled: true, mode: 'x', modifierKey: 'shift' }
      }
    },
    scales: {
      x: { type: 'linear' },
      y: {}
    }
  };

  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <div style={headerTopStyle}>
        <h1>🏎️ Beyond The Apex</h1>
        <span onClick={resetAllCharts} style={resetAllStyle}>
          ⟲ Reset All
        </span>
      </div>

      {/* CONTROLS */}
      <div style={controlsStyle}>
        <input
          value={inputs.year}
          onChange={e => setInputs({ ...inputs, year: e.target.value })}
          style={inputStyle}
        />
        <input
          value={inputs.race}
          onChange={e => setInputs({ ...inputs, race: e.target.value })}
          style={inputStyle}
        />
        <input
          value={inputs.drivers}
          onChange={e => setInputs({ ...inputs, drivers: e.target.value })}
          style={{ ...inputStyle, width: 300 }}
        />
        <button onClick={fetchData} disabled={loading} style={btnStyle}>
          {loading ? 'ANALYZING…' : 'Analyze Telemetry'}
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {data && (
        <div style={{ height: 300 }}>
          <Line
            ref={deltaChartRef}
            data={{
              labels: data.drivers[activeDrivers[0]].telemetry.distance,
              datasets: getDatasets('delta_to_pole')
            }}
            options={commonOptions}
            plugins={[sectorPlugin]}
          />
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  background: '#121212',
  minHeight: '100vh',
  padding: 20,
  color: '#e0e0e0'
};

const headerTopStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const resetAllStyle = { cursor: 'pointer', color: '#e10600' };

const controlsStyle = { display: 'flex', gap: 10, marginBottom: 20 };

const inputStyle = {
  padding: 8,
  background: '#222',
  color: '#fff',
  border: '1px solid #444'
};

const btnStyle = {
  background: '#e10600',
  color: '#fff',
  border: 'none',
  padding: '8px 20px',
  cursor: 'pointer'
};

const errorStyle = {
  background: '#4a1010',
  padding: 10,
  marginTop: 10
};

export default App;
