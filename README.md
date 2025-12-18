# Beyond-The-Apex-Quali-only-
Beyond The Apex PRO is an advanced F1 telemetry tool using the FastF1 API for data visualization from 2021 onward. It has Qualifying Session analysis(only fastest lap) for precise analysis between drivers (speed, throttle/brake, G-force) and includes an AI Race Engineer that detects driving style differences and strategic advantages automatically.

## Project Screenshot 
<img width="1891" height="874" alt="image" src="https://github.com/user-attachments/assets/f1976274-fc23-49a3-9c3b-d42c39decc31" /><img width="1888" height="879" alt="image" src="https://github.com/user-attachments/assets/a9e43120-28a7-44f2-b7a0-530a37292961" />

## Features

### ⏱️ Qualifying & Telemetry Analysis
- **Multi-Driver Comparison:** Compare up to 6 drivers simultaneously.
- **Telemetry Channels:**
  - **Speed Trace:** Top speed and cornering minimums.
  - **Inputs:** Throttle application and Brake pressure (0-100%).
  - **Car Dynamics:** Engine RPM and Longitudinal G-Force.
  - **Delta:** Live time delta against the session benchmark (Pole or Fastest Lap).
  - ***Zoom & Pan:*** Use your mouse to drag-to-zoom on charts. Hold Shift + Drag to pan. Click "⟲ Reset" to reset the view.
- **Sector Timing:** Purple/Green/Yellow sectors.

### 🤖 AI Race Engineer
- Automated analysis of braking points, corner entry speeds, and traction zones.
- "Plain English" insights explaining *why* a driver is faster (e.g., "Verstappen brakes 15m later but carries +5km/h speed").

### 🌦️ Live Conditions
- Real-time Track Temp, Air Temp, Humidity, and Rain status.

---

## 🛠️ Tech Stack

* **Frontend:** React.js, Chart.js, React-Chartjs-2, Chartjs-Plugin-Zoom
* **Backend:** Python, FastAPI, Uvicorn, Pandas, NumPy
* **Data Source:** [FastF1](https://github.com/theOehrly/Fast-F1) (Open Source F1 API)

---

## 📦 Installation & Setup

### Prerequisites
- Node.js & npm
- Python 3.8+

### 1. Backend Setup
The backend handles data fetching and mathematical analysis.

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment (Recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn fastf1 pandas numpy

# Run the server
# The server will start on http://localhost:8000
python api.py
```

### 2. Frontend Setup
The frontend visualises the data.

```
Bash

# Open a new terminal and navigate to the frontend folder
cd frontend

# Install dependencies
npm install axios chart.js react-chartjs-2 chartjs-plugin-zoom

# Run the development server
npm run dev
```
The application should now be running at http://localhost:5173 (or the port specified by your terminal).

### 📂 Project Structure
f1-telemetry-tool/
├── backend/
│   ├── api.py           # FastAPI endpoints (Router)
│   ├── analysis.py      # Core logic (FastF1 integration, math, AI)
│   └── cache/           # Local cache for F1 data (auto-generated)
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main UI component & Logic
│   │   ├── main.jsx     # React entry point
│   │   └── index.css    # Global styles
│   └── package.json     # JS dependencies
└── README.md

### ⚖️ License & Acknowledgements
Data provided by the excellent FastF1 library.

This project is for educational and non-commercial purposes. F1 data rights belong to Formula One World Championship Limited.
