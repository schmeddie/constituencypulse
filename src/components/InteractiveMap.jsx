import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Color scale functions for choropleth maps
const getColorForAge = (avgAge) => {
  // Younger (lighter blue) → Older (darker blue)
  if (avgAge < 30) return '#dbeafe'; // Very light blue
  if (avgAge < 35) return '#bfdbfe'; // Light blue
  if (avgAge < 40) return '#93c5fd'; // Medium light blue
  if (avgAge < 45) return '#60a5fa'; // Medium blue
  if (avgAge < 50) return '#3b82f6'; // Blue
  return '#2563eb'; // Dark blue
};

const getColorForIncome = (medianIncome) => {
  // Lower income (lighter green) → Higher income (darker green)
  if (medianIncome < 25000) return '#d1fae5'; // Very light green
  if (medianIncome < 30000) return '#a7f3d0'; // Light green
  if (medianIncome < 35000) return '#6ee7b7'; // Medium light green
  if (medianIncome < 40000) return '#34d399'; // Medium green
  if (medianIncome < 45000) return '#10b981'; // Green
  return '#059669'; // Dark green
};

const getColorForEducation = (degreeLevel) => {
  // Fewer degrees (lighter purple) → More degrees (darker purple)
  if (degreeLevel < 30) return '#e9d5ff'; // Very light purple
  if (degreeLevel < 35) return '#d8b4fe'; // Light purple
  if (degreeLevel < 40) return '#c084fc'; // Medium light purple
  if (degreeLevel < 45) return '#a855f7'; // Medium purple
  if (degreeLevel < 50) return '#9333ea'; // Purple
  return '#7e22ce'; // Dark purple
};

const getColorForEmployment = (economicallyActive) => {
  // Lower employment (lighter orange) → Higher employment (darker orange)
  if (economicallyActive < 80) return '#fed7aa'; // Very light orange
  if (economicallyActive < 83) return '#fdba74'; // Light orange
  if (economicallyActive < 86) return '#fb923c'; // Medium light orange
  if (economicallyActive < 89) return '#f97316'; // Medium orange
  if (economicallyActive < 92) return '#ea580c'; // Orange
  return '#c2410c'; // Dark orange
};

const InteractiveMap = ({ constituency, events, activeLayers, demographicData, onBoundsChange }) => {
  return (
    <div className="h-full w-full relative" style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={constituency.center}
        zoom={12}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Constituency Boundary */}
        <Polygon
          positions={constituency.boundary}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            fillColor: '#60a5fa',
            fillOpacity: 0.05,
          }}
        />

        {/* Ward Overlays with Demographics */}
        {constituency.wards && constituency.wards.map(ward => (
          <WardOverlay
            key={ward.id}
            ward={ward}
            activeLayers={activeLayers}
            demographicData={demographicData}
          />
        ))}

        {/* Town Markers */}
        {constituency.towns && constituency.towns.map((town, index) => (
          <TownMarker key={index} town={town} />
        ))}

        {/* Event Markers */}
        {activeLayers.events && events && events.map(event => (
          <EventMarker key={event.id} event={event} />
        ))}

        {/* Map Events Handler */}
        <MapEventsHandler onBoundsChange={onBoundsChange} />

        {/* Legend */}
        <ChoroplethLegend activeLayers={activeLayers} />
      </MapContainer>
    </div>
  );
};

// Component to handle map events
const MapEventsHandler = ({ onBoundsChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    },
    zoomend: () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    },
  });

  useEffect(() => {
    // Trigger initial bounds
    const bounds = map.getBounds();
    onBoundsChange(bounds);
  }, []);

  return null;
};

