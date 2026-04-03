/* =====================================================
   AquaGuard Phase 2 — app.js (Dashboard)
   "Protect Your Worker" — Team Horizon
   Reads worker session from localStorage set by index.html
   ===================================================== */

'use strict';

// ─── CONSTANTS ──────────────────────────────────────
const BASE_PREMIUM = 49;
const ZONE_RISK = { low: -4, medium: 0, high: 8 };
const ZONE_LABEL = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };
const PLATFORM_LABEL = { zepto: 'Zepto', blinkit: 'Blinkit', swiggy: 'Swiggy Instamart', dunzo: 'Dunzo' };
const VEHICLE_MULT = { bicycle: 0.95, ebike: 0.98, bike: 1.02 };
const CITY_RISK = { mumbai: 3, kolkata: 2, chennai: 2, delhi: 1, bangalore: 0, hyderabad: 0 };

const TRIGGERS = {
    rain: { label: 'Heavy Rain', icon: '', payout: 250, condition: 'Rainfall > 15mm/hr detected by IMD API', color: 'var(--blue)' },
    flood: { label: 'Flash Flood', icon: '', payout: 400, condition: 'Zone waterlogging confirmed via flood sensor', color: 'var(--cyan)' },
    strike: { label: 'Civic Strike', icon: '', payout: 200, condition: 'Road closures > 4hrs confirmed via Traffic API', color: 'var(--orange)' },
    heat: { label: 'Extreme Heat', icon: '', payout: 180, condition: 'Heat index > 47°C confirmed via NDMA API', color: 'var(--red)' },
    curfew: { label: 'Curfew', icon: '', payout: 350, condition: 'Government-declared curfew in operating zone', color: 'var(--purple)' },
    fraud: { label: 'FRAUD DETECTED', icon: '', payout: 0, condition: 'Bright lux (>500) during claimed rain — GPS spoof', color: 'var(--red)', isFraud: true }
};

// ─── STATE — loaded from localStorage ───────────────
let STATE = {};

document.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem('aquaguard_session');
    if (!raw) {
        // No session — redirect back to registration
        window.location.replace('index.html');
        return;
    }
    const session = JSON.parse(raw);
    STATE = {
        worker: session.worker,
        premium: session.premium,
        savings: session.savings || 0,
        claimsCount: session.claimsCount || 0,
        alertCount: session.alertCount || 0,
        env: {},
        premiumHistory: session.premiumHistory || [],
        savingsHistory: session.savingsHistory || [0, 0, 0, 0],
        claimsHistory: [],
        policyId: session.policyId,
        policyStart: new Date(session.policyStart),
        policyEnd: new Date(session.policyEnd),
        _refreshInterval: null
    };

    populateDashboard();
    populatePolicy();
    refreshEnvironment();
    startAutoRefresh();
    drawRiskGauge(42);
    drawPremiumChart();
});

// ─── NAVIGATION ──────────────────────────────────────
function showSection(sectionId) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    const tabMap = {
        'dashboard-home': 'tab-home',
        'dashboard-policy': 'tab-policy',
        'dashboard-claims': 'tab-claims',
        'dashboard-alerts': 'tab-alerts'
    };
    const tab = document.getElementById(tabMap[sectionId]);
    if (tab) tab.classList.add('active');
}

function logout() {
    localStorage.removeItem('aquaguard_session');
    if (STATE._refreshInterval) clearInterval(STATE._refreshInterval);
    window.location.href = 'index.html';
}

// ─── DASHBOARD POPULATION ────────────────────────────
function populateDashboard() {
    const w = STATE.worker;
    document.getElementById('dash-name').textContent = w.name;
    document.getElementById('dash-platform').textContent = PLATFORM_LABEL[w.platform] + ' • ' + w.city.charAt(0).toUpperCase() + w.city.slice(1);
    document.getElementById('dash-avatar').textContent = w.name.charAt(0).toUpperCase();
    document.getElementById('dash-premium').textContent = `₹${STATE.premium.toFixed(2)}`;
    document.getElementById('dash-savings').textContent = `₹${STATE.savings.toFixed(2)}`;
    document.getElementById('dash-claims-count').textContent = STATE.claimsCount;
}

