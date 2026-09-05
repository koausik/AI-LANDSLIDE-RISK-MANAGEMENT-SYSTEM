/* =============================================================================
   0. INTERACTIVE NORMAL BACKGROUND (LIGHTWEIGHT MOUSE-FOLLOW GLOW)
   ============================================================================= */
document.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
});

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
let currentLat = 20.9517;
let currentLon = 85.0985;
let currentName = "Odisha, India";
let currentSlope = 35.0;

const map = L.map('map').setView([currentLat, currentLon], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = L.marker([currentLat, currentLon]).addTo(map)
    .bindPopup(currentName)
    .openPopup();

map.on('click', async function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

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
    const coordEl = document.getElementById('activeCoordinates');
    if (coordEl) {
        coordEl.innerText = `Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E | Sector: ${name}`;
    }
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

        document.getElementById('valRain').innerHTML = `${data.rainfall} <span class="box-unit">mm</span>`;
        document.getElementById('valMoisture').innerHTML = `${data.moisture} <span class="box-unit">%</span>`;
        document.getElementById('valSlope').innerHTML = `${data.slope} <span class="box-unit">°</span>`;

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
            stabilityBar.style.background = 'linear-gradient(90deg, #10b981, #00f2fe)';
        }

        renderAlertBanner(data.danger_risk, data.stability);
    } catch (error) {
        console.error("Telemetry fetch error:", error);
    }
}

function renderAlertBanner(danger, stability) {
    const banner = document.getElementById('alertBanner');
    if (!banner) return;

    if (danger >= 60.0) {
        banner.innerHTML = `
            <div class="alert-critical">
                <h3 style="font-family:'Clash Display', sans-serif; font-size:22px; color:#f43f5e; margin-bottom:8px;">
                    🔴 CRITICAL DISASTER ALERT: FAILURE RISK ${danger}%
                </h3>
                <p style="font-size:15px; color:#ffffff; line-height:1.6;">
                    <strong>Slope Slippage Imminent in ${currentName}!</strong> Severe precipitation radar volume and critical root-zone soil saturation have exceeded the shear strength threshold of the terrain.
                </p>
                <div style="margin-top:14px; padding:12px; background:rgba(0,0,0,0.35); border-radius:8px; font-size:13px; color:#fda4af;">
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
                <h3 style="font-family:'Clash Display', sans-serif; font-size:22px; color:#fbbf24; margin-bottom:8px;">
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
                <h3 style="font-family:'Clash Display', sans-serif; font-size:22px; color:#10b981; margin-bottom:8px;">
                    🟢 SAFE & FIRM STATUS: Structural Stability is ${stability}%
                </h3>
                <p style="font-size:15px; color:#ffffff;">
                    Hydrological telemetry and terrain gradients in <strong>${currentName}</strong> are well within the geotechnical safety envelope.
                </p>
            </div>
        `;
    }
}

const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
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
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('searchBtn').click();
        }
    });
}

function quickScan(query) {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = query;
        document.getElementById('searchBtn').click();
    }
}

fetchTelemetryAndAnalyze();


/* =============================================================================
   3. GEOTECHNICAL & STRUCTURAL SIMULATION ENGINE
   ============================================================================= */
const simCanvas = document.getElementById('landslideCanvas');
const simCtx = simCanvas ? simCanvas.getContext('2d') : null;

let simSlopeAngle = 32;
let simRainfall = 40;
let simMoisture = 35;
let simFrictionAngle = 30;

let soilNodes = [];
let trees = [];
let houses = [];
let rubblePieces = [];
let dustParticles = [];
let rainDrops = [];

let factorOfSafety = 1.62;
let isFailing = false;
let failureProgress = 0.0;
let cameraShake = 0.0;

function initTrees(crestX, crestY, toeX, toeY) {
    trees = [];
    const treeCount = 8;
    for (let i = 0; i < treeCount; i++) {
        const u = 0.12 + (i / treeCount) * 0.72;
        trees.push({
            u: u,
            height: 22 + Math.random() * 8,
            trunkWidth: 3,
            leanAngle: 0,
            uprooted: false,
            vx: 0,
            vy: 0,
            vRot: 0,
            x: 0,
            y: 0,
            color: Math.random() > 0.5 ? '#166534' : '#15803d'
        });
    }
}

