import { useState, useCallback, useRef, useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import bexhillBattleData from '../data/bexhill-battle.json';

// Mapbox token - set VITE_MAPBOX_TOKEN in .env file
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';

// Helper: Convert [lat, lng] boundary to [lng, lat] GeoJSON coordinates
const convertBoundaryToGeoJSON = (boundary) => {
  return boundary.map(coord => [coord[1], coord[0]]);
};

// Helper: Get color for demographic value
const getColorForAge = (medianAge) => {
  if (medianAge < 35) return '#dbeafe';
  if (medianAge < 45) return '#93c5fd';
  if (medianAge < 55) return '#60a5fa';
  if (medianAge < 65) return '#3b82f6';
  return '#2563eb';
};

const getColorForIncome = (medianIncome) => {
  if (medianIncome < 25000) return '#d1fae5';
  if (medianIncome < 30000) return '#86efac';
  if (medianIncome < 35000) return '#4ade80';
  if (medianIncome < 40000) return '#22c55e';
  return '#059669';
};

const getColorForEducation = (higherEducation) => {
  if (higherEducation < 25) return '#e9d5ff';
  if (higherEducation < 35) return '#d8b4fe';
  if (higherEducation < 45) return '#c084fc';
  if (higherEducation < 55) return '#a855f7';
  return '#7e22ce';
};

const getColorForEmployment = (employed) => {
  if (employed < 55) return '#fed7aa';
  if (employed < 65) return '#fdba74';
  if (employed < 75) return '#fb923c';
  if (employed < 85) return '#f97316';
  return '#c2410c';
};

const MapDashboard = ({ activeLayers, visibleEvents }) => {
  const mapRef = useRef();
  const [viewState, setViewState] = useState({
    longitude: bexhillBattleData.constituency.center[1],
    latitude: bexhillBattleData.constituency.center[0],
    zoom: bexhillBattleData.constituency.zoom
  });
  const [hoveredWardId, setHoveredWardId] = useState(null);

  // Convert constituency boundary to GeoJSON
  const constituencyGeoJSON = useMemo(() => {
    // Check if we have multiPolygon boundary (real data) or simple boundary (mock data)
    if (bexhillBattleData.constituency.multiPolygonBoundary) {
      // Real boundary data - already in correct [lat, lng] format
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: bexhillBattleData.constituency.id,
          properties: {
            name: bexhillBattleData.constituency.name
          },
          geometry: {
            type: 'MultiPolygon',
            // Convert [lat, lng] to [lng, lat] for GeoJSON
            coordinates: bexhillBattleData.constituency.multiPolygonBoundary.map(polygon =>
              polygon.map(ring =>
                ring.map(coord => [coord[1], coord[0]])
              )
            )
          }
        }]
      };
    } else {
      // Fallback to simple boundary (mock data)
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: bexhillBattleData.constituency.id,
          properties: {
            name: bexhillBattleData.constituency.name
          },
          geometry: {
            type: 'Polygon',
            coordinates: [convertBoundaryToGeoJSON(bexhillBattleData.constituency.boundary)]
          }
        }]
      };
    }
  }, []);

  // Convert wards to GeoJSON with demographic data
  const wardsGeoJSON = useMemo(() => {
    const activeDemographic = ['age', 'income', 'education', 'employment'].find(
      layer => activeLayers[layer]
    );

    return {
      type: 'FeatureCollection',
      features: bexhillBattleData.wards.map((ward, index) => {
        let fillColor = 'rgba(200, 200, 200, 0.3)'; // Default light grey

        if (activeDemographic) {
          switch (activeDemographic) {
            case 'age':
              fillColor = getColorForAge(ward.demographics.medianAge);
              break;
            case 'income':
              fillColor = getColorForIncome(ward.demographics.medianIncome);
              break;
            case 'education':
              fillColor = getColorForEducation(ward.demographics.higherEducation);
              break;
            case 'employment':
              fillColor = getColorForEmployment(ward.demographics.employed);
              break;
          }
        }

        return {
          type: 'Feature',
          id: index + 1,
          properties: {
            id: ward.id,
            name: ward.name,
            population: ward.demographics.population,
            voters: ward.demographics.voters,
            medianAge: ward.demographics.medianAge,
            medianIncome: ward.demographics.medianIncome,
            higherEducation: ward.demographics.higherEducation,
            employed: ward.demographics.employed,
            fillColor: fillColor
          },
          geometry: {
            type: 'Polygon',
            coordinates: [convertBoundaryToGeoJSON(ward.boundary)]
          }
        };
      })
    };
  }, [activeLayers]);

  // Convert events to GeoJSON (only if events layer is active)
  const eventsGeoJSON = useMemo(() => {
    if (!activeLayers?.events || !visibleEvents) {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    const events = visibleEvents.map((event, index) => ({
      type: 'Feature',
      id: index + 1,
      properties: {
        id: event.id,
        title: event.title || event.name,
        category: event.category,
        date: event.date,
        summary: event.summary
      },
      geometry: {
        type: 'Point',
        coordinates: [event.coordinates[1], event.coordinates[0]] // [lng, lat]
      }
    }));

    return {
      type: 'FeatureCollection',
      features: events
    };
  }, [activeLayers, visibleEvents]);

  // Mouse move handler for ward hover effect
  const onMouseMove = useCallback((event) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ['wards-fill']
    });

    if (features.length > 0) {
      const feature = features[0];

      // Clear previous hover state
      if (hoveredWardId !== null && hoveredWardId !== feature.id) {
        map.setFeatureState(
          { source: 'wards', id: hoveredWardId },
          { hover: false }
        );
      }

      // Set new hover state
      setHoveredWardId(feature.id);
      map.setFeatureState(
        { source: 'wards', id: feature.id },
        { hover: true }
      );

      map.getCanvas().style.cursor = 'pointer';
    } else {
      // Clear hover state if not over any feature
      if (hoveredWardId !== null) {
        map.setFeatureState(
          { source: 'wards', id: hoveredWardId },
          { hover: false }
        );
        setHoveredWardId(null);
      }
      map.getCanvas().style.cursor = '';
    }
  }, [hoveredWardId]);

  // Mouse leave handler
  const onMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (hoveredWardId !== null) {
      map.setFeatureState(
        { source: 'wards', id: hoveredWardId },
        { hover: false }
      );
      setHoveredWardId(null);
    }
    map.getCanvas().style.cursor = '';
  }, [hoveredWardId]);

  // Click handler for wards and events
  const onClick = useCallback((event) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Check for event click first (higher priority)
    const eventFeatures = map.queryRenderedFeatures(event.point, {
      layers: ['events-circle']
    });

    if (eventFeatures.length > 0) {
      const eventTitle = eventFeatures[0].properties.title;
      const eventCategory = eventFeatures[0].properties.category;
      console.log('Event clicked:', eventTitle, `(${eventCategory})`);
      return;
    }

    // Check for ward click
    const wardFeatures = map.queryRenderedFeatures(event.point, {
      layers: ['wards-fill']
    });

    if (wardFeatures.length > 0) {
      const wardName = wardFeatures[0].properties.name;
      const wardPop = wardFeatures[0].properties.population;
      console.log('Ward clicked:', wardName, `(Population: ${wardPop})`);
    }
  }, []);

  // Determine which demographic layer is active for legend/info
  const activeDemographic = ['age', 'income', 'education', 'employment'].find(
    layer => activeLayers?.[layer]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
        interactiveLayerIds={['wards-fill', 'events-circle']}
      >
        {/* Constituency Boundary */}
        <Source
          id="constituency"
          type="geojson"
          data={constituencyGeoJSON}
        >
          <Layer
            id="constituency-line"
            type="line"
            paint={{
              'line-color': '#1f2937',
              'line-width': 3,
              'line-dasharray': [2, 2]
            }}
          />
        </Source>

        {/* Ward Boundaries with Demographics */}
        <Source
          id="wards"
          type="geojson"
          data={wardsGeoJSON}
        >
          {/* Fill layer with demographic colors */}
          <Layer
            id="wards-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.8,
                0.6
              ]
            }}
          />

          {/* Ward borders */}
          <Layer
            id="wards-line"
            type="line"
            paint={{
              'line-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#333333',
                '#666666'
              ],
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                2,
                1
              ]
            }}
          />
        </Source>

        {/* Events (only shown if events layer is active) */}
        {activeLayers?.events && eventsGeoJSON.features.length > 0 && (
          <Source
            id="events"
            type="geojson"
            data={eventsGeoJSON}
          >
            <Layer
              id="events-circle"
              type="circle"
              paint={{
                'circle-radius': 8,
                'circle-color': [
                  'match',
                  ['get', 'category'],
                  'healthcare', '#3BB2D0',
                  'education', '#A50F15',
                  'transport', '#FFCC00',
                  'housing', '#8B4513',
                  'environment', '#228B22',
                  '#999999'
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
                'circle-opacity': 0.9
              }}
            />
          </Source>
        )}
      </Map>

      {/* Legend overlay */}
      {activeDemographic && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
            {activeDemographic === 'age' && 'Median Age'}
            {activeDemographic === 'income' && 'Median Income (£)'}
            {activeDemographic === 'education' && 'Higher Education (%)'}
            {activeDemographic === 'employment' && 'Employment Rate (%)'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {activeDemographic === 'age' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#dbeafe', border: '1px solid #ccc' }}></div>
                  <span>&lt; 35</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#93c5fd', border: '1px solid #ccc' }}></div>
                  <span>35-45</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#60a5fa', border: '1px solid #ccc' }}></div>
                  <span>45-55</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#3b82f6', border: '1px solid #ccc' }}></div>
                  <span>55-65</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#2563eb', border: '1px solid #ccc' }}></div>
                  <span>65+</span>
                </div>
              </>
            )}
            {activeDemographic === 'income' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#d1fae5', border: '1px solid #ccc' }}></div>
                  <span>&lt; £25k</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#86efac', border: '1px solid #ccc' }}></div>
                  <span>£25-30k</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#4ade80', border: '1px solid #ccc' }}></div>
                  <span>£30-35k</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#22c55e', border: '1px solid #ccc' }}></div>
                  <span>£35-40k</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#059669', border: '1px solid #ccc' }}></div>
                  <span>£40k+</span>
                </div>
              </>
            )}
            {activeDemographic === 'education' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#e9d5ff', border: '1px solid #ccc' }}></div>
                  <span>&lt; 25%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#d8b4fe', border: '1px solid #ccc' }}></div>
                  <span>25-35%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#c084fc', border: '1px solid #ccc' }}></div>
                  <span>35-45%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#a855f7', border: '1px solid #ccc' }}></div>
                  <span>45-55%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#7e22ce', border: '1px solid #ccc' }}></div>
                  <span>55%+</span>
                </div>
              </>
            )}
            {activeDemographic === 'employment' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#fed7aa', border: '1px solid #ccc' }}></div>
                  <span>&lt; 55%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#fdba74', border: '1px solid #ccc' }}></div>
                  <span>55-65%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#fb923c', border: '1px solid #ccc' }}></div>
                  <span>65-75%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#f97316', border: '1px solid #ccc' }}></div>
                  <span>75-85%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#c2410c', border: '1px solid #ccc' }}></div>
                  <span>85%+</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDashboard;