function populatePolicy() {
    const w = STATE.worker;
    document.getElementById('pol-name').textContent = w.name;
    document.getElementById('pol-platform').textContent = PLATFORM_LABEL[w.platform];
    document.getElementById('pol-zone').textContent = ZONE_LABEL[w.zone];
    document.getElementById('pol-start').textContent = STATE.policyStart.toLocaleDateString('en-IN');
    document.getElementById('pol-end').textContent = STATE.policyEnd.toLocaleDateString('en-IN');
    document.getElementById('policy-id-num').textContent = STATE.policyId;
    document.getElementById('premium-total-display').textContent = `₹${STATE.premium.toFixed(2)}`;
    buildPremiumBreakdown();
    buildAiNote();
}

function buildPremiumBreakdown() {
    const w = STATE.worker;
    const zoneAdj = ZONE_RISK[w.zone];
    const cityAdj = CITY_RISK[w.city] || 0;
    const vehicleAdj = parseFloat(((VEHICLE_MULT[w.vehicle] - 1) * BASE_PREMIUM).toFixed(2));
    const mlAdj = parseFloat((STATE.premium - BASE_PREMIUM - zoneAdj - cityAdj - vehicleAdj).toFixed(2));

    const breakdown = [
        { label: 'Base Premium', val: `₹${BASE_PREMIUM.toFixed(2)}`, disc: false },
        { label: `Zone Adjustment (${ZONE_LABEL[w.zone]})`, val: `${zoneAdj >= 0 ? '+' : ''}₹${Math.abs(zoneAdj).toFixed(2)}`, disc: zoneAdj < 0 },
        { label: `City Flood History (${w.city})`, val: `+₹${cityAdj.toFixed(2)}`, disc: false },
        { label: `Vehicle Factor (${w.vehicle})`, val: `${vehicleAdj >= 0 ? '+' : '-'}₹${Math.abs(vehicleAdj).toFixed(2)}`, disc: vehicleAdj < 0 },
        { label: `XGBoost ML Adjustment`, val: `${mlAdj >= 0 ? '+' : '-'}₹${Math.abs(mlAdj).toFixed(2)}`, disc: mlAdj < 0 }
    ];

    document.getElementById('premium-breakdown-full').innerHTML = breakdown.map(r => `
        <div class="premium-row">
            <span class="prem-label">${r.label}</span>
            <span class="prem-val ${r.disc ? 'prem-discount' : ''}">${r.val}</span>
        </div>
    `).join('');
}

function buildAiNote() {
    const w = STATE.worker;
    const msgs = {
        low: `Your zone has a historically safe waterlogging record. Our XGBoost model applied a ₹4 discount this week. Keep working safe!`,
        medium: `Urban core zones have moderate risk. Your premium includes a standard city surcharge. Stay alert during monsoon months.`,
        high: `High flood-risk zone detected. Your premium includes a safety surcharge for enhanced coverage. You're fully protected.`
    };
    document.getElementById('ai-note-text').textContent = msgs[w.zone];
}

// ─── ENVIRONMENTAL MONITOR ───────────────────────────
function generateEnvData() {
    const zone = STATE.worker?.zone || 'low';
    const riskMult = { low: 0.3, medium: 0.6, high: 0.9 }[zone];

    const rain = Math.random() < riskMult ? (Math.random() * 30 + 5).toFixed(1) : (Math.random() * 5).toFixed(1);
    const traffic = Math.random() < (riskMult * 0.7) ? (Math.random() * 50 + 50).toFixed(0) : (Math.random() * 40 + 10).toFixed(0);
    const heat = (Math.random() * 12 + 32).toFixed(1);
    const isFlood = zone === 'high' && Math.random() < 0.25;
    const isStrike = Math.random() < 0.12;
    const isCurfew = Math.random() < 0.05;

    return { rain: parseFloat(rain), traffic: parseInt(traffic), heat: parseFloat(heat), isFlood, isStrike, isCurfew };
}