function initHouses(toeX, toeY, w) {
    const startX = toeX + 36;
    houses = [
        {
            x: startX,
            y: toeY,
            width: 38,
            height: 32,
            roofHeight: 14,
            roofColor: '#dc2626',
            wallColor: '#f1f5f9',
            health: 100,
            tilt: 0,
            shattered: false,
            powerActive: true
        },
        {
            x: startX + 54,
            y: toeY,
            width: 44,
            height: 36,
            roofHeight: 16,
            roofColor: '#ea580c',
            wallColor: '#cbd5e1',
            health: 100,
            tilt: 0,
            shattered: false,
            powerActive: true
        },
        {
            x: startX + 114,
            y: toeY,
            width: 34,
            height: 26,
            roofHeight: 12,
            roofColor: '#d97706',
            wallColor: '#e2e8f0',
            health: 100,
            tilt: 0,
            shattered: false,
            powerActive: true
        }
    ];
    rubblePieces = [];
    dustParticles = [];
}

function initSoilParticles() {
    soilNodes = [];
    const count = 220;

    for (let i = 0; i < count; i++) {
        const u = Math.random();
        const depth = Math.random() * 26 + 3;
        const isBoulder = Math.random() < 0.08;

        soilNodes.push({
            origU: u,
            depth: depth,
            radius: isBoulder ? 4.5 + Math.random() * 2.5 : 2.0 + Math.random() * 2.0,
            isBoulder: isBoulder,
            color: isBoulder ? '#64748b' : (Math.random() > 0.5 ? '#92400e' : '#78350f'),
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            active: false,
            vRot: 0,
            rotation: Math.random() * Math.PI
        });
    }
}

