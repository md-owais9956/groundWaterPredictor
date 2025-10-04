document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const loaderOverlay = document.getElementById('loader-overlay');
    const stationListContainer = document.getElementById('station-list');
    // ... (rest of element references are the same)

    let allStationsGrouped = {};
    let map;

    // --- Helper and Model Functions ---
    function parseDate(dateString) { }
    function predictFutureLevel(stationData, daysInFuture) {}
    function renderStations(stations) {  }
    function initializeMap() {  }

    // --- Data Loading ---
    function loadLocalData() {
        // Show the spinner before we start parsing
        loaderOverlay.style.display = 'flex';

        Papa.parse('data/master_data.csv', {
            download: true, header: true, skipEmptyLines: true,
            complete: (results) => {
                const cleanedRecords = results.data.filter(r => parseDate(r.date) && !isNaN(parseFloat(r.currentlevel)));
                const groupedData = {};
                for (const record of cleanedRecords) {
                    const stationName = record.station_name;
                    if (!groupedData[stationName]) groupedData[stationName] = [];
                    groupedData[stationName].push(record);
                }
                for (const stationName in groupedData) {
                    groupedData[stationName].sort((a, b) => parseDate(a.date) - parseDate(b.date));
                }
                allStationsGrouped = groupedData;
                renderStations(allStationsGrouped);
                initializeMap();

                // Hide the spinner after everything is rendered
                loaderOverlay.style.display = 'none';
            },
            error: (err) => {
                console.error("Error parsing CSV:", err);
                stationListContainer.innerHTML = `<p class="loading-text">Error: Could not load data file.</p>`;
                // Also hide spinner on error
                loaderOverlay.style.display = 'none';
            }
        });
    }

    // --- Event Listeners ---
    // (All event listeners are the same as the previous correct version)
    
    // --- Initial Load ---
    loadLocalData();

    // --- Full functions pasted below for completeness ---
    // (This ensures a complete, clean file)
    const searchBar = document.getElementById('search-bar');
    const historyModal = document.getElementById('history-modal');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const mapViewBtn = document.getElementById('map-view-btn');
    const mapContainer = document.getElementById('map-container');

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    function parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.split('-');
        if (parts.length !== 3) return null;
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return isNaN(date.getTime()) ? null : date;
    }
    function predictFutureLevel(stationData, daysInFuture) {
        if (stationData.length < 2) return null;
        const firstDate = parseDate(stationData[0].date);
        const timeSeries = stationData.map(d => ({
            days: (parseDate(d.date) - firstDate) / (1000 * 60 * 60 * 24),
            level: parseFloat(d.currentlevel)
        }));
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = timeSeries.length;
        for (const point of timeSeries) {
            sumX += point.days; sumY += point.level; sumXY += point.days * point.level; sumX2 += point.days * point.days;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const lastPoint = timeSeries[n - 1];
        const predictionPoint = lastPoint.days + daysInFuture;
        const predictedLevel = slope * predictionPoint + intercept;
        return isNaN(predictedLevel) ? null : predictedLevel;
    }
    function renderStations(stations) {
        stationListContainer.innerHTML = '';
        if (Object.keys(stations).length === 0) {
            stationListContainer.innerHTML = '<p class="loading-text">No stations found.</p>';
            return;
        }
        for (const stationName in stations) {
            const stationData = stations[stationName];
            const mostRecentRecord = stationData[stationData.length - 1];
            const card = document.createElement('div');
            card.className = 'station-card';
            const predictedLevel = predictFutureLevel(stationData, 365);
            let alertHtml = '';
            if (predictedLevel && predictedLevel > 30) {
                alertHtml = `<div class="alert-message">ALERT: Level predicted to be CRITICAL</div>`;
            }
            const latitude = mostRecentRecord.latitude;
            const longitude = mostRecentRecord.longitude;
            const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            card.innerHTML = `${alertHtml}<div class="card-content"><div class="card-header"><h3>${mostRecentRecord.station_name}</h3><p>${mostRecentRecord.district_name}, ${mostRecentRecord.state_name}</p></div><div class="card-body"><div><p class="label">Most Recent Level</p><p class="value">${parseFloat(mostRecentRecord.currentlevel).toFixed(2)}</p></div></div><div class="prediction-section"><div class="prediction-controls" data-station-name="${stationName}"><button class="prediction-btn" data-days="7">Week</button><button class="prediction-btn" data-days="30">Month</button><button class="prediction-btn active" data-days="365">Year</button></div><div class="prediction-display"><p class="label">Predicted Level (Next Year)</p><p class="value">${predictedLevel ? predictedLevel.toFixed(2) : 'N/A'}</p></div></div></div><div class="card-footer"><button class="footer-btn history-btn" data-station-name="${stationName}"><i class="fa-solid fa-clock-rotate-left"></i> History</button><a href="${mapLink}" target="_blank" class="footer-btn"><i class="fa-solid fa-map-location-dot"></i> Map</a></div>`;
            stationListContainer.appendChild(card);
        }
    }
    function initializeMap() {
        if (map) map.remove();
        map = L.map('map-container').setView([20.5937, 78.9629], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        const markers = L.markerClusterGroup();
        for (const stationName in allStationsGrouped) {
            const mostRecentRecord = allStationsGrouped[stationName][allStationsGrouped[stationName].length - 1];
            const lat = parseFloat(mostRecentRecord.latitude);
            const lon = parseFloat(mostRecentRecord.longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
                const marker = L.marker([lat, lon]);
                marker.bindPopup(`<b>${mostRecentRecord.station_name}</b><br>Level: ${mostRecentRecord.currentlevel}m`);
                markers.addLayer(marker);
            }
        }
        map.addLayer(markers);
    }
    searchBar.addEventListener('input', debounce((event) => {
        const searchTerm = event.target.value.toLowerCase();
        if (searchTerm.length < 3) { renderStations(allStationsGrouped); return; }
        const filteredStations = {};
        for (const stationName in allStationsGrouped) {
            const station = allStationsGrouped[stationName][0];
            if ((station.station_name || '').toLowerCase().includes(searchTerm) || (station.district_name || '').toLowerCase().includes(searchTerm)) {
                filteredStations[stationName] = allStationsGrouped[stationName];
            }
        }
        renderStations(filteredStations);
    }, 300));
    stationListContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.classList.contains('prediction-btn')) {
            const controls = target.parentElement;
            const stationName = controls.dataset.stationName;
            const days = parseInt(target.dataset.days);
            const stationData = allStationsGrouped[stationName];
            const predictedLevel = predictFutureLevel(stationData, days);
            const card = target.closest('.station-card');
            const displayLabel = card.querySelector('.prediction-display .label');
            const displayValue = card.querySelector('.prediction-display .value');
            controls.querySelectorAll('.prediction-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            displayLabel.textContent = `Predicted Level (${target.textContent})`;
            displayValue.textContent = predictedLevel ? predictedLevel.toFixed(2) : 'N/A';
        }
        if (target.classList.contains('history-btn')) {
            const stationName = target.dataset.stationName;
            const stationData = allStationsGrouped[stationName];
            modalTitle.textContent = `Historical Data for ${stationName}`;
            let tableHTML = '<table><tr><th>Date</th><th>Water Level (m)</th></tr>';
            stationData.forEach(record => {
                tableHTML += `<tr><td>${parseDate(record.date).toLocaleDateString()}</td><td>${record.currentlevel}</td></tr>`;
            });
            tableHTML += '</table>';
            modalBody.innerHTML = tableHTML;
            historyModal.style.display = 'flex';
        }
    });
    modalCloseBtn.addEventListener('click', () => historyModal.style.display = 'none');
    historyModal.addEventListener('click', (event) => {
        if (event.target === historyModal) historyModal.style.display = 'none';
    });
    gridViewBtn.addEventListener('click', () => {
        stationListContainer.classList.remove('hidden');
        mapContainer.classList.add('hidden');
        gridViewBtn.classList.add('active');
        mapViewBtn.classList.remove('active');
    });
    mapViewBtn.addEventListener('click', () => {
        stationListContainer.classList.add('hidden');
        mapContainer.classList.remove('hidden');
        gridViewBtn.classList.remove('active');
        mapViewBtn.classList.add('active');
        if (map) map.invalidateSize();
    });
});