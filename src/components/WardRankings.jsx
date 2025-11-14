import { useState, useEffect } from 'react';
import { loadEnglandWards } from '../utils/correlationAnalysis';

const WardRankings = ({ isOpen, onClose }) => {
  const [selectedMetric, setSelectedMetric] = useState('imd');
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(false);

  const metrics = [
    // Deprivation Indices
    { value: 'imd', label: 'Overall Deprivation (IMD)', inverted: true },
    { value: 'income', label: 'Income Deprivation', inverted: true },
    { value: 'education', label: 'Education Deprivation', inverted: true },
    { value: 'employment', label: 'Employment Deprivation', inverted: true },
    { value: 'health', label: 'Health Deprivation', inverted: true },
    { value: 'crime', label: 'Crime Levels', inverted: true },
    { value: 'housing', label: 'Housing Barriers', inverted: true },
    { value: 'environment', label: 'Living Environment', inverted: true },

    // Demographics
    { value: 'age', label: 'Average Age', inverted: false },
    { value: 'population', label: 'Population', inverted: false },

    // Ethnicity
    { value: 'ethnicityAsian', label: '% Asian Population', inverted: false },
    { value: 'ethnicityBlack', label: '% Black Population', inverted: false },
    { value: 'ethnicityMixed', label: '% Mixed Population', inverted: false },
    { value: 'ethnicityWhite', label: '% White Population', inverted: false },

    // Economic Activity
    { value: 'economicEmployed', label: '% Employed', inverted: false },
    { value: 'economicSelfEmployed', label: '% Self-Employed', inverted: false },
    { value: 'economicUnemployed', label: '% Unemployed', inverted: false },
    { value: 'economicRetired', label: '% Retired', inverted: false },
    { value: 'economicStudent', label: '% Students', inverted: false },

    // Country of Birth
    { value: 'ukBorn', label: '% UK Born', inverted: false },
    { value: 'euBorn', label: '% EU Born', inverted: false },
    { value: 'nonEuBorn', label: '% Non-EU Born', inverted: false },

    // Religion
    { value: 'religionChristian', label: '% Christian', inverted: false },
    { value: 'religionMuslim', label: '% Muslim', inverted: false },
    { value: 'religionHindu', label: '% Hindu', inverted: false },
    { value: 'religionSikh', label: '% Sikh', inverted: false },
    { value: 'religionJewish', label: '% Jewish', inverted: false },
    { value: 'religionNone', label: '% No Religion', inverted: false },

    // Housing Tenure
    { value: 'housingOwnedOutright', label: '% Owned Outright', inverted: false },
    { value: 'housingOwnedMortgage', label: '% Owned with Mortgage', inverted: false },
    { value: 'housingSocialRented', label: '% Social Rented', inverted: false },
    { value: 'housingPrivateRented', label: '% Private Rented', inverted: false },

    // Qualifications
    { value: 'qualificationsNone', label: '% No Qualifications', inverted: false },
    { value: 'qualificationsLevel1to3', label: '% Level 1-3 Qualifications', inverted: false },
    { value: 'qualificationsLevel4Plus', label: '% Level 4+ (Degree)', inverted: false },
    { value: 'qualificationsApprenticeship', label: '% Apprenticeship', inverted: false },
  ];

  const metricMapping = {
    'imd': 'imdDecile',
    'income': 'incomeDecile',
    'education': 'educationDecile',
    'employment': 'employmentDecile',
    'health': 'healthDecile',
    'crime': 'crimeDecile',
    'housing': 'housingDecile',
    'environment': 'environmentDecile',
    'age': 'averageAge',
    'population': 'population',
    'ethnicityAsian': 'asianPercent',
    'ethnicityBlack': 'blackPercent',
    'ethnicityMixed': 'mixedPercent',
    'ethnicityWhite': 'whitePercent',
    'economicEmployed': 'employedPercent',
    'economicSelfEmployed': 'selfEmployedPercent',
    'economicUnemployed': 'unemployedPercent',
    'economicRetired': 'retiredPercent',
    'economicStudent': 'studentPercent',
    'ukBorn': 'ukBornPercent',
    'euBorn': 'euBornPercent',
    'nonEuBorn': 'nonEuBornPercent',
    'religionChristian': 'christianPercent',
    'religionMuslim': 'muslimPercent',
    'religionHindu': 'hinduPercent',
    'religionSikh': 'sikhPercent',
    'religionJewish': 'jewishPercent',
    'religionNone': 'noReligionPercent',
    'housingOwnedOutright': 'ownedOutrightPercent',
    'housingOwnedMortgage': 'ownedMortgagePercent',
    'housingSocialRented': 'socialRentedPercent',
    'housingPrivateRented': 'privateRentedPercent',
    'qualificationsNone': 'noQualificationsPercent',
    'qualificationsLevel1to3': 'level1to3Percent',
    'qualificationsLevel4Plus': 'level4PlusPercent',
    'qualificationsApprenticeship': 'apprenticeshipPercent',
  };

  useEffect(() => {
    if (isOpen) {
      calculateRankings();
    }
  }, [isOpen, selectedMetric]);

  const calculateRankings = async () => {
    setLoading(true);
    try {
      const wardsData = await loadEnglandWards();
      if (!wardsData || !wardsData.features) {
        console.error('No wards data available');
        return;
      }

      const metric = metrics.find(m => m.value === selectedMetric);
      const propertyName = metricMapping[selectedMetric];

      // Extract ward data with metric values
      const wardsWithValues = wardsData.features
        .map(ward => {
          const demographics = ward.properties || {};
          let value = demographics[propertyName];

          // Invert deciles if needed (same logic as correlation analysis)
          if (metric.inverted && value !== null && value !== undefined) {
            value = 11 - value;
          }

          return {
            name: demographics.name || 'Unknown',
            value: value,
            id: demographics.id
          };
        })
        .filter(ward => ward.value !== null && ward.value !== undefined);

      // Sort by value (descending for "most")
      wardsWithValues.sort((a, b) => b.value - a.value);

      // Get top 10 and bottom 10
      const top10 = wardsWithValues.slice(0, 10);
      const bottom10 = wardsWithValues.slice(-10).reverse();

      setRankings({
        top10,
        bottom10,
        total: wardsWithValues.length
      });
    } catch (error) {
      console.error('Error calculating rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentMetric = metrics.find(m => m.value === selectedMetric);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-grey">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-dark-grey">Ward Rankings</h2>
            <button
              onClick={onClose}
              className="text-medium-grey hover:text-dark-grey text-2xl"
            >
              ×
            </button>
          </div>

          {/* Metric Selector */}
          <div>
            <label className="block text-sm font-medium text-dark-grey mb-2">
              Select Metric
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              {metrics.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-medium-grey">
              Loading rankings...
            </div>
          ) : rankings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top 10 */}
              <div>
                <h3 className="text-lg font-semibold text-dark-grey mb-4">
                  Highest {currentMetric?.label}
                </h3>
                <div className="space-y-2">
                  {rankings.top10.map((ward, index) => (
                    <div
                      key={ward.id || index}
                      className="flex items-center justify-between p-3 bg-light-grey rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary-blue w-6">
                          {index + 1}
                        </span>
                        <span className="text-sm text-dark-grey">{ward.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-medium-grey">
                        {ward.value.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom 10 */}
              <div>
                <h3 className="text-lg font-semibold text-dark-grey mb-4">
                  Lowest {currentMetric?.label}
                </h3>
                <div className="space-y-2">
                  {rankings.bottom10.map((ward, index) => (
                    <div
                      key={ward.id || index}
                      className="flex items-center justify-between p-3 bg-light-grey rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-600 w-6">
                          {index + 1}
                        </span>
                        <span className="text-sm text-dark-grey">{ward.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-medium-grey">
                        {ward.value.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-medium-grey">
              No data available
            </div>
          )}

          {rankings && (
            <div className="mt-6 text-center text-sm text-medium-grey">
              Showing top and bottom 10 of {rankings.total.toLocaleString()} wards
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WardRankings;