function refreshEnvironment() {
    const data = generateEnvData();
    STATE.env = data;

    const rainPct = Math.min(100, (data.rain / 30) * 100);
    const traffPct = Math.min(100, (data.traffic / 100) * 100);
    const heatPct = Math.min(100, ((data.heat - 30) / 25) * 100);

    document.getElementById('val-rain').textContent = `${data.rain} mm/hr`;
    document.getElementById('fill-rain').style.width = `${rainPct}%`;
    document.getElementById('fill-rain').style.background = data.rain > 15 ? 'var(--blue-bright)' : 'var(--blue)';

    document.getElementById('val-traffic').textContent = `${data.traffic} / 100`;
    document.getElementById('fill-traffic').style.width = `${traffPct}%`;
    document.getElementById('fill-traffic').style.background = data.traffic > 70 ? 'var(--red)' : data.traffic > 50 ? 'var(--orange)' : 'var(--green)';

    document.getElementById('val-heat').textContent = `${data.heat} °C`;
    document.getElementById('fill-heat').style.width = `${heatPct}%`;

    setEnvStatus('flood', document.getElementById('val-flood'), document.getElementById('status-flood'), data.isFlood, 'FLOOD ACTIVE', 'Normal', 'NORMAL');
    setEnvStatus('strike', document.getElementById('val-strike'), document.getElementById('status-strike'), data.isStrike, 'ALERT', 'Scanning', 'NORMAL');
    setEnvStatus('curfew', document.getElementById('val-curfew'), document.getElementById('status-curfew'), data.isCurfew, 'RESTRICTED', 'Open', 'NORMAL');

    // Env card coloring
    toggleAlertClass('env-rain', data.rain > 15);
    toggleAlertClass('env-traffic', data.traffic > 70);
    toggleAlertClass('env-flood', data.isFlood);
    toggleAlertClass('env-strike', data.isStrike);
    toggleAlertClass('env-heat', data.heat > 44);
    toggleAlertClass('env-curfew', data.isCurfew);

    // Risk score
    const riskScore = computeRisk(data);
    drawRiskGauge(riskScore);
    updateRiskFactors(data, riskScore);
    addLog(data, riskScore);

    document.getElementById('last-refresh').textContent = 'Updated: ' + new Date().toLocaleTimeString('en-IN');

    // Auto-trigger if high risk (simulates automated claim)
    if (riskScore > 80 && Math.random() < 0.3) {
        const autoTrigger = data.isFlood ? 'flood' : data.rain > 20 ? 'rain' : data.isStrike ? 'strike' : 'heat';
        addActivityLog(`AUTO-TRIGGER DETECTED: ${TRIGGERS[autoTrigger]?.label} — initiating zero-touch claim...`, 'log-warn');
        STATE.alertCount++;
        document.getElementById('alertBadge').textContent = STATE.alertCount;
    }
}

function setEnvStatus(id, valEl, statusEl, isAlert, alertText, normalVal, normalStatus) {
    if (isAlert) {
        valEl.textContent = alertText;
        statusEl.textContent = 'ALERT';
        statusEl.classList.add('alert');
    } else {
        valEl.textContent = normalVal;
        statusEl.textContent = normalStatus;
        statusEl.classList.remove('alert');
    }
}

function toggleAlertClass(id, isAlert) {
    const el = document.getElementById(id);
    if (isAlert) { el.classList.add('alerting'); el.classList.remove('warning'); }
    else { el.classList.remove('alerting'); }
}

function computeRisk(data) {
    let score = 0;
    if (data.rain > 15) score += 25;
    if (data.rain > 25) score += 15;
    if (data.traffic > 70) score += 20;
    if (data.heat > 44) score += 15;
    if (data.isFlood) score += 30;
    if (data.isStrike) score += 25;
    if (data.isCurfew) score += 35;
    const zoneBonus = { low: 0, medium: 5, high: 15 }[STATE.worker?.zone || 'low'];
    return Math.min(100, score + zoneBonus);
}

function updateRiskFactors(data, riskScore) {
    document.getElementById('risk-num').textContent = riskScore;
    const riskText = riskScore < 30 ? 'Low Risk' : riskScore < 60 ? 'Moderate' : riskScore < 80 ? 'High Risk' : 'Critical';
    document.getElementById('risk-text').textContent = riskText;
    document.getElementById('risk-num').style.color = riskScore < 30 ? 'var(--green-bright)' : riskScore < 60 ? 'var(--orange)' : 'var(--red-bright)';

    const zoneLabels = { low: 'Safe', medium: 'Moderate', high: 'Elevated' };
    document.getElementById('f-zone').textContent = zoneLabels[STATE.worker?.zone || 'low'];
    document.getElementById('f-weather').textContent = data.rain > 15 ? 'Stormy' : data.rain > 5 ? 'Rainy' : 'Clear';
    document.getElementById('f-traffic').textContent = data.traffic > 70 ? 'Severe' : data.traffic > 50 ? 'Heavy' : 'Normal';
}