function computeFactorOfSafety() {
    const thetaRad = simSlopeAngle * (Math.PI / 180);
    const phiRad = simFrictionAngle * (Math.PI / 180);

    const cohesion = 20.0;
    const gamma = 19.8;
    const z = 2.4;

    const porePressure = Math.pow(simMoisture / 100, 1.45) * 22.5 + (simRainfall / 250) * 16.5;
    const totalNormalStress = gamma * z * Math.pow(Math.cos(thetaRad), 2);
    const effectiveStress = Math.max(totalNormalStress - porePressure, 0.15);

    const shearResistance = cohesion + effectiveStress * Math.tan(phiRad);
    const shearDriving = gamma * z * Math.sin(thetaRad) * Math.cos(thetaRad);

    factorOfSafety = shearResistance / Math.max(shearDriving, 0.08);
    const shearKPa = (shearDriving * 2.8).toFixed(1);

    const hudFS = document.getElementById('hudFS');
    const hudShear = document.getElementById('hudShear');
    const hudState = document.getElementById('hudState');
    const simDot = document.getElementById('simDot');
    const simStatusText = document.getElementById('simStatusText');
    const summaryBox = document.getElementById('simSummaryBox');
    const summaryIcon = document.getElementById('simSummaryIcon');
    const summaryText = document.getElementById('simSummaryText');

    if (hudFS) hudFS.innerText = factorOfSafety.toFixed(2);
    if (hudShear) hudShear.innerText = `${shearKPa} kPa`;

    if (factorOfSafety < 1.0) {
        isFailing = true;
        if (hudFS) hudFS.style.color = '#f43f5e';
        if (hudState) {
            hudState.innerText = 'CATASTROPHIC SHEAR FAILURE';
            hudState.style.color = '#f43f5e';
        }
        if (simDot) {
            simDot.style.background = '#f43f5e';
            simDot.style.boxShadow = '0 0 12px #f43f5e';
        }
        if (simStatusText) {
            simStatusText.innerText = 'AVALANCHE ACTIVE (FS < 1.0)';
            simStatusText.style.color = '#f43f5e';
        }
        if (summaryBox) {
            summaryBox.style.borderColor = 'rgba(244, 63, 94, 0.6)';
            summaryBox.style.background = 'rgba(244, 63, 94, 0.14)';
        }
        if (summaryIcon) summaryIcon.innerText = '⚠️';
        if (summaryText) {
            summaryText.innerHTML = `<strong>Total Shear Zone Liquefaction:</strong> Hydrostatic pore pressure has eliminated shear resistance (FS = ${factorOfSafety.toFixed(2)} &lt; 1.0). Debris flow is destroying structures in the valley corridor.`;
        }
    } else if (factorOfSafety < 1.3) {
        isFailing = false;
        if (hudFS) hudFS.style.color = '#fbbf24';
        if (hudState) {
            hudState.innerText = 'REGOLITH CREEP & STRAIN';
            hudState.style.color = '#fbbf24';
        }
        if (simDot) {
            simDot.style.background = '#fbbf24';
            simDot.style.boxShadow = '0 0 10px #fbbf24';
        }
        if (simStatusText) {
            simStatusText.innerText = 'ELEVATED STRESS (1.0 < FS < 1.3)';
            simStatusText.style.color = '#fbbf24';
        }
        if (summaryBox) {
            summaryBox.style.borderColor = 'rgba(251, 191, 36, 0.5)';
            summaryBox.style.background = 'rgba(251, 191, 36, 0.1)';
        }
        if (summaryIcon) summaryIcon.innerText = '🟡';
        if (summaryText) {
            summaryText.innerHTML = `<strong>Basal Softening & Creep:</strong> Ground pore saturation is reducing friction angle (FS = ${factorOfSafety.toFixed(2)}). Micro-fractures and minor ground creep detected.`;
        }
    } else {
        isFailing = false;
        if (hudFS) hudFS.style.color = '#10b981';
        if (hudState) {
            hudState.innerText = 'STATIC EQUILIBRIUM';
            hudState.style.color = '#10b981';
        }
        if (simDot) {
            simDot.style.background = '#10b981';
            simDot.style.boxShadow = '0 0 10px #10b981';
        }
        if (simStatusText) {
            simStatusText.innerText = 'LIMIT EQUILIBRIUM STABLE (FS > 1.3)';
            simStatusText.style.color = '#10b981';
        }
        if (summaryBox) {
            summaryBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            summaryBox.style.background = 'rgba(16, 185, 129, 0.08)';
        }
        if (summaryIcon) summaryIcon.innerText = '🛡️';
        if (summaryText) {
            summaryText.innerHTML = `<strong>Limit Equilibrium Stable:</strong> Soil shear resistance safely counteracts gravity (FS = ${factorOfSafety.toFixed(2)}). Valley structures secure.`;
        }
    }
}

function updateSimParameters() {
    simSlopeAngle = parseFloat(document.getElementById('simSlope').value);
    simRainfall = parseFloat(document.getElementById('simRain').value);
    simMoisture = parseFloat(document.getElementById('simMoisture').value);
    simFrictionAngle = parseFloat(document.getElementById('simFriction').value);

    document.getElementById('valSimSlope').innerText = `${simSlopeAngle}°`;
    document.getElementById('valSimRain').innerText = `${simRainfall} mm`;
    document.getElementById('valSimMoisture').innerText = `${simMoisture}%`;
    document.getElementById('valSimFriction').innerText = `${simFrictionAngle}°`;

    computeFactorOfSafety();
}

function loadSimPreset(preset) {
    if (preset === 'dry') {
        document.getElementById('simSlope').value = 24;
        document.getElementById('simRain').value = 5;
        document.getElementById('simMoisture').value = 18;
        document.getElementById('simFriction').value = 35;
    } else if (preset === 'monsoon') {
        document.getElementById('simSlope').value = 38;
        document.getElementById('simRain').value = 135;
        document.getElementById('simMoisture').value = 75;
        document.getElementById('simFriction').value = 30;
    } else if (preset === 'critical') {
        document.getElementById('simSlope').value = 54;
        document.getElementById('simRain').value = 230;
        document.getElementById('simMoisture').value = 95;
        document.getElementById('simFriction').value = 22;
    }
    updateSimParameters();
    resetSimulator();
}