// Ward Overlay Component with Choropleth Styling
const WardOverlay = ({ ward, activeLayers, demographicData }) => {
  const getWardStyle = () => {
    // Check which demographic layer is active
    if (activeLayers.age && demographicData.age) {
      const wardData = demographicData.age.wards.find(w => w.wardId === ward.id);
      if (wardData) {
        return {
          fillColor: getColorForAge(wardData.avgAge),
          fillOpacity: 0.6,
          color: '#555',
          weight: 1,
          data: wardData,
          metric: 'age',
          value: `${wardData.avgAge} years`,
          label: 'Average Age'
        };
      }
    }

    if (activeLayers.income && demographicData.income) {
      const wardData = demographicData.income.wards.find(w => w.wardId === ward.id);
      if (wardData) {
        return {
          fillColor: getColorForIncome(wardData.medianIncome),
          fillOpacity: 0.6,
          color: '#555',
          weight: 1,
          data: wardData,
          metric: 'income',
          value: `£${wardData.medianIncome.toLocaleString()}`,
          label: 'Median Income'
        };
      }
    }

    if (activeLayers.education && demographicData.education) {
      const wardData = demographicData.education.wards.find(w => w.wardId === ward.id);
      if (wardData) {
        return {
          fillColor: getColorForEducation(wardData.degreeLevel),
          fillOpacity: 0.6,
          color: '#555',
          weight: 1,
          data: wardData,
          metric: 'education',
          value: `${wardData.degreeLevel}%`,
          label: 'Degree Level+'
        };
      }
    }

    if (activeLayers.employment && demographicData.employment) {
      const wardData = demographicData.employment.wards.find(w => w.wardId === ward.id);
      if (wardData) {
        return {
          fillColor: getColorForEmployment(wardData.economicallyActive),
          fillOpacity: 0.6,
          color: '#555',
          weight: 1,
          data: wardData,
          metric: 'employment',
          value: `${wardData.economicallyActive}%`,
          label: 'Economically Active'
        };
      }
    }

    // No demographic layer active - return transparent style
    return {
      fillColor: 'transparent',
      fillOpacity: 0,
      color: '#999',
      weight: 1,
      data: null,
      metric: null
    };
  };

  const style = getWardStyle();

  return (
    <Polygon
      positions={ward.boundary}
      pathOptions={{
        color: style.color,
        weight: style.weight,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
      }}
      eventHandlers={{
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: '#333',
            fillOpacity: 0.8
          });

          // Show tooltip
          if (style.data) {
            layer.bindTooltip(
              `<strong>${ward.name}</strong><br/>${style.label}: ${style.value}`,
              {
                permanent: false,
                direction: 'top',
                className: 'ward-tooltip'
              }
            ).openTooltip();
          }
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: style.weight,
            color: style.color,
            fillOpacity: style.fillOpacity
          });
          layer.closeTooltip();
        }
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-base mb-2">{ward.name}</h3>
          <div className="text-sm space-y-1">
            <p><strong>Population:</strong> {ward.population.toLocaleString()}</p>
            <p><strong>Voters:</strong> {ward.voters.toLocaleString()}</p>
            {style.data && (
              <p><strong>{style.label}:</strong> {style.value}</p>
            )}
          </div>
        </div>
      </Popup>
    </Polygon>
  );
};

