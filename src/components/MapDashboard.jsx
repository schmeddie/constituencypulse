import { useState, useCallback, useRef } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox token - set VITE_MAPBOX_TOKEN in .env file
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';

// Mock GeoJSON: Westminster Parliamentary Constituencies (ONS Data)
const constituencyData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 1,
      properties: {
        PCON24NM: 'Loughborough',
        PCON24CD: 'E14000797'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.25, 52.72],
          [-1.15, 52.72],
          [-1.15, 52.62],
          [-1.25, 52.62],
          [-1.25, 52.72]
        ]]
      }
    },
    {
      type: 'Feature',
      id: 2,
      properties: {
        PCON24NM: 'Leicester South',
        PCON24CD: 'E14000795'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.15, 52.60],
          [-1.05, 52.60],
          [-1.05, 52.50],
          [-1.15, 52.50],
          [-1.15, 52.60]
        ]]
      }
    },
    {
      type: 'Feature',
      id: 3,
      properties: {
        PCON24NM: 'Nottingham East',
        PCON24CD: 'E14000849'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.05, 52.98],
          [-0.95, 52.98],
          [-0.95, 52.88],
          [-1.05, 52.88],
          [-1.05, 52.98]
        ]]
      }
    },
    {
      type: 'Feature',
      id: 4,
      properties: {
        PCON24NM: 'Derby North',
        PCON24CD: 'E14000665'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-1.50, 52.95],
          [-1.40, 52.95],
          [-1.40, 52.85],
          [-1.50, 52.85],
          [-1.50, 52.95]
        ]]
      }
    }
  ]
};

// Mock GeoJSON: Local Events (Point Data)
const eventsData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        title: 'New Health Centre Opening',
        category: 'Healthcare'
      },
      geometry: {
        type: 'Point',
        coordinates: [-1.20, 52.67]
      }
    },
    {
      type: 'Feature',
      properties: {
        title: 'Town Hall Meeting on Education Budget',
        category: 'Education'
      },
      geometry: {
        type: 'Point',
        coordinates: [-1.10, 52.55]
      }
    },
    {
      type: 'Feature',
      properties: {
        title: 'Transport Infrastructure Consultation',
        category: 'Transport'
      },
      geometry: {
        type: 'Point',
        coordinates: [-1.00, 52.93]
      }
    },
    {
      type: 'Feature',
      properties: {
        title: 'Housing Development Proposal',
        category: 'Housing'
      },
      geometry: {
        type: 'Point',
        coordinates: [-1.45, 52.90]
      }
    },
    {
      type: 'Feature',
      properties: {
        title: 'Community Health Fair',
        category: 'Healthcare'
      },
      geometry: {
        type: 'Point',
        coordinates: [-1.08, 52.58]
      }
    },
    {
      type: 'Feature',
      properties: {
        title: 'Bus Route Expansion Meeting',
        category: 'Transport'
      },
      geometry: {
        type: 'Point',
        coordinates: [-1.22, 52.70]
      }
    }
  ]
};

const MapDashboard = () => {
  const mapRef = useRef();
  const [viewState, setViewState] = useState({
    longitude: -3.0,
    latitude: 55.0,
    zoom: 5
  });
  const [hoveredConstituencyId, setHoveredConstituencyId] = useState(null);

  // Mouse move handler for constituency hover effect
  const onMouseMove = useCallback((event) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ['constituency-fill']
    });

    if (features.length > 0) {
      const feature = features[0];

      // Clear previous hover state
      if (hoveredConstituencyId !== null && hoveredConstituencyId !== feature.id) {
        map.setFeatureState(
          { source: 'constituencies', id: hoveredConstituencyId },
          { hover: false }
        );
      }

      // Set new hover state
      setHoveredConstituencyId(feature.id);
      map.setFeatureState(
        { source: 'constituencies', id: feature.id },
        { hover: true }
      );

      // Change cursor to pointer
      map.getCanvas().style.cursor = 'pointer';
    } else {
      // Clear hover state if not over any feature
      if (hoveredConstituencyId !== null) {
        map.setFeatureState(
          { source: 'constituencies', id: hoveredConstituencyId },
          { hover: false }
        );
        setHoveredConstituencyId(null);
      }
      map.getCanvas().style.cursor = '';
    }
  }, [hoveredConstituencyId]);

  // Mouse leave handler
  const onMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (hoveredConstituencyId !== null) {
      map.setFeatureState(
        { source: 'constituencies', id: hoveredConstituencyId },
        { hover: false }
      );
      setHoveredConstituencyId(null);
    }
    map.getCanvas().style.cursor = '';
  }, [hoveredConstituencyId]);

  // Click handler for constituencies and events
  const onClick = useCallback((event) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Check for constituency click
    const constituencyFeatures = map.queryRenderedFeatures(event.point, {
      layers: ['constituency-fill']
    });

    if (constituencyFeatures.length > 0) {
      const constituencyName = constituencyFeatures[0].properties.PCON24NM;
      console.log('Constituency clicked:', constituencyName);
      return;
    }

    // Check for event click
    const eventFeatures = map.queryRenderedFeatures(event.point, {
      layers: ['events-circle']
    });

    if (eventFeatures.length > 0) {
      const eventTitle = eventFeatures[0].properties.title;
      console.log('Event clicked:', eventTitle);
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        mapStyle="mapbox://styles/mapbox/light-v10"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['constituency-fill', 'events-circle']}
      >
        {/* Constituency Boundaries Source */}
        <Source
          id="constituencies"
          type="geojson"
          data={constituencyData}
        >
          {/* Fill layer (transparent interior) */}
          <Layer
            id="constituency-fill"
            type="fill"
            paint={{
              'fill-color': 'rgba(0,0,0,0)',
              'fill-opacity': 0
            }}
          />

          {/* Line layer (stroke/outline) */}
          <Layer
            id="constituency-line"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#007cbf', // Hover color (blue)
                '#CCCCCC'  // Default color (light grey)
              ],
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                3, // Hover width
                1  // Default width
              ]
            }}
          />
        </Source>

        {/* Events Source */}
        <Source
          id="events"
          type="geojson"
          data={eventsData}
        >
          {/* Circle layer with data-driven styling */}
          <Layer
            id="events-circle"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': [
                'match',
                ['get', 'category'],
                'Healthcare', '#3BB2D0',    // Blue
                'Education', '#A50F15',     // Dark red
                'Transport', '#FFCC00',     // Yellow
                'Housing', '#8B4513',       // Brown
                'Environment', '#228B22',   // Green
                '#999999'                   // Default grey
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF'
            }}
          />
        </Source>
      </Map>
    </div>
  );
};

export default MapDashboard;
