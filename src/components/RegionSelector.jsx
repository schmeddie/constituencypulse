import { useState, useEffect } from 'react';
import * as turf from '@turf/turf';

/**
 * Region Selector Results Modal
 * Displays statistics for wards within a custom-drawn polygon
 */
const RegionSelector = ({ isOpen, onClose, polygon, wardsData }) => {
  const [selectedWards, setSelectedWards] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [allEnglandWards, setAllEnglandWards] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadEnglandWards();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && polygon && allEnglandWards) {
      calculateRegionStatistics();
    }
  }, [isOpen, polygon, allEnglandWards]);

  const loadEnglandWards = async () => {
    try {
      const response = await fetch('/data/england-wards.json');
      if (!response.ok) {
        throw new Error('Failed to load England wards');
      }
      const data = await response.json();
      setAllEnglandWards(data);
    } catch (error) {
      console.error('Error loading England wards:', error);
      alert('Failed to load ward data for region analysis');
    }
  };

  const calculateRegionStatistics = () => {
    if (!allEnglandWards || !allEnglandWards.features) {
      return;
    }

    // Convert polygon to Turf polygon
    const turfPolygon = turf.polygon([polygon]);

    // Find wards whose centers are within the polygon
    const wardsInRegion = allEnglandWards.features.filter(wardFeature => {
      if (!wardFeature.geometry) return false;

      // Calculate centroid of the ward geometry using Turf
      const centroid = turf.centroid(wardFeature);

      // Check if centroid is within drawn polygon
      return turf.booleanPointInPolygon(centroid, turfPolygon);
    });

    setSelectedWards(wardsInRegion);

    if (wardsInRegion.length === 0) {
      setStatistics(null);
      return;
    }

    // Calculate aggregate statistics
    let totalPopulation = 0;
    let totalArea = 0;
    let ageSum = 0;
    let ageCount = 0;

    // Decile sums
    let imdSum = 0, imdCount = 0;
    let incomeSum = 0, incomeCount = 0;
    let educationSum = 0, educationCount = 0;
    let employmentSum = 0, employmentCount = 0;
    let healthSum = 0, healthCount = 0;
    let crimeSum = 0, crimeCount = 0;
    let housingSum = 0, housingCount = 0;
    let environmentSum = 0, environmentCount = 0;

    wardsInRegion.forEach(wardFeature => {
      const demo = wardFeature.properties || {};

      if (demo.population) totalPopulation += demo.population;
      if (demo.averageAge) {
        ageSum += demo.averageAge;
        ageCount++;
      }

      // Collect decile data (invert for intuitive display)
      if (demo.imdDecile) { imdSum += (11 - demo.imdDecile); imdCount++; }
      if (demo.incomeDecile) { incomeSum += (11 - demo.incomeDecile); incomeCount++; }
      if (demo.educationDecile) { educationSum += (11 - demo.educationDecile); educationCount++; }
      if (demo.employmentDecile) { employmentSum += (11 - demo.employmentDecile); employmentCount++; }
      if (demo.healthDecile) { healthSum += (11 - demo.healthDecile); healthCount++; }
      if (demo.crimeDecile) { crimeSum += (11 - demo.crimeDecile); crimeCount++; }
      if (demo.housingDecile) { housingSum += (11 - demo.housingDecile); housingCount++; }
      if (demo.environmentDecile) { environmentSum += (11 - demo.environmentDecile); environmentCount++; }
    });

    setStatistics({
      wardCount: wardsInRegion.length,
      totalPopulation,
      averageAge: ageCount > 0 ? (ageSum / ageCount).toFixed(1) : 'N/A',
      avgIMD: imdCount > 0 ? (imdSum / imdCount).toFixed(1) : 'N/A',
      avgIncome: incomeCount > 0 ? (incomeSum / incomeCount).toFixed(1) : 'N/A',
      avgEducation: educationCount > 0 ? (educationSum / educationCount).toFixed(1) : 'N/A',
      avgEmployment: employmentCount > 0 ? (employmentSum / employmentCount).toFixed(1) : 'N/A',
      avgHealth: healthCount > 0 ? (healthSum / healthCount).toFixed(1) : 'N/A',
      avgCrime: crimeCount > 0 ? (crimeSum / crimeCount).toFixed(1) : 'N/A',
      avgHousing: housingCount > 0 ? (housingSum / housingCount).toFixed(1) : 'N/A',
      avgEnvironment: environmentCount > 0 ? (environmentSum / environmentCount).toFixed(1) : 'N/A',
    });
  };

  const calculateCenter = (boundary) => {
    let latSum = 0, lngSum = 0;
    boundary.forEach(([lat, lng]) => {
      latSum += lat;
      lngSum += lng;
    });
    return [latSum / boundary.length, lngSum / boundary.length];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-grey">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-dark-grey">Custom Region Analysis</h2>
            <button
              onClick={onClose}
              className="text-medium-grey hover:text-dark-grey text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-medium-grey mt-2">
            Statistics for {selectedWards.length} wards within the drawn region
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {statistics ? (
            <>
              {/* Overview Statistics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-light-grey rounded-lg">
                  <div className="text-sm text-medium-grey">Total Wards</div>
                  <div className="text-2xl font-bold text-dark-grey">{statistics.wardCount}</div>
                </div>
                <div className="p-4 bg-light-grey rounded-lg">
                  <div className="text-sm text-medium-grey">Total Population</div>
                  <div className="text-2xl font-bold text-dark-grey">{statistics.totalPopulation.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-light-grey rounded-lg">
                  <div className="text-sm text-medium-grey">Average Age</div>
                  <div className="text-2xl font-bold text-dark-grey">{statistics.averageAge}</div>
                </div>
                <div className="p-4 bg-light-grey rounded-lg">
                  <div className="text-sm text-medium-grey">Avg Population/Ward</div>
                  <div className="text-2xl font-bold text-dark-grey">
                    {Math.round(statistics.totalPopulation / statistics.wardCount).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Deprivation Indices */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-dark-grey mb-3">Average Deprivation Levels</h3>
                <p className="text-xs text-medium-grey mb-3">(Scale: 1 = least deprived, 10 = most deprived)</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatRow label="Overall Deprivation (IMD)" value={statistics.avgIMD} />
                  <StatRow label="Income Deprivation" value={statistics.avgIncome} />
                  <StatRow label="Education Deprivation" value={statistics.avgEducation} />
                  <StatRow label="Employment Deprivation" value={statistics.avgEmployment} />
                  <StatRow label="Health Deprivation" value={statistics.avgHealth} />
                  <StatRow label="Crime Levels" value={statistics.avgCrime} />
                  <StatRow label="Housing Barriers" value={statistics.avgHousing} />
                  <StatRow label="Living Environment" value={statistics.avgEnvironment} />
                </div>
              </div>

              {/* Wards List */}
              <div>
                <h3 className="text-lg font-semibold text-dark-grey mb-3">Wards in Region</h3>
                <div className="max-h-60 overflow-y-auto border border-border-grey rounded-lg">
                  <div className="divide-y divide-border-grey">
                    {selectedWards.map((wardFeature, index) => {
                      const ward = wardFeature.properties || {};
                      return (
                        <div key={ward.id || index} className="p-3 hover:bg-light-grey">
                          <div className="font-medium text-sm text-dark-grey">{ward.name || 'Unknown'}</div>
                          <div className="text-xs text-medium-grey">
                            Population: {ward.population?.toLocaleString() || 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-medium-grey">
              No wards found within the drawn region. Try drawing a larger area.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-grey">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 px-3 bg-light-grey rounded">
    <span className="text-sm text-dark-grey">{label}</span>
    <span className="text-sm font-semibold text-primary-blue">{value}</span>
  </div>
);

export default RegionSelector;