function addLog(data, riskScore) {
    const msgs = [];
    if (data.rain > 15) msgs.push(` Heavy rain detected: ${data.rain}mm/hr`);
    if (data.isFlood) msgs.push(' FLOOD ALERT: Zone waterlogging confirmed');
    if (data.isStrike) msgs.push(' CIVIC DISRUPTION: Road closures active');
    if (data.isCurfew) msgs.push(' CURFEW: Zone access restricted');
    if (data.heat > 44) msgs.push(` HEAT ADVISORY: ${data.heat}°C — extreme conditions`);
    if (msgs.length === 0) msgs.push(` All sensors normal — Lux OK, Rain ${data.rain}mm/hr`);

    msgs.forEach(m => addActivityLog(m, riskScore > 60 ? 'log-warn' : 'log-info'));
}

function addActivityLog(msg, cls = 'log-info') {
    const log = document.getElementById('activity-log');
    const p = document.createElement('p');
    p.className = `log-line ${cls}`;
    p.textContent = `> ${msg}`;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
}

function startAutoRefresh() {
    STATE._refreshInterval = setInterval(refreshEnvironment, 15000);
}

// ─── RISK GAUGE CANVAS ───────────────────────────────
function drawRiskGauge(score) {
    const canvas = document.getElementById('riskCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 180, 100);

    const cx = 90, cy = 90, r = 70;
    const startAngle = Math.PI, endAngle = 2 * Math.PI;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score arc
    const pct = score / 100;
    const currentEnd = startAngle + pct * Math.PI;
    const color = score < 30 ? '#10b981' : score < 60 ? '#f59e0b' : '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, currentEnd);
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, currentEnd);
    ctx.strokeStyle = color + '44';
    ctx.lineWidth = 22;
    ctx.stroke();
}