function resetSimulator() {
    initSoilParticles();
    rainDrops = [];
    if (!simCanvas) return;
    const w = simCanvas.width;
    const h = simCanvas.height;
    const crestX = w * 0.15;
    const thetaRad = simSlopeAngle * (Math.PI / 180);
    const toeX = Math.min(crestX + (h * 0.62) / Math.tan(thetaRad), w * 0.70);
    const toeY = h * 0.80;
    initHouses(toeX, toeY, w);
    initTrees(crestX, h * 0.18, toeX, toeY);
    failureProgress = 0;
    cameraShake = 0;
}

function triggerBuildingCollapse(hObj) {
    cameraShake = 6;
    hObj.powerActive = false;

    for (let i = 0; i < 14; i++) {
        rubblePieces.push({
            x: hObj.x + Math.random() * hObj.width,
            y: hObj.y - Math.random() * hObj.height,
            vx: Math.random() * 4 + 1.5,
            vy: -Math.random() * 4 - 1,
            w: 8 + Math.random() * 6,
            h: 3,
            color: '#b45309',
            angle: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.2
        });
    }

    for (let i = 0; i < 14; i++) {
        rubblePieces.push({
            x: hObj.x + Math.random() * hObj.width,
            y: hObj.y - Math.random() * (hObj.height * 0.6),
            vx: Math.random() * 3 + 1,
            vy: -Math.random() * 3.5 - 0.5,
            w: 4 + Math.random() * 3,
            h: 3 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#94a3b8' : hObj.roofColor,
            angle: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.15
        });
    }

    for (let i = 0; i < 10; i++) {
        dustParticles.push({
            x: hObj.x + hObj.width * 0.5,
            y: hObj.y - 10,
            radius: 5 + Math.random() * 4,
            maxRadius: 20 + Math.random() * 12,
            opacity: 0.7,
            vx: Math.random() * 2 + 0.5,
            vy: -Math.random() * 1.5 - 0.5
        });
    }
}

