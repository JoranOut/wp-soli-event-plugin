// Front-end initializer for the event-location-map block: mounts a Leaflet
// map with OpenStreetMap tiles on every rendered [data-soli-map] container.
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Filled variant of inc/assets/img/icons/tent.svg: same path data, with the
// tent body's inner cutout subpath dropped so the shape renders solid.
const TENT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 49.29 59" width="30" height="36" fill="#7a1f2b" aria-hidden="true">' +
    '<path d="M46.79,59h-6.7c-7.51,0-11.91-4.83-15.39-12.56C21.56,54,17.83,59,10.22,59H2.5A2.5,2.5,0,0,1,0,56.5V31.42a2.5,2.5,0,0,1,2.5-2.5c8.64,0,15.13-5.1,19.87-15.58a2.5,2.5,0,0,1,2.28-1.47h0a2.52,2.52,0,0,1,2.28,1.47c4.73,10.48,11.23,15.58,19.86,15.58a2.5,2.5,0,0,1,2.5,2.5V56.5A2.5,2.5,0,0,1,46.79,59Z"/>' +
    '<path d="M24.65,16.87a2.5,2.5,0,0,1-2.5-2.5V2.5a2.5,2.5,0,0,1,5,0V14.37A2.5,2.5,0,0,1,24.65,16.87Z"/>' +
    '<path d="M38.06,12.94H24.65a2.5,2.5,0,0,1,0-5H33A2.49,2.49,0,0,1,33,5H24.65a2.5,2.5,0,0,1,0-5H38.06a2.5,2.5,0,0,1,2,4L38.15,6.47,40,8.91a2.5,2.5,0,0,1-2,4Z"/>' +
    '</svg>';

function initMap(el) {
    const lat = parseFloat(el.dataset.lat);
    const lng = parseFloat(el.dataset.lng);
    const zoom = parseInt(el.dataset.zoom, 10) || 15;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
    }

    const map = L.map(el, { scrollWheelZoom: false }).setView([lat, lng], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Anchor at the tent's bottom center (its base sits on the venue).
    const icon = L.divIcon({
        className: 'soli-event-location-map__pin',
        html: TENT_SVG,
        iconSize: [30, 36],
        iconAnchor: [15, 36],
        popupAnchor: [0, -34],
    });
    const marker = L.marker([lat, lng], { icon }).addTo(map);

    // Popup content is built as DOM nodes (textContent), never as an HTML
    // string: name and address are user-entered data.
    const popup = document.createElement('p');
    popup.className = 'soli-event-location-map__popup';
    const name = document.createElement('strong');
    name.textContent = el.dataset.name || '';
    popup.appendChild(name);
    if (el.dataset.address) {
        popup.appendChild(document.createElement('br'));
        popup.appendChild(document.createTextNode(el.dataset.address));
    }
    marker.bindPopup(popup);
}

function init() {
    document.querySelectorAll('[data-soli-map]').forEach(initMap);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