// ─── PREMIUM CHART ───────────────────────────────────
function drawPremiumChart() {
    const canvas = document.getElementById('premiumChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 300, H = canvas.height;
    canvas.width = W;
    ctx.clearRect(0, 0, W, H);

    const premiums = STATE.premiumHistory;
    const savings = STATE.savingsHistory;
    const weeks = ['W-3', 'W-2', 'W-1', 'This\nWeek'];
    const maxVal = Math.max(...premiums, ...savings, 100);
    const pad = { left: 40, right: 20, top: 15, bottom: 30 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const step = chartW / (premiums.length - 1);

    function toY(v) { return pad.top + chartH - (v / maxVal) * chartH; }

    // Grid lines
    [0.25, 0.5, 0.75, 1].forEach(f => {
        const y = toY(maxVal * f);
        ctx.beginPath();
        ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '9px Inter';
        ctx.fillText(`₹${Math.round(maxVal * f)}`, 2, y + 3);
    });

    // Draw line
    function drawLine(data, color) {
        ctx.beginPath();
        data.forEach((v, i) => {
            const x = pad.left + i * step, y = toY(v);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Fill
        ctx.beginPath();
        data.forEach((v, i) => { const x = pad.left + i * step, y = toY(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
        ctx.lineTo(pad.left + (data.length - 1) * step, pad.top + chartH);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.closePath();
        ctx.fillStyle = color + '18';
        ctx.fill();

        // Dots
        data.forEach((v, i) => {
            const x = pad.left + i * step, y = toY(v);
            ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = color; ctx.fill();
        });
    }

    drawLine(premiums, '#3b82f6');
    drawLine(savings, '#10b981');

    // Week labels
    weeks.forEach((w, i) => {
        const x = pad.left + i * step;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(w, x, H - 4);
    });
}

// ─── CLAIMS MANAGEMENT ───────────────────────────────
async function simulateClaim(type) {
    const trigger = TRIGGERS[type];
    const pipelineEl = document.getElementById('claim-pipeline');
    pipelineEl.innerHTML = '';

    const steps = trigger.isFraud
        ? [
            { icon: '', title: 'Sensor Data Received', detail: `Lux: 650, Rain: 22mm/hr — environmental mismatch!` },
            { icon: '', title: 'XGBoost Fraud Detector Running', detail: 'Cross-referencing lux, GPS, motion sensors...' },
            { icon: '', title: 'FRAUD DETECTED', detail: trigger.condition },
            { icon: '', title: 'Claim BLOCKED', detail: 'No payout. Case flagged for review.' }
        ]
        : [
            { icon: '', title: 'Parametric Trigger Detected', detail: `${trigger.icon} ${trigger.label} — ${trigger.condition}` },
            { icon: '', title: 'Anti-Fraud Sensor Fusion', detail: 'GPS, Lux, Motion validated — no spoofing detected.' },
            { icon: '', title: 'Policy Verification', detail: `Policy ${STATE.policyId} — Coverage active, worker eligible` },
            { icon: '', title: 'Zero-Touch Payout Initiated', detail: `₹${trigger.payout} → UPI / Bank Transfer` },
            { icon: '', title: 'Worker Notified', detail: `SMS + App notification sent to ${STATE.worker.phone}` }
        ];

    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const isFail = trigger.isFraud && (i === 2 || i === 3);
        await renderPipelineStep(pipelineEl, s, i, steps.length, isFail, trigger.isFraud);
        await sleep(800);
    }

    if (!trigger.isFraud) {
        showClaimModal(trigger);
        STATE.savings += trigger.payout;
        STATE.claimsCount++;
        STATE.savingsHistory[3] = STATE.savings;
        document.getElementById('dash-savings').textContent = `₹${STATE.savings.toFixed(2)}`;
        document.getElementById('dash-claims-count').textContent = STATE.claimsCount;
        addClaimToHistory(trigger, 'approved');
    } else {
        addClaimToHistory(trigger, 'rejected');
        addActivityLog(` FRAUD RING BLOCKED — Claim denied & flagged.`, 'log-error');
    }

    drawPremiumChart();
}

async function renderPipelineStep(container, step, idx, total, isFail, isFraud) {
    const div = document.createElement('div');
    div.className = 'pipeline-step';
    div.innerHTML = `
        <div class="step-indicator step-running">${step.icon}</div>
        <div class="step-content">
            <div class="step-title">${step.title}</div>
            <div class="step-detail">${step.detail}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    await sleep(600);
    const ind = div.querySelector('.step-indicator');
    if (isFail) { ind.className = 'step-indicator step-fail'; }
    else { ind.className = 'step-indicator step-done'; }
}

function addClaimToHistory(trigger, outcome) {
    const list = document.getElementById('claims-history-list');
    const noMsg = document.getElementById('no-claims-msg');
    if (noMsg) noMsg.remove();

    STATE.claimsHistory.unshift({ trigger, outcome, date: new Date(), amount: trigger.payout });

    const div = document.createElement('div');
    div.className = 'claim-history-item';
    const isApproved = outcome === 'approved';
    div.innerHTML = `
        <div class="claim-icon">${trigger.icon}</div>
        <div class="claim-info">
            <div class="claim-type">${trigger.label}</div>
            <div class="claim-date">${new Date().toLocaleString('en-IN')}</div>
        </div>
        <div class="claim-amount ${isApproved ? 'claim-approved' : 'claim-rejected'}">
            ${isApproved ? `+₹${trigger.payout}` : 'BLOCKED'}
        </div>
    `;
    list.prepend(div);
}

function showClaimModal(trigger) {
    document.getElementById('modal-icon').textContent = '';
    document.getElementById('modal-title').textContent = 'Claim Approved!';
    document.getElementById('modal-body').textContent = `${trigger.icon} ${trigger.label} — ${trigger.condition}`;
    document.getElementById('modal-amount').textContent = `+₹${trigger.payout}`;
    document.getElementById('modal-sub').textContent = 'Amount will be credited via UPI within 60 seconds';
    document.getElementById('modal-amount').style.color = 'var(--green-bright)';
    document.getElementById('claim-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('claim-modal').style.display = 'none';
}

// ─── ALERTS PANEL — 5 MOCK API TRIGGERS ─────────────
function fetchAllAlerts() {
    const apis = [
        { id: 'weather', name: 'OpenWeatherMap', fn: mockWeatherAPI },
        { id: 'traffic', name: 'Traffic API', fn: mockTrafficAPI },
        { id: 'flood', name: 'IMD Flood API', fn: mockFloodAPI },
        { id: 'strike', name: 'Civic Strike', fn: mockStrikeAPI },
        { id: 'heat', name: 'Heat Advisory', fn: mockHeatAPI }
    ];

    apis.forEach((api, idx) => {
        setTimeout(() => {
            document.getElementById(`api-${api.id}-status`).textContent = 'Polling...';
            const result = api.fn();
            setTimeout(() => {
                const dot = document.querySelectorAll('.api-dot')[idx];
                if (result.level === 'ok') { dot.className = 'api-dot dot-ok'; }
                else if (result.level === 'warn') { dot.className = 'api-dot dot-warn'; }
                else { dot.className = 'api-dot dot-alert'; }
                document.getElementById(`api-${api.id}-status`).textContent = result.level.toUpperCase();
                addAlertFeedItem(result);
            }, 600 + idx * 200);
        }, idx * 300);
    });
}

function mockWeatherAPI() {
    const rain = (Math.random() * 30).toFixed(1);
    const level = rain > 20 ? 'alert' : rain > 10 ? 'warn' : 'ok';
    return {
        level, icon: '', source: 'OpenWeatherMap',
        title: `Rainfall: ${rain} mm/hr`,
        body: rain > 15 ? 'PARAMETRIC TRIGGER: Payout threshold exceeded!' : 'Below payout threshold. Monitoring...'
    };
}

function mockTrafficAPI() {
    const closure = Math.random() < 0.3;
    const hrs = closure ? (Math.random() * 5 + 2).toFixed(1) : 0;
    return {
        level: closure && hrs > 4 ? 'alert' : closure ? 'warn' : 'ok',
        icon: '', source: 'Traffic Disruption API',
        title: closure ? `Road closures detected: ${hrs} hrs` : 'Traffic flowing normally',
        body: closure && hrs > 4 ? 'TRIGGER: Strike-related closures > 4hrs - payout eligible' : closure ? 'Monitor — not yet at payout threshold' : 'All routes operational'
    };
}

function mockFloodAPI() {
    const flooded = Math.random() < 0.2;
    return {
        level: flooded ? 'alert' : 'ok',
        icon: '', source: 'IMD Flood Alert API',
        title: flooded ? 'Flash Flood in Operating Zone' : 'No Flood Alerts',
        body: flooded ? 'TRIGGER: Zone waterlogging verified — auto-claim initiated' : 'All zones clear'
    };
}

function mockStrikeAPI() {
    const strike = Math.random() < 0.15;
    return {
        level: strike ? 'alert' : 'ok',
        icon: '', source: 'Civic Strike Monitor',
        title: strike ? 'Bandh / Civic Strike Active' : 'No Civic Disruptions',
        body: strike ? 'TRIGGER: Road closures > 4hrs. Worker income protection active.' : 'Normal operations reported'
    };
}

function mockHeatAPI() {
    const heatIdx = (Math.random() * 18 + 35).toFixed(1);
    const level = heatIdx > 47 ? 'alert' : heatIdx > 43 ? 'warn' : 'ok';
    return {
        level, icon: '', source: 'NDMA Heat Advisory API',
        title: `Heat Index: ${heatIdx}°C`,
        body: heatIdx > 47 ? 'TRIGGER: Extreme heat advisory — payout eligible' : heatIdx > 43 ? 'Heat watch — advisory in effect' : 'Comfortable working conditions'
    };
}

function addAlertFeedItem(result) {
    const feed = document.getElementById('alert-feed');
    if (feed.querySelector('p.text-muted')) feed.innerHTML = '';
    const div = document.createElement('div');
    const cls = result.level === 'ok' ? 'alert-normal' : result.level === 'warn' ? 'alert-warning' : 'alert-critical';
    div.className = `alert-item ${cls}`;
    div.innerHTML = `
        <span class="alert-time">${new Date().toLocaleTimeString('en-IN')}</span>
        <div class="alert-title">${result.icon} ${result.source}</div>
        <div>${result.title}</div>
        <div style="margin-top:4px;opacity:0.8;">${result.body}</div>
    `;
    feed.prepend(div);

    if (result.level === 'alert') {
        STATE.alertCount++;
        document.getElementById('alertBadge').textContent = STATE.alertCount;
    }
}

// ─── UTILS ───────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