function renderSimulatorLoop() {
    requestAnimationFrame(renderSimulatorLoop);

    if (!simCanvas || !simCtx) return;

    const w = simCanvas.width;
    const h = simCanvas.height;

    simCtx.save();
    if (cameraShake > 0.1) {
        simCtx.translate((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake);
        cameraShake *= 0.90;
    }

    simCtx.clearRect(0, 0, w, h);

    const crestX = w * 0.15;
    const crestY = h * 0.18;
    const thetaRad = simSlopeAngle * (Math.PI / 180);
    const toeX = Math.min(crestX + (h * 0.62) / Math.tan(thetaRad), w * 0.68);
    const toeY = h * 0.80;

    if (houses.length === 0) initHouses(toeX, toeY, w);
    if (trees.length === 0) initTrees(crestX, crestY, toeX, toeY);

    if (isFailing) {
        failureProgress = Math.min(failureProgress + 0.015, 1.0);
    } else {
        failureProgress = Math.max(failureProgress - 0.02, 0.0);
    }

    // 1. Solid Bedrock & Valley Floor
    simCtx.beginPath();
    simCtx.moveTo(0, crestY);
    simCtx.lineTo(crestX, crestY);
    simCtx.lineTo(toeX, toeY);
    simCtx.lineTo(w, toeY);
    simCtx.lineTo(w, h);
    simCtx.lineTo(0, h);
    simCtx.closePath();

    const bedrockGrad = simCtx.createLinearGradient(crestX, crestY, toeX, h);
    bedrockGrad.addColorStop(0, '#090d16');
    bedrockGrad.addColorStop(0.5, '#131d31');
    bedrockGrad.addColorStop(1, '#050811');
    simCtx.fillStyle = bedrockGrad;
    simCtx.fill();
    simCtx.strokeStyle = '#1e293b';
    simCtx.lineWidth = 2;
    simCtx.stroke();

    // 2. Slip Shear Plane
    simCtx.beginPath();
    simCtx.setLineDash([6, 5]);
    simCtx.moveTo(crestX + 12, crestY - 2);
    simCtx.quadraticCurveTo((crestX + toeX) * 0.48, (crestY + toeY) * 0.52 + 10, toeX - 4, toeY - 2);
    simCtx.strokeStyle = isFailing ? '#f43f5e' : 'rgba(251, 191, 36, 0.4)';
    simCtx.lineWidth = isFailing ? 3 : 1.8;
    simCtx.stroke();
    simCtx.setLineDash([]);

    // 3. Water Table
    if (simMoisture > 25) {
        simCtx.beginPath();
        const waterHeight = (simMoisture / 100) * 18;
        simCtx.moveTo(crestX, crestY + 8 - waterHeight);
        simCtx.lineTo(toeX, toeY + 4 - waterHeight);
        simCtx.lineTo(toeX, toeY + 6);
        simCtx.lineTo(crestX, crestY + 12);
        simCtx.closePath();
        simCtx.fillStyle = 'rgba(6, 182, 212, 0.22)';
        simCtx.fill();
    }

    // 4. Rain Precipitation
    if (simRainfall > 5) {
        const dropCount = Math.floor(simRainfall / 15);
        for (let i = 0; i < dropCount; i++) {
            rainDrops.push({
                x: Math.random() * w,
                y: 0,
                len: 7 + Math.random() * 8,
                speed: 6 + Math.random() * 5
            });
        }
    }

    simCtx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    simCtx.lineWidth = 1.2;
    for (let i = rainDrops.length - 1; i >= 0; i--) {
        const d = rainDrops[i];
        simCtx.beginPath();
        simCtx.moveTo(d.x, d.y);
        simCtx.lineTo(d.x - 2, d.y + d.len);
        simCtx.stroke();

        d.y += d.speed;
        d.x -= 0.6;
        if (d.y > toeY + 4) {
            rainDrops.splice(i, 1);
        }
    }

    // 5. Sliding Talus / Mudflow Shear Front
    if (isFailing && failureProgress > 0.05) {
        const frontX = Math.min(toeX + failureProgress * 120, w - 30);
        simCtx.beginPath();
        simCtx.moveTo(crestX + 10, crestY);
        simCtx.lineTo(toeX, toeY);
        simCtx.lineTo(frontX, toeY);
        simCtx.lineTo(frontX - 10, toeY - 14 * failureProgress);
        simCtx.lineTo(toeX - 15, toeY - 8);
        simCtx.closePath();
        simCtx.fillStyle = 'rgba(120, 53, 15, 0.85)';
        simCtx.fill();
    }

    // 6. Granular Soil Particles & Boulders
    soilNodes.forEach(p => {
        if (!p.active) {
            const px = crestX + p.origU * (toeX - crestX);
            const py = crestY + p.origU * (toeY - crestY) - p.depth;
            p.x = px;
            p.y = py;

            if (isFailing) {
                p.active = true;
                const v = 3.2 + Math.random() * 3.5;
                p.vx = Math.cos(thetaRad) * v;
                p.vy = Math.sin(thetaRad) * v;
                p.vRot = (Math.random() - 0.5) * 0.25;
            }
        } else {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.22;
            p.rotation += p.vRot;

            if (p.x < toeX) {
                const surfaceY = crestY + ((p.x - crestX) / (toeX - crestX)) * (toeY - crestY);
                if (p.y > surfaceY - p.radius) {
                    p.y = surfaceY - p.radius;
                    p.vy *= 0.5;
                    p.vx += 0.15;
                }
            } else {
                if (p.y > toeY - p.radius) {
                    p.y = toeY - p.radius;
                    p.vx *= 0.82;
                    p.vy = 0;
                    p.vRot *= 0.8;
                }
            }

            houses.forEach(hObj => {
                if (hObj.health > 0) {
                    if (p.x > hObj.x && p.x < hObj.x + hObj.width && p.y > hObj.y - hObj.height) {
                        hObj.health -= p.isBoulder ? 18 : 5;
                        hObj.tilt += 0.03;
                        p.vx *= -0.2;

                        if (hObj.health <= 0 && !hObj.shattered) {
                            hObj.health = 0;
                            hObj.shattered = true;
                            triggerBuildingCollapse(hObj);
                        }
                    }
                }
            });
        }

        simCtx.save();
        simCtx.translate(p.x, p.y);
        simCtx.rotate(p.rotation);
        simCtx.beginPath();
        if (p.isBoulder) {
            simCtx.rect(-p.radius, -p.radius, p.radius * 2, p.radius * 1.8);
            simCtx.fillStyle = '#64748b';
            simCtx.fill();
            simCtx.strokeStyle = '#334155';
            simCtx.lineWidth = 1;
            simCtx.stroke();
        } else {
            simCtx.arc(0, 0, p.radius, 0, Math.PI * 2);
            simCtx.fillStyle = p.color;
            simCtx.fill();
        }
        simCtx.restore();
    });

    // 7. Pine Trees
    trees.forEach(t => {
        if (!t.uprooted) {
            t.x = crestX + t.u * (toeX - crestX);
            t.y = crestY + t.u * (toeY - crestY);

            if (isFailing) {
                t.leanAngle += 0.04;
                if (t.leanAngle > 0.6) {
                    t.uprooted = true;
                    t.vx = Math.cos(thetaRad) * (3.5 + Math.random() * 2);
                    t.vy = Math.sin(thetaRad) * (3.5 + Math.random() * 2);
                    t.vRot = 0.06;
                }
            } else {
                t.leanAngle = (simMoisture > 70) ? 0.12 : 0;
            }
        } else {
            t.x += t.vx;
            t.y += t.vy;
            t.vy += 0.20;
            t.leanAngle += t.vRot;

            if (t.y > toeY - 2) {
                t.y = toeY - 2;
                t.vx *= 0.75;
                t.vy = 0;
                t.vRot = 0;
            }
        }

        simCtx.save();
        simCtx.translate(t.x, t.y);
        simCtx.rotate(t.leanAngle);

        simCtx.fillStyle = '#78350f';
        simCtx.fillRect(-t.trunkWidth / 2, -t.height, t.trunkWidth, t.height);

        simCtx.fillStyle = t.color;
        for (let tier = 0; tier < 3; tier++) {
            const baseY = -t.height * 0.4 - tier * (t.height * 0.24);
            const halfW = (3 - tier) * 5.5;
            simCtx.beginPath();
            simCtx.moveTo(-halfW, baseY);
            simCtx.lineTo(0, baseY - 12);
            simCtx.lineTo(halfW, baseY);
            simCtx.closePath();
            simCtx.fill();
        }

        simCtx.restore();
    });

    // 8. Valley Houses
    houses.forEach(hObj => {
        simCtx.save();
        simCtx.translate(hObj.x + hObj.width / 2, hObj.y);

        if (hObj.health > 0) {
            if (hObj.health < 100) {
                simCtx.rotate(hObj.tilt);
            }

            simCtx.fillStyle = '#334155';
            simCtx.fillRect(-hObj.width / 2 - 2, -4, hObj.width + 4, 4);

            simCtx.fillStyle = hObj.wallColor;
            simCtx.fillRect(-hObj.width / 2, -hObj.height, hObj.width, hObj.height - 4);

            simCtx.fillStyle = '#475569';
            simCtx.fillRect(-4, -12, 8, 12);

            simCtx.fillStyle = hObj.powerActive ? '#fbbf24' : '#1e293b';
            simCtx.fillRect(-hObj.width / 2 + 5, -hObj.height + 6, 6, 6);
            simCtx.fillRect(hObj.width / 2 - 11, -hObj.height + 6, 6, 6);

            simCtx.beginPath();
            simCtx.moveTo(-hObj.width / 2 - 4, -hObj.height);
            simCtx.lineTo(0, -hObj.height - hObj.roofHeight);
            simCtx.lineTo(hObj.width / 2 + 4, -hObj.height);
            simCtx.closePath();
            simCtx.fillStyle = hObj.roofColor;
            simCtx.fill();

            simCtx.fillStyle = '#475569';
            simCtx.fillRect(hObj.width / 4, -hObj.height - hObj.roofHeight + 3, 4, 8);
        } else {
            simCtx.rotate(0.28);
            simCtx.fillStyle = '#334155';
            simCtx.fillRect(-hObj.width / 2, -5, hObj.width * 1.1, 5);

            simCtx.fillStyle = hObj.wallColor;
            simCtx.fillRect(-hObj.width / 2, -11, 10, 7);

            simCtx.fillStyle = hObj.roofColor;
            simCtx.beginPath();
            simCtx.moveTo(-hObj.width * 0.3, -6);
            simCtx.lineTo(4, -14);
            simCtx.lineTo(hObj.width * 0.5, -4);
            simCtx.closePath();
            simCtx.fill();
        }

        simCtx.restore();
    });

    // 9. Rubble Pieces
    for (let i = rubblePieces.length - 1; i >= 0; i--) {
        const r = rubblePieces[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.22;
        r.angle += r.vRot;

        if (r.y > toeY - 2) {
            r.y = toeY - 2;
            r.vx *= 0.65;
            r.vy = 0;
            r.vRot = 0;
        }

        simCtx.save();
        simCtx.translate(r.x, r.y);
        simCtx.rotate(r.angle);
        simCtx.fillStyle = r.color;
        simCtx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
        simCtx.restore();
    }

    // 10. Dust Clouds
    for (let i = dustParticles.length - 1; i >= 0; i--) {
        const c = dustParticles[i];
        c.x += c.vx;
        c.y += c.vy;
        c.radius += 0.5;
        c.opacity -= 0.015;

        if (c.opacity <= 0 || c.radius >= c.maxRadius) {
            dustParticles.splice(i, 1);
            continue;
        }

        simCtx.beginPath();
        simCtx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        simCtx.fillStyle = `rgba(180, 83, 9, ${c.opacity * 0.4})`;
        simCtx.fill();
    }

    // 11. Geotechnical Shear Force Vectors
    const midX = (crestX + toeX) * 0.5;
    const midY = (crestY + toeY) * 0.5;

    const driveLen = Math.sin(thetaRad) * 42;
    simCtx.beginPath();
    simCtx.moveTo(midX, midY);
    simCtx.lineTo(midX + Math.cos(thetaRad) * driveLen, midY + Math.sin(thetaRad) * driveLen);
    simCtx.strokeStyle = '#f43f5e';
    simCtx.lineWidth = 2.5;
    simCtx.stroke();

    const resistLen = Math.min(driveLen * factorOfSafety, 55);
    simCtx.beginPath();
    simCtx.moveTo(midX, midY);
    simCtx.lineTo(midX - Math.cos(thetaRad) * resistLen, midY - Math.sin(thetaRad) * resistLen);
    simCtx.strokeStyle = '#10b981';
    simCtx.lineWidth = 2.5;
    simCtx.stroke();

    simCtx.font = '600 10px Fira Code';
    simCtx.fillStyle = '#f43f5e';
    simCtx.fillText('Driving τ', midX + Math.cos(thetaRad) * driveLen + 6, midY + Math.sin(thetaRad) * driveLen + 4);
    simCtx.fillStyle = '#10b981';
    simCtx.fillText('Resisting τ_f', midX - Math.cos(thetaRad) * resistLen - 80, midY - Math.sin(thetaRad) * resistLen - 4);

    // 12. Clean Status Footer
    simCtx.fillStyle = 'rgba(7, 11, 20, 0.85)';
    simCtx.fillRect(toeX + 8, toeY + 12, 340, 24);
    simCtx.strokeStyle = isFailing ? 'rgba(244, 63, 94, 0.5)' : 'rgba(100, 116, 139, 0.3)';
    simCtx.lineWidth = 1;
    simCtx.strokeRect(toeX + 8, toeY + 12, 340, 24);

    simCtx.font = '600 10px Fira Code';
    if (isFailing) {
        simCtx.fillStyle = '#f43f5e';
        simCtx.fillText('⚠️ CATASTROPHIC IMPACT: VALLEY OVERRUN', toeX + 16, toeY + 28);
    } else {
        simCtx.fillStyle = '#94a3b8';
        simCtx.fillText('🏘️ Valley Settlement (Static Ground Baseline)', toeX + 16, toeY + 28);
    }

    simCtx.restore();
}

initSoilParticles();
computeFactorOfSafety();
renderSimulatorLoop();