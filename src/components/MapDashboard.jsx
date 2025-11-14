import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import Map, { Source, Layer, Popup, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import DrawingControls from './DrawingControls';
import RegionSelector from './RegionSelector';
import { applyFiltersToWards } from '../utils/filterUtils';
import { LAYER_METADATA, formatPopupValue, shouldShowDeprivationNote, getPartyColor, getPartyDisplayName } from '../utils/layerMetadata';

// Mapbox token - set VITE_MAPBOX_TOKEN in .env file
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';

// Helper: Convert [lat, lng] boundary to [lng, lat] GeoJSON coordinates
const convertBoundaryToGeoJSON = (boundary) => {
  return boundary.map(coord => [coord[1], coord[0]]);
};

// Helper: Get color for LSOA deprivation deciles (1-10)
// Decile 1 = Most deprived (red), Decile 10 = Least deprived (green)
const getColorForDeprivation = (decile) => {
  if (!decile) return 'rgba(200, 200, 200, 0.3)'; // No data
  if (decile <= 2) return '#dc2626'; // Most deprived - dark red
  if (decile <= 4) return '#f97316'; // High deprivation - orange
  if (decile <= 6) return '#fbbf24'; // Medium deprivation - yellow
  if (decile <= 8) return '#84cc16'; // Low deprivation - lime
  return '#22c55e'; // Least deprived - green
};

// All deprivation indices use the same color scale
const getColorForIMD = (decile) => getColorForDeprivation(decile);
const getColorForIncome = (decile) => getColorForDeprivation(decile);
const getColorForEducation = (decile) => getColorForDeprivation(decile);
const getColorForEmployment = (decile) => getColorForDeprivation(decile);
const getColorForHealth = (decile) => getColorForDeprivation(decile);
const getColorForCrime = (decile) => getColorForDeprivation(decile);
const getColorForHousing = (decile) => getColorForDeprivation(decile);
const getColorForEnvironment = (decile) => getColorForDeprivation(decile);

// Helper: Get color for average age
const getColorForAge = (age) => {
  if (!age) return 'rgba(200, 200, 200, 0.3)'; // No data
  if (age < 35) return '#dbeafe'; // Very young - light blue
  if (age < 40) return '#93c5fd'; // Young - blue
  if (age < 45) return '#60a5fa'; // Middle-aged - medium blue
  if (age < 50) return '#3b82f6'; // Mature - darker blue
  return '#2563eb'; // Older - dark blue
};

// Helper: Get color for population density (people per sq km)
// Calculated as population / area
const getColorForPopulationDensity = (density) => {
  if (!density) return 'rgba(200, 200, 200, 0.3)'; // No data
  if (density < 1000) return '#f0fdf4'; // Very sparse - light green
  if (density < 3000) return '#bbf7d0'; // Sparse - green
  if (density < 5000) return '#86efac'; // Medium - medium green
  if (density < 8000) return '#4ade80'; // Dense - darker green
  return '#22c55e'; // Very dense - dark green
};

// Helper: Get color for ethnicity percentage (0-100%)
const getColorForEthnicity = (percent) => {
  if (!percent && percent !== 0) return 'rgba(200, 200, 200, 0.3)'; // No data
  if (percent < 10) return '#fef3c7'; // Very low - pale yellow
  if (percent < 25) return '#fde047'; // Low - yellow
  if (percent < 50) return '#facc15'; // Medium - gold
  if (percent < 75) return '#eab308'; // High - darker gold
  return '#ca8a04'; // Very high - dark gold
};

// Helper: Get color for generic percentage (0-100%) - blue scale
const getColorForPercentage = (percent) => {
  if (!percent && percent !== 0) return 'rgba(200, 200, 200, 0.3)'; // No data
  if (percent < 10) return '#dbeafe'; // Very low - pale blue
  if (percent < 25) return '#93c5fd'; // Low - light blue
  if (percent < 50) return '#60a5fa'; // Medium - blue
  if (percent < 75) return '#3b82f6'; // High - darker blue
  return '#2563eb'; // Very high - dark blue
};

// Helper: Get color for correlation results
const getColorForCorrelation = (result) => {
  if (result === 'supports') return 'rgba(34, 197, 94, 0.7)'; // Green - supports correlation
  if (result === 'contradicts') return 'rgba(239, 68, 68, 0.7)'; // Red - contradicts correlation
  return 'rgba(156, 163, 175, 0.5)'; // Grey - no data/unclear
};

const MapDashboard = ({ activeLayers, visibleEvents, constituencyData, correlationResults, onCloseCorrelation, activeFilters }) => {
  const mapRef = useRef();
  const [hoveredWardId, setHoveredWardId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  // Drawing mode state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);

  // Initialize viewport based on constituency data
  const [viewState, setViewState] = useState({
    longitude: constituencyData?.constituency?.center?.[1] || 0,
    latitude: constituencyData?.constituency?.center?.[0] || 0,
    zoom: constituencyData?.constituency?.zoom || 11
  });

  // Update viewport when constituency changes
  useEffect(() => {
    if (constituencyData?.constituency?.center) {
      setViewState({
        longitude: constituencyData.constituency.center[1],
        latitude: constituencyData.constituency.center[0],
        zoom: constituencyData.constituency.zoom || 11
      });
    }
  }, [constituencyData]);

  // Convert constituency boundary to GeoJSON
  const constituencyGeoJSON = useMemo(() => {
    if (!constituencyData?.constituency) return null;

    const constituency = constituencyData.constituency;

    // Check if we have multiPolygon boundary (real data) or simple boundary (mock data)
    if (constituency.multiPolygonBoundary) {
      // Real boundary data - already in correct [lat, lng] format
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: constituency.id,
          properties: {
            name: constituency.name
          },
          geometry: {
            type: 'MultiPolygon',
            // Convert [lat, lng] to [lng, lat] for GeoJSON
            coordinates: constituency.multiPolygonBoundary.map(polygon =>
              polygon.map(ring =>
                ring.map(coord => [coord[1], coord[0]])
              )
            )
          }
        }]
      };
    } else if (constituency.boundary) {
      // Fallback to simple boundary (mock data)
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: constituency.id,
          properties: {
            name: constituency.name
          },
          geometry: {
            type: 'Polygon',
            coordinates: [convertBoundaryToGeoJSON(constituency.boundary)]
          }
        }]
      };
    }

    return null;
  }, [constituencyData]);

  // Convert wards to GeoJSON with demographic data
  const wardsGeoJSON = useMemo(() => {
    if (!constituencyData?.wards) {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    const activeDemographic = [
      'imd', 'income', 'education', 'employment', 'health', 'crime', 'housing', 'environment',
      'age', 'populationDensity',
      'ethnicityAsian', 'ethnicityBlack', 'ethnicityMixed', 'ethnicityWhite',
      'economicEmployed', 'economicSelfEmployed', 'economicUnemployed', 'economicRetired', 'economicStudent',
      'ukBorn', 'euBorn', 'nonEuBorn',
      'religionChristian', 'religionMuslim', 'religionHindu', 'religionSikh', 'religionJewish', 'religionNone',
      'housingOwnedOutright', 'housingOwnedMortgage', 'housingSocialRented', 'housingPrivateRented',
      'qualificationsNone', 'qualificationsLevel1to3', 'qualificationsLevel4Plus', 'qualificationsApprenticeship',
      'prediction2025'
    ].find(
      layer => activeLayers?.[layer]
    );

    const features = [];
    let invalidCount = 0;

    // Helper: Calculate approximate area of a polygon in square kilometers
    const calculateArea = (boundary) => {
      // Simplified area calculation using shoelace formula
      // Note: This is an approximation that works reasonably well for small areas
      let area = 0;
      for (let i = 0; i < boundary.length - 1; i++) {
        const [lat1, lng1] = boundary[i];
        const [lat2, lng2] = boundary[i + 1];
        area += (lng2 - lng1) * (lat2 + lat1) / 2;
      }
      // Convert to approximate square kilometers (rough approximation)
      // At ~50° latitude, 1 degree ≈ 111km (latitude) and ~71km (longitude)
      return Math.abs(area) * 111 * 71;
    };

    // Apply filters to wards
    const filteredWards = applyFiltersToWards(constituencyData.wards, activeFilters || []);

    filteredWards.forEach((ward, index) => {
      try {
        // Validate ward boundary exists and has enough points
        if (!ward.boundary || !Array.isArray(ward.boundary) || ward.boundary.length < 3) {
          console.warn(`Ward ${ward.name} has invalid boundary (too few points)`);
          invalidCount++;
          return;
        }

        let fillColor = 'rgba(200, 200, 200, 0.3)'; // Default light grey

        if (activeDemographic) {
          switch (activeDemographic) {
            case 'imd':
              fillColor = getColorForIMD(ward.demographics.imdDecile);
              break;
            case 'income':
              fillColor = getColorForIncome(ward.demographics.incomeDecile);
              break;
            case 'education':
              fillColor = getColorForEducation(ward.demographics.educationDecile);
              break;
            case 'employment':
              fillColor = getColorForEmployment(ward.demographics.employmentDecile);
              break;
            case 'health':
              fillColor = getColorForHealth(ward.demographics.healthDecile);
              break;
            case 'crime':
              fillColor = getColorForCrime(ward.demographics.crimeDecile);
              break;
            case 'housing':
              fillColor = getColorForHousing(ward.demographics.housingDecile);
              break;
            case 'environment':
              fillColor = getColorForEnvironment(ward.demographics.environmentDecile);
              break;
            case 'age':
              fillColor = getColorForAge(ward.demographics.averageAge);
              break;
            case 'populationDensity':
              const area = calculateArea(ward.boundary);
              const density = area > 0 ? Math.round(ward.demographics.population / area) : 0;
              fillColor = getColorForPopulationDensity(density);
              break;
            case 'ethnicityAsian':
              fillColor = getColorForEthnicity(ward.demographics.asianPercent);
              break;
            case 'ethnicityBlack':
              fillColor = getColorForEthnicity(ward.demographics.blackPercent);
              break;
            case 'ethnicityMixed':
              fillColor = getColorForEthnicity(ward.demographics.mixedPercent);
              break;
            case 'ethnicityWhite':
              fillColor = getColorForEthnicity(ward.demographics.whitePercent);
              break;
            // Economic Activity
            case 'economicEmployed':
              fillColor = getColorForPercentage(ward.demographics.employedPercent);
              break;
            case 'economicSelfEmployed':
              fillColor = getColorForPercentage(ward.demographics.selfEmployedPercent);
              break;
            case 'economicUnemployed':
              fillColor = getColorForPercentage(ward.demographics.unemployedPercent);
              break;
            case 'economicRetired':
              fillColor = getColorForPercentage(ward.demographics.retiredPercent);
              break;
            case 'economicStudent':
              fillColor = getColorForPercentage(ward.demographics.studentPercent);
              break;
            // Country of Birth
            case 'ukBorn':
              fillColor = getColorForPercentage(ward.demographics.ukBornPercent);
              break;
            case 'euBorn':
              fillColor = getColorForPercentage(ward.demographics.euBornPercent);
              break;
            case 'nonEuBorn':
              fillColor = getColorForPercentage(ward.demographics.nonEuBornPercent);
              break;
            // Religion
            case 'religionChristian':
              fillColor = getColorForPercentage(ward.demographics.christianPercent);
              break;
            case 'religionMuslim':
              fillColor = getColorForPercentage(ward.demographics.muslimPercent);
              break;
            case 'religionHindu':
              fillColor = getColorForPercentage(ward.demographics.hinduPercent);
              break;
            case 'religionSikh':
              fillColor = getColorForPercentage(ward.demographics.sikhPercent);
              break;
            case 'religionJewish':
              fillColor = getColorForPercentage(ward.demographics.jewishPercent);
              break;
            case 'religionNone':
              fillColor = getColorForPercentage(ward.demographics.noReligionPercent);
              break;
            // Housing Tenure
            case 'housingOwnedOutright':
              fillColor = getColorForPercentage(ward.demographics.ownedOutrightPercent);
              break;
            case 'housingOwnedMortgage':
              fillColor = getColorForPercentage(ward.demographics.ownedMortgagePercent);
              break;
            case 'housingSocialRented':
              fillColor = getColorForPercentage(ward.demographics.socialRentedPercent);
              break;
            case 'housingPrivateRented':
              fillColor = getColorForPercentage(ward.demographics.privateRentedPercent);
              break;
            // Qualifications
            case 'qualificationsNone':
              fillColor = getColorForPercentage(ward.demographics.noQualificationsPercent);
              break;
            case 'qualificationsLevel1to3':
              fillColor = getColorForPercentage(ward.demographics.level1to3Percent);
              break;
            case 'qualificationsLevel4Plus':
              fillColor = getColorForPercentage(ward.demographics.level4PlusPercent);
              break;
            case 'qualificationsApprenticeship':
              fillColor = getColorForPercentage(ward.demographics.apprenticeshipPercent);
              break;
            // Political Predictions
            case 'prediction2025':
              if (ward.demographics.predicted2025 && ward.demographics.predicted2025.winner) {
                fillColor = getPartyColor(ward.demographics.predicted2025.winner);
              } else {
                fillColor = 'rgba(200, 200, 200, 0.3)';
              }
              break;
          }
        }

        // Check if ward has MultiPolygon boundary (includes islands/exclaves)
        let geometry;
        if (ward.multiPolygonBoundary) {
          // MultiPolygon: Render all polygons (main area + islands)
          const multiPolygonCoords = ward.multiPolygonBoundary.map(polygon =>
            polygon.map(ring => {
              const coords = convertBoundaryToGeoJSON(ring);
              // Ensure each ring is closed
              const first = coords[0];
              const last = coords[coords.length - 1];
              if (first[0] !== last[0] || first[1] !== last[1]) {
                coords.push([...first]);
              }
              return coords;
            })
          );

          geometry = {
            type: 'MultiPolygon',
            coordinates: multiPolygonCoords
          };
        } else {
          // Simple Polygon
          const coordinates = convertBoundaryToGeoJSON(ward.boundary);

          // Ensure polygon is closed (first point equals last point)
          const first = coordinates[0];
          const last = coordinates[coordinates.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push([...first]); // Close the polygon
          }

          geometry = {
            type: 'Polygon',
            coordinates: [coordinates]
          };
        }

        features.push({
          type: 'Feature',
          id: index + 1,
          properties: {
            id: ward.id,
            name: ward.name,
            population: ward.demographics.population,
            averageAge: ward.demographics.averageAge,
            lsoaCount: ward.demographics.lsoaCount,
            // IMD - Index of Multiple Deprivation
            imdRank: ward.demographics.imdRank,
            imdDecile: ward.demographics.imdDecile,
            // Income deprivation
            incomeRank: ward.demographics.incomeRank,
            incomeDecile: ward.demographics.incomeDecile,
            // Employment deprivation
            employmentRank: ward.demographics.employmentRank,
            employmentDecile: ward.demographics.employmentDecile,
            // Education deprivation
            educationRank: ward.demographics.educationRank,
            educationDecile: ward.demographics.educationDecile,
            // Health deprivation
            healthRank: ward.demographics.healthRank,
            healthDecile: ward.demographics.healthDecile,
            // Crime
            crimeRank: ward.demographics.crimeRank,
            crimeDecile: ward.demographics.crimeDecile,
            // Housing barriers
            housingRank: ward.demographics.housingRank,
            housingDecile: ward.demographics.housingDecile,
            // Environment
            environmentRank: ward.demographics.environmentRank,
            environmentDecile: ward.demographics.environmentDecile,
            // Ethnicity
            asianPercent: ward.demographics.asianPercent,
            blackPercent: ward.demographics.blackPercent,
            mixedPercent: ward.demographics.mixedPercent,
            whitePercent: ward.demographics.whitePercent,
            otherPercent: ward.demographics.otherPercent,
            // Census 2021 - Economic Activity
            employedPercent: ward.demographics.employedPercent,
            selfEmployedPercent: ward.demographics.selfEmployedPercent,
            unemployedPercent: ward.demographics.unemployedPercent,
            studentPercent: ward.demographics.studentPercent,
            retiredPercent: ward.demographics.retiredPercent,
            // Census 2021 - Country of Birth
            ukBornPercent: ward.demographics.ukBornPercent,
            euBornPercent: ward.demographics.euBornPercent,
            nonEuBornPercent: ward.demographics.nonEuBornPercent,
            // Census 2021 - Religion
            christianPercent: ward.demographics.christianPercent,
            muslimPercent: ward.demographics.muslimPercent,
            hinduPercent: ward.demographics.hinduPercent,
            sikhPercent: ward.demographics.sikhPercent,
            jewishPercent: ward.demographics.jewishPercent,
            noReligionPercent: ward.demographics.noReligionPercent,
            // Census 2021 - Housing Tenure
            ownedOutrightPercent: ward.demographics.ownedOutrightPercent,
            ownedMortgagePercent: ward.demographics.ownedMortgagePercent,
            socialRentedPercent: ward.demographics.socialRentedPercent,
            privateRentedPercent: ward.demographics.privateRentedPercent,
            // Census 2021 - Qualifications
            noQualificationsPercent: ward.demographics.noQualificationsPercent,
            level1to3Percent: ward.demographics.level1to3Percent,
            level4PlusPercent: ward.demographics.level4PlusPercent,
            apprenticeshipPercent: ward.demographics.apprenticeshipPercent,
            // Political Predictions
            predicted2025: ward.demographics.predicted2025,
            fillColor: fillColor
          },
          geometry: geometry
        });
      } catch (error) {
        console.error(`Failed to create geometry for ward ${ward.name}:`, error);
        invalidCount++;
      }
    });

    if (invalidCount > 0) {
      console.warn(`${invalidCount} wards had invalid geometries and were skipped`);
    }

    return {
      type: 'FeatureCollection',
      features: features
    };
  }, [constituencyData, activeLayers, activeFilters]);

  // Create GeoJSON for correlation results (all England wards)
  const correlationWardsGeoJSON = useMemo(() => {
    if (!correlationResults || !correlationResults.wards) {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    const features = correlationResults.wards.map((ward, index) => {
      const fillColor = getColorForCorrelation(ward.correlationResult);

      return {
        type: 'Feature',
        id: ward.id || index,
        properties: {
          ...ward.properties,
          fillColor: fillColor,
          correlationResult: ward.correlationResult,
        },
        geometry: ward.geometry
      };
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }, [correlationResults]);

  // Update view state when switching to/from correlation mode
  useEffect(() => {
    if (correlationResults) {
      // Zoom out to show all of England
      setViewState({
        longitude: -1.5, // Center of England
        latitude: 52.8,
        zoom: 6
      });
    } else if (constituencyData?.constituency?.center) {
      // Return to constituency view
      setViewState({
        longitude: constituencyData.constituency.center[1],
        latitude: constituencyData.constituency.center[0],
        zoom: constituencyData.constituency.zoom || 11
      });
    }
  }, [correlationResults, constituencyData]);

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

  // Create GeoJSON for drawn polygon
  const drawnPolygonGeoJSON = useMemo(() => {
    if (!drawnPolygon || drawnPolygon.length < 4) {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [drawnPolygon]
        }
      }]
    };
  }, [drawnPolygon]);

  // Mouse move handler for ward hover effect
  const onMouseMove = useCallback((event) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Check if wards-fill layer exists before querying
    if (!map.getLayer('wards-fill')) return;

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

  // Drawing mode handlers
  const handleStartDrawing = useCallback(() => {
    setIsDrawing(true);
    setDrawnPoints([]);
    setDrawnPolygon(null);
    setSelectedWard(null);
    setSelectedEvent(null);
  }, []);

  const handleCancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawnPoints([]);
    setDrawnPolygon(null);
  }, []);

  const handleFinishDrawing = useCallback(() => {
    if (drawnPoints.length < 3) {
      alert('Please add at least 3 points to create a region');
      return;
    }

    // Close the polygon by adding the first point at the end
    const closedPolygon = [...drawnPoints, drawnPoints[0]];
    setDrawnPolygon(closedPolygon);
    setIsDrawing(false);
    setIsRegionSelectorOpen(true);
  }, [drawnPoints]);

  const handleCloseRegionSelector = useCallback(() => {
    setIsRegionSelectorOpen(false);
    setDrawnPoints([]);
    setDrawnPolygon(null);
  }, []);

  // Click handler for wards and events
  const onClick = useCallback((event) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Handle drawing mode clicks
    if (isDrawing) {
      const { lng, lat } = event.lngLat;
      setDrawnPoints(prev => [...prev, [lng, lat]]);
      return;
    }

    // Check for event click first (higher priority)
    const eventFeatures = map.queryRenderedFeatures(event.point, {
      layers: ['events-circle']
    });

    if (eventFeatures.length > 0) {
      const eventProps = eventFeatures[0].properties;
      const coords = eventFeatures[0].geometry.coordinates;

      setSelectedEvent({
        title: eventProps.title,
        category: eventProps.category,
        date: eventProps.date,
        summary: eventProps.summary,
        coordinates: coords
      });
      return;
    }

    // Check for ward click
    const wardFeatures = map.queryRenderedFeatures(event.point, {
      layers: ['wards-fill']
    });

    if (wardFeatures.length > 0) {
      const props = wardFeatures[0].properties;
      const coords = wardFeatures[0].geometry.coordinates;

      // Determine coordinates for popup (center of polygon)
      let popupCoords;
      if (wardFeatures[0].geometry.type === 'Polygon') {
        // Calculate centroid of polygon
        const ring = coords[0];
        const lngs = ring.map(c => c[0]);
        const lats = ring.map(c => c[1]);
        popupCoords = [
          lngs.reduce((a, b) => a + b, 0) / lngs.length,
          lats.reduce((a, b) => a + b, 0) / lats.length
        ];
      } else if (wardFeatures[0].geometry.type === 'MultiPolygon') {
        // Use first polygon's centroid
        const ring = coords[0][0];
        const lngs = ring.map(c => c[0]);
        const lats = ring.map(c => c[1]);
        popupCoords = [
          lngs.reduce((a, b) => a + b, 0) / lngs.length,
          lats.reduce((a, b) => a + b, 0) / lats.length
        ];
      }

      setSelectedWard({
        name: props.name,
        coordinates: popupCoords,
        population: props.population,
        averageAge: props.averageAge,
        lsoaCount: props.lsoaCount,
        imdRank: props.imdRank,
        imdDecile: props.imdDecile,
        incomeRank: props.incomeRank,
        incomeDecile: props.incomeDecile,
        educationRank: props.educationRank,
        educationDecile: props.educationDecile,
        employmentRank: props.employmentRank,
        employmentDecile: props.employmentDecile,
        healthRank: props.healthRank,
        healthDecile: props.healthDecile,
        crimeRank: props.crimeRank,
        crimeDecile: props.crimeDecile,
        housingRank: props.housingRank,
        housingDecile: props.housingDecile,
        environmentRank: props.environmentRank,
        environmentDecile: props.environmentDecile,
        asianPercent: props.asianPercent,
        blackPercent: props.blackPercent,
        mixedPercent: props.mixedPercent,
        whitePercent: props.whitePercent,
        otherPercent: props.otherPercent,
        // Census 2021 - Economic Activity
        employedPercent: props.employedPercent,
        selfEmployedPercent: props.selfEmployedPercent,
        unemployedPercent: props.unemployedPercent,
        studentPercent: props.studentPercent,
        retiredPercent: props.retiredPercent,
        // Census 2021 - Country of Birth
        ukBornPercent: props.ukBornPercent,
        euBornPercent: props.euBornPercent,
        nonEuBornPercent: props.nonEuBornPercent,
        // Census 2021 - Religion
        christianPercent: props.christianPercent,
        muslimPercent: props.muslimPercent,
        hinduPercent: props.hinduPercent,
        sikhPercent: props.sikhPercent,
        jewishPercent: props.jewishPercent,
        noReligionPercent: props.noReligionPercent,
        // Census 2021 - Housing Tenure
        ownedOutrightPercent: props.ownedOutrightPercent,
        ownedMortgagePercent: props.ownedMortgagePercent,
        socialRentedPercent: props.socialRentedPercent,
        privateRentedPercent: props.privateRentedPercent,
        // Census 2021 - Qualifications
        noQualificationsPercent: props.noQualificationsPercent,
        level1to3Percent: props.level1to3Percent,
        level4PlusPercent: props.level4PlusPercent,
        apprenticeshipPercent: props.apprenticeshipPercent,
        // Political Predictions
        predicted2025: props.predicted2025
      });
    }
  }, [isDrawing]);

  // Determine which demographic layer is active for legend/info
  const activeDemographic = [
    'imd', 'income', 'education', 'employment', 'health', 'crime', 'housing', 'environment',
    'age', 'populationDensity',
    'ethnicityAsian', 'ethnicityBlack', 'ethnicityMixed', 'ethnicityWhite',
    'economicEmployed', 'economicSelfEmployed', 'economicUnemployed', 'economicRetired', 'economicStudent',
    'ukBorn', 'euBorn', 'nonEuBorn',
    'religionChristian', 'religionMuslim', 'religionHindu', 'religionSikh', 'religionJewish', 'religionNone',
    'housingOwnedOutright', 'housingOwnedMortgage', 'housingSocialRented', 'housingPrivateRented',
    'qualificationsNone', 'qualificationsLevel1to3', 'qualificationsLevel4Plus', 'qualificationsApprenticeship',
    'prediction2025'
  ].find(
    layer => activeLayers?.[layer]
  );

  // Don't render until we have constituency data
  if (!constituencyData || !constituencyGeoJSON) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p>Loading map data...</p>
        </div>
      </div>
    );
  }

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

        {/* Ward Boundaries with Demographics (normal mode) */}
        {!correlationResults && wardsGeoJSON.features.length > 0 && (
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
        )}

        {/* Correlation Wards (all England - correlation mode) */}
        {correlationResults && correlationWardsGeoJSON.features.length > 0 && (
          <Source
            id="correlation-wards"
            type="geojson"
            data={correlationWardsGeoJSON}
          >
            {/* Fill layer with correlation colors */}
            <Layer
              id="correlation-wards-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': 0.7
              }}
            />

            {/* Ward borders */}
            <Layer
              id="correlation-wards-line"
              type="line"
              paint={{
                'line-color': '#333333',
                'line-width': 0.5
              }}
            />
          </Source>
        )}

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

        {/* Event Popup */}
        {selectedEvent && (
          <Popup
            longitude={selectedEvent.coordinates[0]}
            latitude={selectedEvent.coordinates[1]}
            anchor="bottom"
            onClose={() => setSelectedEvent(null)}
            closeButton={true}
            closeOnClick={false}
            style={{ maxWidth: '300px' }}
          >
            <div style={{ padding: '8px' }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {selectedEvent.title}
              </h3>
              <div style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#f3f4f6',
                fontSize: '12px',
                fontWeight: '500',
                color: '#4b5563',
                marginBottom: '8px',
                textTransform: 'capitalize'
              }}>
                {selectedEvent.category}
              </div>
              {selectedEvent.date && (
                <p style={{
                  margin: '4px 0',
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  📅 {new Date(selectedEvent.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
              {selectedEvent.summary && (
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#374151'
                }}>
                  {selectedEvent.summary}
                </p>
              )}
            </div>
          </Popup>
        )}

        {/* Ward Popup */}
        {selectedWard && selectedWard.coordinates && (
          <Popup
            longitude={selectedWard.coordinates[0]}
            latitude={selectedWard.coordinates[1]}
            anchor="bottom"
            onClose={() => setSelectedWard(null)}
            closeButton={true}
            closeOnClick={false}
            style={{ maxWidth: '320px' }}
          >
            <div style={{ padding: '8px' }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {selectedWard.name}
              </h3>

              {activeDemographic && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      {LAYER_METADATA[activeDemographic]?.label || activeDemographic}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>
                      {formatPopupValue(activeDemographic, selectedWard)}
                    </div>
                    {shouldShowDeprivationNote(activeDemographic) && (
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        (1 = most deprived, 10 = least deprived)
                      </div>
                    )}

                    {/* Show detailed prediction breakdown */}
                    {activeDemographic === 'prediction2025' && selectedWard.predicted2025 && (
                      <div style={{ marginTop: '8px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {Object.entries(selectedWard.predicted2025)
                            .filter(([key]) => !['winner', 'confidence', 'keyFactors'].includes(key))
                            .sort(([, a], [, b]) => b - a)
                            .map(([party, vote]) => (
                              <div key={party} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '2px',
                                    backgroundColor: getPartyColor(party),
                                    display: 'inline-block'
                                  }}></span>
                                  {getPartyDisplayName(party)}
                                </span>
                                <span style={{ fontWeight: '600' }}>{vote}%</span>
                              </div>
                            ))
                          }
                        </div>
                        {selectedWard.predicted2025.keyFactors && selectedWard.predicted2025.keyFactors.length > 0 && (
                          <div style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid #e5e7eb',
                            fontSize: '11px',
                            color: '#6b7280'
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Key factors:</div>
                            {selectedWard.predicted2025.keyFactors.map((factor, i) => (
                              <div key={i}>• {factor}</div>
                            ))}
                          </div>
                        )}
                        {selectedWard.predicted2025.similarWards && selectedWard.predicted2025.similarWards.length > 0 && (
                          <div style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid #e5e7eb',
                            fontSize: '11px',
                            color: '#6b7280'
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Based on similar wards:</div>
                            {selectedWard.predicted2025.similarWards.map((sw, i) => (
                              <div key={i}>• {sw.name} ({sw.constituency}) - {sw.similarity}% similar</div>
                            ))}
                          </div>
                        )}
                        <div style={{
                          marginTop: '6px',
                          fontSize: '10px',
                          color: '#9ca3af',
                          fontStyle: 'italic'
                        }}>
                          Confidence: {selectedWard.predicted2025.confidence}%
                          {selectedWard.predicted2025.dataSource === 'actual' && ' (Actual 2024 data)'}
                          {selectedWard.predicted2025.dataSource === 'similar' && ' (Similar wards)'}
                          {selectedWard.predicted2025.dataSource === 'constituency_avg' && ' (Constituency average)'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                <div>Population: ~{selectedWard.population?.toLocaleString() || 'N/A'}</div>
                <div>LSOAs: {selectedWard.lsoaCount || 'N/A'}</div>
              </div>
            </div>
          </Popup>
        )}

        {/* Drawn Polygon */}
        {drawnPolygonGeoJSON.features.length > 0 && (
          <Source
            id="drawn-polygon"
            type="geojson"
            data={drawnPolygonGeoJSON}
          >
            <Layer
              id="drawn-polygon-fill"
              type="fill"
              paint={{
                'fill-color': '#8b5cf6',
                'fill-opacity': 0.2
              }}
            />
            <Layer
              id="drawn-polygon-outline"
              type="line"
              paint={{
                'line-color': '#8b5cf6',
                'line-width': 3,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>
        )}

        {/* Drawing Points */}
        {drawnPoints.map((point, index) => (
          <Marker
            key={index}
            longitude={point[0]}
            latitude={point[1]}
          >
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#8b5cf6',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }} />
          </Marker>
        ))}
      </Map>

      {/* Correlation Results Overlay */}
      {correlationResults && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.98)',
          padding: '20px 30px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          minWidth: '700px',
          maxWidth: '900px',
          textAlign: 'center',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <div style={{ fontWeight: 700, fontSize: '18px', color: '#1f2937', marginBottom: '8px' }}>
            Spearman's Correlation Analysis
          </div>

          {/* Spearman's Rho Display */}
          <div style={{
            fontSize: '36px',
            fontWeight: 700,
            color: correlationResults.statistics.spearmanRho >= 0 ? '#2563eb' : '#dc2626',
            marginBottom: '8px'
          }}>
            ρ = {correlationResults.statistics.spearmanRho.toFixed(3)}
          </div>
          <div style={{ color: '#6b7280', marginBottom: '16px', fontSize: '12px' }}>
            {correlationResults.metric1} vs {correlationResults.metric2}
            <br/>
            {correlationResults.statistics.correlationStrength < 0.3 ? 'Weak' :
             correlationResults.statistics.correlationStrength < 0.7 ? 'Moderate' : 'Strong'}
            {' '}
            {correlationResults.statistics.correlationDirection} correlation
            {!correlationResults.statistics.correlationMatches &&
              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                {' '}(Expected {correlationResults.correlationType})
              </span>
            }
          </div>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>
                {correlationResults.statistics.supports.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Supports</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                {correlationResults.statistics.contradicts.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Contradicts</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#9ca3af' }}>
                {correlationResults.statistics.noData.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>No Data</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>
            {correlationResults.statistics.supports} wards ({correlationResults.statistics.supportsPercent}%) fall in the expected quadrants for a {correlationResults.statistics.correlationDirection} correlation,
            while {correlationResults.statistics.contradicts} wards ({correlationResults.statistics.contradictsPercent}%) do not.
          </div>

          <button
            onClick={onCloseCorrelation}
            style={{
              padding: '8px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              marginTop: '16px'
            }}
          >
            Return to Constituency
          </button>
        </div>
      )}

      {/* Legend overlay */}
      {!correlationResults && activeDemographic && (
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
            {LAYER_METADATA[activeDemographic]?.label || activeDemographic}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {LAYER_METADATA[activeDemographic]?.type === 'age' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#dbeafe', border: '1px solid #ccc' }}></div>
                  <span>&lt; 35 years</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#93c5fd', border: '1px solid #ccc' }}></div>
                  <span>35-40 years</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#60a5fa', border: '1px solid #ccc' }}></div>
                  <span>40-45 years</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#3b82f6', border: '1px solid #ccc' }}></div>
                  <span>45-50 years</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#2563eb', border: '1px solid #ccc' }}></div>
                  <span>50+ years</span>
                </div>
              </>
            ) : LAYER_METADATA[activeDemographic]?.type === 'density' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#f0fdf4', border: '1px solid #ccc' }}></div>
                  <span>&lt; 1k per km²</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#bbf7d0', border: '1px solid #ccc' }}></div>
                  <span>1k-3k per km²</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#86efac', border: '1px solid #ccc' }}></div>
                  <span>3k-5k per km²</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#4ade80', border: '1px solid #ccc' }}></div>
                  <span>5k-8k per km²</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#22c55e', border: '1px solid #ccc' }}></div>
                  <span>8k+ per km²</span>
                </div>
              </>
            ) : LAYER_METADATA[activeDemographic]?.type === 'ethnicity' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#fef3c7', border: '1px solid #ccc' }}></div>
                  <span>&lt; 10%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#fde047', border: '1px solid #ccc' }}></div>
                  <span>10-25%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#facc15', border: '1px solid #ccc' }}></div>
                  <span>25-50%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#eab308', border: '1px solid #ccc' }}></div>
                  <span>50-75%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#ca8a04', border: '1px solid #ccc' }}></div>
                  <span>75-100%</span>
                </div>
              </>
            ) : LAYER_METADATA[activeDemographic]?.type === 'percentage' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#dbeafe', border: '1px solid #ccc' }}></div>
                  <span>&lt; 10%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#93c5fd', border: '1px solid #ccc' }}></div>
                  <span>10-25%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#60a5fa', border: '1px solid #ccc' }}></div>
                  <span>25-50%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#3b82f6', border: '1px solid #ccc' }}></div>
                  <span>50-75%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#2563eb', border: '1px solid #ccc' }}></div>
                  <span>75-100%</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#dc2626', border: '1px solid #ccc' }}></div>
                  <span>Decile 1-2 (Most deprived)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#f97316', border: '1px solid #ccc' }}></div>
                  <span>Decile 3-4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#fbbf24', border: '1px solid #ccc' }}></div>
                  <span>Decile 5-6</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#84cc16', border: '1px solid #ccc' }}></div>
                  <span>Decile 7-8</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '12px', background: '#22c55e', border: '1px solid #ccc' }}></div>
                  <span>Decile 9-10 (Least deprived)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div style={{ width: '20px', height: '12px', background: 'rgba(200, 200, 200, 0.3)', border: '1px solid #ccc' }}></div>
                  <span>No data</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Drawing Controls */}
      {!correlationResults && (
        <DrawingControls
          isDrawing={isDrawing}
          onStartDrawing={handleStartDrawing}
          onCancelDrawing={handleCancelDrawing}
          onFinishDrawing={handleFinishDrawing}
          pointCount={drawnPoints.length}
        />
      )}

      {/* Region Selector Modal */}
      <RegionSelector
        isOpen={isRegionSelectorOpen}
        onClose={handleCloseRegionSelector}
        polygon={drawnPolygon}
        wardsData={constituencyData}
      />
    </div>
  );
};

export default MapDashboard;