// Town Marker Component
const TownMarker = ({ town }) => {
  const townIcon = L.divIcon({
    className: 'town-label-marker',
    html: `
      <div class="bg-white border-2 border-primary-blue rounded px-2 py-1 text-xs font-semibold text-dark-grey whitespace-nowrap shadow-md">
        📍 ${town.name}
      </div>
    `,
    iconSize: [100, 30],
    iconAnchor: [50, 15],
  });

  return (
    <Marker position={[town.lat, town.lng]} icon={townIcon}>
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-base mb-1">{town.name}</h3>
          <p className="text-sm text-medium-grey">
            Population: {town.population.toLocaleString()}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

// Event Marker Component
const EventMarker = ({ event }) => {
  const eventIcon = L.divIcon({
    className: 'custom-event-marker',
    html: `
      <div class="custom-marker transition-transform hover:scale-110" style="
        width: 30px;
        height: 30px;
        background-color: ${event.color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        cursor: pointer;
      "></div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Marker position={[event.lat, event.lng]} icon={eventIcon}>
      <Popup maxWidth={300} className="custom-event-popup">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-base text-dark-grey pr-2">{event.name}</h3>
          </div>

          <div className="mb-3">
            <span className="inline-block px-2.5 py-1 bg-light-blue text-primary-blue text-xs font-medium rounded">
              {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
            </span>
          </div>

          <div className="space-y-2 text-sm mb-3">
            <p className="text-medium-grey">
              <strong className="text-dark-grey">Date:</strong> {formatDate(event.date)}
            </p>
            <p className="text-medium-grey">
              <strong className="text-dark-grey">Time:</strong> {formatTime(event.date)}
            </p>
            <p className="text-medium-grey">
              <strong className="text-dark-grey">Location:</strong> {event.location}
            </p>
            {event.attendees && (
              <p className="text-medium-grey">
                <strong className="text-dark-grey">Expected Attendees:</strong> {event.attendees}
              </p>
            )}
          </div>

          <p className="text-sm leading-relaxed text-dark-grey border-t border-border-grey pt-3">
            {event.summary}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

// Choropleth Legend Component
const ChoroplethLegend = ({ activeLayers }) => {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'bottomleft' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'choropleth-legend bg-white p-4 rounded-lg shadow-lg');

      let content = '<h4 class="font-semibold text-sm mb-3 text-dark-grey">Legend</h4>';

      // Show choropleth gradient if a demographic layer is active
      if (activeLayers.age) {
        content += `
          <div class="mb-2 text-xs font-semibold text-medium-grey">Age Distribution</div>
          <div class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-4 rounded" style="background: linear-gradient(to right, #dbeafe, #bfdbfe, #93c5fd, #60a5fa, #3b82f6, #2563eb);"></div>
          </div>
          <div class="flex justify-between text-xs text-medium-grey mb-3">
            <span>Younger</span>
            <span>Older</span>
          </div>
        `;
      } else if (activeLayers.income) {
        content += `
          <div class="mb-2 text-xs font-semibold text-medium-grey">Income Levels</div>
          <div class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-4 rounded" style="background: linear-gradient(to right, #d1fae5, #a7f3d0, #6ee7b7, #34d399, #10b981, #059669);"></div>
          </div>
          <div class="flex justify-between text-xs text-medium-grey mb-3">
            <span>Lower</span>
            <span>Higher</span>
          </div>
        `;
      } else if (activeLayers.education) {
        content += `
          <div class="mb-2 text-xs font-semibold text-medium-grey">Education Levels</div>
          <div class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-4 rounded" style="background: linear-gradient(to right, #e9d5ff, #d8b4fe, #c084fc, #a855f7, #9333ea, #7e22ce);"></div>
          </div>
          <div class="flex justify-between text-xs text-medium-grey mb-3">
            <span>Fewer Degrees</span>
            <span>More Degrees</span>
          </div>
        `;
      } else if (activeLayers.employment) {
        content += `
          <div class="mb-2 text-xs font-semibold text-medium-grey">Employment Status</div>
          <div class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-4 rounded" style="background: linear-gradient(to right, #fed7aa, #fdba74, #fb923c, #f97316, #ea580c, #c2410c);"></div>
          </div>
          <div class="flex justify-between text-xs text-medium-grey mb-3">
            <span>Lower</span>
            <span>Higher</span>
          </div>
        `;
      }

      // Show event markers legend if events are active
      if (activeLayers.events) {
        content += `
          ${(activeLayers.age || activeLayers.income || activeLayers.education || activeLayers.employment) ? '<div class="border-t border-border-grey pt-3 mt-2"></div>' : ''}
          <div class="mb-2 text-xs font-semibold text-medium-grey">Events</div>
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background-color: #3b82f6;"></span>
              <span class="text-medium-grey">Healthcare</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background-color: #10b981;"></span>
              <span class="text-medium-grey">Education</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background-color: #f59e0b;"></span>
              <span class="text-medium-grey">Transport</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background-color: #8b5cf6;"></span>
              <span class="text-medium-grey">Housing</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background-color: #22c55e;"></span>
              <span class="text-medium-grey">Environment</span>
            </div>
          </div>
        `;
      }

      div.innerHTML = content;
      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map, activeLayers]);

  return null;
};

export default InteractiveMap;
