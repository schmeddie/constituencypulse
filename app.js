// Constituency Pulse - Main Application
(function() {
    'use strict';

    // Sample constituency boundary (example coordinates for a UK constituency)
    const constituencyBoundary = [
        [52.6369, -1.1398],
        [52.6489, -1.1298],
        [52.6589, -1.1098],
        [52.6689, -1.0998],
        [52.6759, -1.0898],
        [52.6789, -1.0698],
        [52.6769, -1.0498],
        [52.6689, -1.0398],
        [52.6589, -1.0298],
        [52.6489, -1.0198],
        [52.6389, -1.0298],
        [52.6289, -1.0398],
        [52.6189, -1.0598],
        [52.6189, -1.0798],
        [52.6289, -1.0998],
        [52.6369, -1.1198]
    ];

    // Major towns in the constituency
    const majorTowns = [
        { name: 'Loughborough', lat: 52.7684, lng: -1.2048, population: 59932 },
        { name: 'Shepshed', lat: 52.7684, lng: -1.2895, population: 13505 },
        { name: 'Quorn', lat: 52.7415, lng: -1.1738, population: 5177 }
    ];

    // Sample events data
    const eventsData = [
        {
            id: 1,
            name: 'NHS Waiting Times Forum',
            category: 'healthcare',
            lat: 52.7584,
            lng: -1.2148,
            date: '2025-11-12',
            summary: 'Community discussion on improving local healthcare access and reducing waiting times at Leicester Royal Infirmary.',
            color: '#3b82f6'
        },
        {
            id: 2,
            name: 'School Funding Town Hall',
            category: 'education',
            lat: 52.7484,
            lng: -1.1948,
            date: '2025-11-15',
            summary: 'Public consultation on the allocation of new education funding for local primary and secondary schools.',
            color: '#10b981'
        },
        {
            id: 3,
            name: 'Railway Connectivity Meeting',
            category: 'transport',
            lat: 52.7384,
            lng: -1.2248,
            date: '2025-11-18',
            summary: 'Discussion on proposed improvements to Loughborough railway station and increased service frequency.',
            color: '#f59e0b'
        },
        {
            id: 4,
            name: 'Affordable Housing Initiative',
            category: 'housing',
            lat: 52.7284,
            lng: -1.2048,
            date: '2025-11-20',
            summary: 'Presentation of new affordable housing development plans and community feedback session.',
            color: '#8b5cf6'
        },
        {
            id: 5,
            name: 'Green Spaces Consultation',
            category: 'environment',
            lat: 52.7184,
            lng: -1.1848,
            date: '2025-11-22',
            summary: 'Planning meeting for new park developments and conservation of existing green spaces.',
            color: '#22c55e'
        },
        {
            id: 6,
            name: 'GP Surgery Expansion',
            category: 'healthcare',
            lat: 52.7584,
            lng: -1.2648,
            date: '2025-11-25',
            summary: 'Community update on the expansion of local GP services in Shepshed area.',
            color: '#3b82f6'
        },
        {
            id: 7,
            name: 'Adult Education Workshop',
            category: 'education',
            lat: 52.7384,
            lng: -1.1648,
            date: '2025-11-28',
            summary: 'Launch of new adult education and skills training programs at Loughborough College.',
            color: '#10b981'
        },
        {
            id: 8,
            name: 'Cycling Infrastructure Forum',
            category: 'transport',
            lat: 52.7284,
            lng: -1.1948,
            date: '2025-12-01',
            summary: 'Discussion on proposed cycle lanes and improved cycling infrastructure across the constituency.',
            color: '#f59e0b'
        }
    ];

    // Application state
    const state = {
        map: null,
        markers: [],
        activeCategory: 'all',
        activeLayers: {
            events: true,
            community: false,
            'town-halls': false,
            age: false,
            income: false,
            education: false,
            employment: false,
            voting: false,
            turnout: false
        }
    };

    // Initialize the map
    function initMap() {
        // Center of the constituency
        const center = [52.6489, -1.0698];

        state.map = L.map('map').setView(center, 12);

        // Add tile layer (using OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(state.map);

        // Draw constituency boundary
        const polygon = L.polygon(constituencyBoundary, {
            color: '#3b82f6',
            weight: 3,
            fillColor: '#60a5fa',
            fillOpacity: 0.1
        }).addTo(state.map);

        // Fit map to constituency boundary
        state.map.fitBounds(polygon.getBounds(), { padding: [50, 50] });

        // Add town markers
        addTownMarkers();

        // Add event markers
        addEventMarkers();
    }

    // Add major town markers
    function addTownMarkers() {
        const townIcon = L.divIcon({
            className: 'town-marker',
            html: `<div style="
                background-color: white;
                border: 2px solid #3b82f6;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 600;
                color: #1f2937;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">📍</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        majorTowns.forEach(town => {
            const marker = L.marker([town.lat, town.lng], { icon: townIcon })
                .addTo(state.map);

            marker.bindPopup(`
                <div style="padding: 8px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${town.name}</h3>
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">
                        Population: ${town.population.toLocaleString()}
                    </p>
                </div>
            `);

            // Add town label
            L.marker([town.lat, town.lng], {
                icon: L.divIcon({
                    className: 'town-label',
                    html: `<div style="
                        font-size: 12px;
                        font-weight: 600;
                        color: #1f2937;
                        text-shadow: 1px 1px 2px white, -1px -1px 2px white;
                        white-space: nowrap;
                    ">${town.name}</div>`,
                    iconSize: [100, 20],
                    iconAnchor: [50, -10]
                })
            }).addTo(state.map);
        });
    }

    // Add event markers
    function addEventMarkers() {
        eventsData.forEach(event => {
            const marker = createEventMarker(event);
            state.markers.push({ marker, event });
        });
    }

    // Create individual event marker
    function createEventMarker(event) {
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="custom-marker" style="background-color: ${event.color};"></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([event.lat, event.lng], { icon })
            .addTo(state.map);

        // Create popup content
        const popupContent = `
            <div class="event-popup">
                <div class="event-popup-header">
                    <div>
                        <div class="event-popup-title">${event.name}</div>
                        <div class="event-popup-date">${formatDate(event.date)}</div>
                    </div>
                </div>
                <div class="event-popup-category">${capitalizeFirst(event.category)}</div>
                <div class="event-popup-summary" style="margin-top: 12px;">
                    ${event.summary}
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        // Add hover effect
        marker.on('mouseover', function() {
            this.openPopup();
        });

        return marker;
    }

    // Filter events by category
    function filterEventsByCategory(category) {
        state.activeCategory = category;

        state.markers.forEach(({ marker, event }) => {
            if (category === 'all' || event.category === category) {
                if (state.activeLayers.events) {
                    marker.addTo(state.map);
                }
            } else {
                state.map.removeLayer(marker);
            }
        });

        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
    }

    // Toggle data layers
    function toggleLayer(layerName, isActive) {
        state.activeLayers[layerName] = isActive;

        if (layerName === 'events') {
            state.markers.forEach(({ marker, event }) => {
                if (state.activeCategory === 'all' || event.category === state.activeCategory) {
                    if (isActive) {
                        marker.addTo(state.map);
                    } else {
                        state.map.removeLayer(marker);
                    }
                }
            });
        }

        // For other layers, you would add/remove corresponding map layers
        // This is a placeholder for demonstration
        console.log(`Layer ${layerName} is now ${isActive ? 'active' : 'inactive'}`);
    }

    // Utility function to format dates
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-GB', options);
    }

    // Utility function to capitalize first letter
    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Search functionality
    function initSearch() {
        const searchInput = document.querySelector('.search-input');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();

            if (query.length < 2) return;

            // Search through events
            const results = eventsData.filter(event =>
                event.name.toLowerCase().includes(query) ||
                event.category.toLowerCase().includes(query) ||
                event.summary.toLowerCase().includes(query)
            );

            // Highlight matching events on map
            if (results.length > 0) {
                const firstResult = results[0];
                const markerData = state.markers.find(m => m.event.id === firstResult.id);
                if (markerData) {
                    state.map.setView([firstResult.lat, firstResult.lng], 14);
                    markerData.marker.openPopup();
                }
            }
        });
    }

    // Initialize event listeners
    function initEventListeners() {
        // Category filter buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                filterEventsByCategory(category);
            });
        });

        // Layer toggle checkboxes
        document.querySelectorAll('.toggle-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const layer = e.target.dataset.layer;
                const isActive = e.target.checked;
                toggleLayer(layer, isActive);
            });
        });

        // Search functionality
        initSearch();
    }

    // Initialize application
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initMap();
                initEventListeners();
            });
        } else {
            initMap();
            initEventListeners();
        }
    }

    // Start the application
    init();
})();
