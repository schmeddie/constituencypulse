import { useEffect, useRef, useState } from 'react';
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

const InteractiveMap = ({ constituency, events, activeLayers, demographicData, onBoundsChange }) => {
  const [map, setMap] = useState(null);

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={constituency.center}
        zoom={12}
        className="h-full w-full"
        whenCreated={setMap}
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
            weight: 3,
            fillColor: '#60a5fa',
            fillOpacity: 0.1,
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
        <MapLegend activeLayers={activeLayers} />
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

// Ward Overlay Component
const WardOverlay = ({ ward, activeLayers, demographicData }) => {
  const getWardData = () => {
    if (activeLayers.age && demographicData.age) {
      const wardData = demographicData.age.wards.find(w => w.wardId === ward.id);
      return wardData;
    }
    if (activeLayers.income && demographicData.income) {
      const wardData = demographicData.income.wards.find(w => w.wardId === ward.id);
      return wardData;
    }
    if (activeLayers.education && demographicData.education) {
      const wardData = demographicData.education.wards.find(w => w.wardId === ward.id);
      return wardData;
    }
    if (activeLayers.employment && demographicData.employment) {
      const wardData = demographicData.employment.wards.find(w => w.wardId === ward.id);
      return wardData;
    }
    return null;
  };

  const wardData = getWardData();

  if (!wardData) return null;

  return (
    <Polygon
      positions={ward.boundary}
      pathOptions={{
        color: wardData.color,
        weight: 2,
        fillColor: wardData.color,
        fillOpacity: wardData.intensity * 0.4,
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-base mb-2">{ward.name}</h3>
          <div className="text-sm space-y-1">
            <p><strong>Population:</strong> {ward.population.toLocaleString()}</p>
            <p><strong>Voters:</strong> {ward.voters.toLocaleString()}</p>
            {activeLayers.age && wardData.avgAge && (
              <p><strong>Average Age:</strong> {wardData.avgAge} years</p>
            )}
            {activeLayers.income && wardData.medianIncome && (
              <p><strong>Median Income:</strong> £{wardData.medianIncome.toLocaleString()}</p>
            )}
            {activeLayers.education && wardData.degreeLevel && (
              <p><strong>Degree Level+:</strong> {wardData.degreeLevel}%</p>
            )}
            {activeLayers.employment && wardData.unemploymentRate !== undefined && (
              <p><strong>Unemployment:</strong> {wardData.unemploymentRate}%</p>
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

// Map Legend Component
const MapLegend = ({ activeLayers }) => {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'bottomleft' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'bg-white p-4 rounded-lg shadow-lg');
      div.innerHTML = `
        <h4 class="font-semibold text-sm mb-3 text-dark-grey">Legend</h4>
        ${activeLayers.events ? `
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-blue-500"></span>
              <span class="text-medium-grey">Healthcare Events</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-green-500"></span>
              <span class="text-medium-grey">Education Events</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-orange-500"></span>
              <span class="text-medium-grey">Transport Events</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-purple-500"></span>
              <span class="text-medium-grey">Housing Events</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-medium-grey">Environment Events</span>
            </div>
          </div>
        ` : ''}
        ${activeLayers.age || activeLayers.income || activeLayers.education || activeLayers.employment ? `
          <div class="mt-3 pt-3 border-t border-border-grey text-xs text-medium-grey">
            Ward shading shows ${
              activeLayers.age ? 'age distribution' :
              activeLayers.income ? 'income levels' :
              activeLayers.education ? 'education levels' :
              activeLayers.employment ? 'employment status' : ''
            }
          </div>
        ` : ''}
      `;
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
