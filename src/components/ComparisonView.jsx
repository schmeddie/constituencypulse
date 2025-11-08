import { useState, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';

/**
 * Comparison View Component
 * Displays split-screen view of multiple constituencies for comparison
 */
const ComparisonView = ({ constituencies, onClose }) => {
  const [constituenciesData, setConstituenciesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConstituenciesData();
  }, [constituencies]);

  const loadConstituenciesData = async () => {
    setLoading(true);
    try {
      const dataPromises = constituencies.map(async (constituency) => {
        const dataPath = `/src/data/constituencies/${constituency.filename}`;
        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`Failed to load ${constituency.name}`);
        }
        return await response.json();
      });

      const loadedData = await Promise.all(dataPromises);
      setConstituenciesData(loadedData);
    } catch (error) {
      console.error('Error loading constituency data:', error);
      alert('Failed to load one or more constituencies');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (constituencyData) => {
    if (!constituencyData || !constituencyData.wards) {
      return null;
    }

    let totalPopulation = 0;
    let ageSum = 0;
    let ageCount = 0;
    let imdSum = 0;
    let imdCount = 0;

    constituencyData.wards.forEach(ward => {
      const demo = ward.demographics || {};
      if (demo.population) totalPopulation += demo.population;
      if (demo.averageAge) {
        ageSum += demo.averageAge;
        ageCount++;
      }
      if (demo.imdDecile) {
        imdSum += (11 - demo.imdDecile); // Invert for intuitive display
        imdCount++;
      }
    });

    return {
      totalPopulation,
      wardCount: constituencyData.wards.length,
      averageAge: ageCount > 0 ? (ageSum / ageCount).toFixed(1) : 'N/A',
      avgIMD: imdCount > 0 ? (imdSum / imdCount).toFixed(1) : 'N/A',
    };
  };

  const convertBoundaryToGeoJSON = (boundary) => {
    return boundary.map(coord => [coord[1], coord[0]]);
  };

  const createConstituencyGeoJSON = (constituencyData) => {
    if (!constituencyData || !constituencyData.constituency) {
      return null;
    }

    const constituency = constituencyData.constituency;

    if (constituency.multiPolygonBoundary) {
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: constituency.id,
          properties: { name: constituency.name },
          geometry: {
            type: 'MultiPolygon',
            coordinates: constituency.multiPolygonBoundary.map(polygon =>
              polygon.map(ring => convertBoundaryToGeoJSON(ring))
            )
          }
        }]
      };
    } else if (constituency.boundary) {
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: constituency.id,
          properties: { name: constituency.name },
          geometry: {
            type: 'Polygon',
            coordinates: [convertBoundaryToGeoJSON(constituency.boundary)]
          }
        }]
      };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-dark-grey mb-2">Loading comparison...</div>
          <div className="text-sm text-medium-grey">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border-grey px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-grey">Constituency Comparison</h2>
          <p className="text-sm text-medium-grey mt-1">
            Comparing {constituencies.map(c => c.name).join(' vs ')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Exit Comparison
        </button>
      </div>

      {/* Split-Screen Content */}
      <div className={`flex-1 grid ${constituencies.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-0 divide-x divide-border-grey`}>
        {constituenciesData.map((data, index) => {
          const stats = calculateStats(data);
          const geoJSON = createConstituencyGeoJSON(data);

          return (
            <div key={index} className="flex flex-col bg-light-grey">
              {/* Statistics Panel */}
              <div className="p-4 bg-white border-b border-border-grey">
                <h3 className="font-bold text-lg text-dark-grey mb-3">
                  {data.constituency.name}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-light-grey rounded">
                    <div className="text-xs text-medium-grey">Total Wards</div>
                    <div className="text-lg font-bold text-dark-grey">
                      {stats?.wardCount || 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 bg-light-grey rounded">
                    <div className="text-xs text-medium-grey">Population</div>
                    <div className="text-lg font-bold text-dark-grey">
                      {stats?.totalPopulation?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 bg-light-grey rounded">
                    <div className="text-xs text-medium-grey">Avg Age</div>
                    <div className="text-lg font-bold text-dark-grey">
                      {stats?.averageAge}
                    </div>
                  </div>
                  <div className="p-2 bg-light-grey rounded">
                    <div className="text-xs text-medium-grey">Avg IMD</div>
                    <div className="text-lg font-bold text-dark-grey">
                      {stats?.avgIMD}
                    </div>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 relative">
                {geoJSON && (
                  <Map
                    initialViewState={{
                      longitude: data.constituency.center[1],
                      latitude: data.constituency.center[0],
                      zoom: data.constituency.zoom || 11
                    }}
                    mapStyle="mapbox://styles/mapbox/light-v10"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <Source
                      id="constituency"
                      type="geojson"
                      data={geoJSON}
                    >
                      <Layer
                        id="constituency-fill"
                        type="fill"
                        paint={{
                          'fill-color': '#3b82f6',
                          'fill-opacity': 0.2
                        }}
                      />
                      <Layer
                        id="constituency-line"
                        type="line"
                        paint={{
                          'line-color': '#1f2937',
                          'line-width': 2
                        }}
                      />
                    </Source>
                  </Map>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonView;
