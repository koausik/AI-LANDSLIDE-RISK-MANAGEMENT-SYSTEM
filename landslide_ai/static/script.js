/* =============================================================================
   1. LIVE IST CLOCK ENGINE
   ============================================================================= */
function updateNavLiveClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });
    const el = document.getElementById('navLiveClock');
    if (el) el.innerText = `${timeStr} IST`;
}
setInterval(updateNavLiveClock, 1000);
updateNavLiveClock();


/* =============================================================================
   2. LEAFLET INTERACTIVE MAP & SATELLITE TELEMETRY LOGIC
   ============================================================================= */
let currentLat = 20.9517; // Default: Odisha
let currentLon = 85.0985;
let currentName = "Odisha, India";
let currentSlope = 35.0;

// Initialize Leaflet Map
const map = L.map('map').setView([currentLat, currentLon], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = L.marker([currentLat, currentLon]).addTo(map)
    .bindPopup(currentName)
    .openPopup();

// Map Click Handler
map.on('click', async function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    // Boundary check for India
    if (lat >= 6.0 && lat <= 37.5 && lon >= 68.0 && lon <= 97.5) {
        currentLat = lat;
        currentLon = lon;
        currentSlope = 42.0;

        try {
            const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
            const data = await res.json();
            currentName = data.name;
        } catch (err) {
            currentName = `Sector (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;
        }

        updateMapLocation(currentLat, currentLon, currentName);
        fetchTelemetryAndAnalyze();
    }
});

function updateMapLocation(lat, lon, name) {
    marker.setLatLng([lat, lon]).setPopupContent(name).openPopup();
    map.setView([lat, lon], 7);
    document.getElementById('activeCoordinates').innerText = `Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E | Sector: ${name}`;
}

async function fetchTelemetryAndAnalyze() {
    try {
        const response = await fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: currentLat,
                lon: currentLon,
                slope: currentSlope
            })
        });

        const data = await response.json();

        // Update Numerical Telemetry
        document.getElementById('valRain').innerHTML = `${data.rainfall} <span class="box-unit">mm</span>`;
        document.getElementById('valMoisture').innerHTML = `${data.moisture} <span class="box-unit">%</span>`;
        document.getElementById('valSlope').innerHTML = `${data.slope} <span class="box-unit">°</span>`;

        // Update Dynamic Progress Bars
        document.getElementById('barRain').style.width = `${Math.min((data.rainfall / 150) * 100, 100)}%`;
        document.getElementById('barMoisture').style.width = `${data.moisture}%`;
        document.getElementById('barSlope').style.width = `${(data.slope / 60) * 100}%`;

        const stabilityEl = document.getElementById('valStability');
        const stabilityBar = document.getElementById('barStability');
        stabilityEl.innerHTML = `${data.stability} <span class="box-unit">%</span>`;
        stabilityBar.style.width = `${data.stability}%`;

        if (data.stability < 40) {
            stabilityEl.style.color = '#f43f5e';
            stabilityBar.style.background = 'linear-gradient(90deg, #f43f5e, #fda4af)';
        } else {
            stabilityEl.style.color = '#10b981';
            stabilityBar.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
        }

        renderAlertBanner(data.danger_risk, data.stability);
    } catch (error) {
        console.error("Telemetry fetch error:", error);
    }
}

function renderAlertBanner(danger, stability) {
    const banner = document.getElementById('alertBanner');

    if (danger >= 60.0) {
        banner.innerHTML = `
            <div class="alert-critical">
                <h3 style="font-family:'Space Grotesk', sans-serif; font-size:22px; color:#f43f5e; margin-bottom:8px;">
                    🔴 CRITICAL DISASTER ALERT: FAILURE RISK ${danger}%
                </h3>
                <p style="font-size:15px; color:#ffffff; line-height:1.6;">
                    <strong>Slope Slippage Imminent in ${currentName}!</strong> Severe precipitation radar volume and critical root-zone soil saturation have exceeded the shear strength threshold of the terrain.
                </p>
                <div style="margin-top:14px; padding:12px; background:rgba(0,0,0,0.3); border-radius:8px; font-size:13px; color:#fda4af;">
                    <strong>Recommended Incident Protocols:</strong>
                    <ul style="margin-top:6px; padding-left:20px; line-height:1.6;">
                        <li>Dispatch NDRF / SDRF immediate downhill advisory.</li>
                        <li>Engage acoustic siren systems and alert municipal district collectorates.</li>
                        <li>Commence precautionary evacuation of valley transportation corridors.</li>
                    </ul>
                </div>
            </div>
        `;
    } else if (danger >= 35.0) {
        banner.innerHTML = `
            <div class="alert-watch">
                <h3 style="font-family:'Space Grotesk', sans-serif; font-size:22px; color:#f59e0b; margin-bottom:8px;">
                    🟡 ELEVATED ADVISORY: Moderate Hazard Risk (${danger}%)
                </h3>
                <p style="font-size:15px; color:#ffffff;">
                    Moisture accumulation detected in <strong>${currentName}</strong>. Stability index stands at ${stability}%. Continuous synthetic aperture radar scans active.
                </p>
            </div>
        `;
    } else {
        banner.innerHTML = `
            <div class="alert-safe">
                <h3 style="font-family:'Space Grotesk', sans-serif; font-size:22px; color:#10b981; margin-bottom:8px;">
                    🟢 SAFE & FIRM STATUS: Structural Stability is ${stability}%
                </h3>
                <p style="font-size:15px; color:#ffffff;">
                    Hydrological telemetry and terrain gradients in <strong>${currentName}</strong> are well within the geotechnical safety envelope.
                </p>
            </div>
        `;
    }
}

// Search Button Listener
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.success) {
            currentLat = data.lat;
            currentLon = data.lon;
            currentName = data.name;
            currentSlope = data.slope;
            updateMapLocation(currentLat, currentLon, currentName);
            fetchTelemetryAndAnalyze();
        } else {
            alert("Location not found in India. Please check spelling.");
        }
    } catch (err) {
        console.error("Search error:", err);
    }
});

// Search on Enter Key
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

// Quick Scan Hotspot Function
function quickScan(query) {
    document.getElementById('searchInput').value = query;
    document.getElementById('searchBtn').click();
}

// Initial Ingestion Load
fetchTelemetryAndAnalyze();