import { useState } from 'react';

const CorrelationFinder = ({ isOpen, onClose, onAnalyze }) => {
  const [metric1, setMetric1] = useState('');
  const [metric2, setMetric2] = useState('');
  const [correlationType, setCorrelationType] = useState('positive');

  const metrics = [
    // Deprivation Indices
    { value: 'imd', label: 'Overall Deprivation (IMD)' },
    { value: 'income', label: 'Income Deprivation' },
    { value: 'education', label: 'Education Deprivation' },
    { value: 'employment', label: 'Employment Deprivation' },
    { value: 'health', label: 'Health Deprivation' },
    { value: 'crime', label: 'Crime Levels' },
    { value: 'housing', label: 'Housing Barriers' },
    { value: 'environment', label: 'Living Environment' },

    // Demographics
    { value: 'age', label: 'Average Age' },
    { value: 'populationDensity', label: 'Population Density' },

    // Ethnicity
    { value: 'ethnicityAsian', label: '% Asian Population' },
    { value: 'ethnicityBlack', label: '% Black Population' },
    { value: 'ethnicityMixed', label: '% Mixed Population' },
    { value: 'ethnicityWhite', label: '% White Population' },

    // Economic Activity
    { value: 'economicEmployed', label: '% Employed' },
    { value: 'economicSelfEmployed', label: '% Self-Employed' },
    { value: 'economicUnemployed', label: '% Unemployed' },
    { value: 'economicRetired', label: '% Retired' },
    { value: 'economicStudent', label: '% Students' },

    // Country of Birth
    { value: 'ukBorn', label: '% UK Born' },
    { value: 'euBorn', label: '% EU Born' },
    { value: 'nonEuBorn', label: '% Non-EU Born' },

    // Religion
    { value: 'religionChristian', label: '% Christian' },
    { value: 'religionMuslim', label: '% Muslim' },
    { value: 'religionHindu', label: '% Hindu' },
    { value: 'religionSikh', label: '% Sikh' },
    { value: 'religionJewish', label: '% Jewish' },
    { value: 'religionNone', label: '% No Religion' },

    // Housing Tenure
    { value: 'housingOwnedOutright', label: '% Owned Outright' },
    { value: 'housingOwnedMortgage', label: '% Owned with Mortgage' },
    { value: 'housingSocialRented', label: '% Social Rented' },
    { value: 'housingPrivateRented', label: '% Private Rented' },

    // Qualifications
    { value: 'qualificationsNone', label: '% No Qualifications' },
    { value: 'qualificationsLevel1to3', label: '% Level 1-3 Qualifications' },
    { value: 'qualificationsLevel4Plus', label: '% Level 4+ (Degree)' },
    { value: 'qualificationsApprenticeship', label: '% Apprenticeship' },
  ];

  const handleAnalyze = () => {
    if (!metric1 || !metric2) {
      alert('Please select both metrics');
      return;
    }
    if (metric1 === metric2) {
      alert('Please select different metrics');
      return;
    }
    onAnalyze({ metric1, metric2, correlationType });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-dark-grey mb-4">Find Correlation</h2>

        <div className="space-y-4">
          {/* Metric 1 */}
          <div>
            <label className="block text-sm font-medium text-dark-grey mb-2">
              First Metric
            </label>
            <select
              value={metric1}
              onChange={(e) => setMetric1(e.target.value)}
              className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              <option value="">Select a metric...</option>
              {metrics.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Metric 2 */}
          <div>
            <label className="block text-sm font-medium text-dark-grey mb-2">
              Second Metric
            </label>
            <select
              value={metric2}
              onChange={(e) => setMetric2(e.target.value)}
              className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              <option value="">Select a metric...</option>
              {metrics.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Correlation Type */}
          <div>
            <label className="block text-sm font-medium text-dark-grey mb-2">
              Expected Correlation
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="positive"
                  checked={correlationType === 'positive'}
                  onChange={(e) => setCorrelationType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Positive (both increase together)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="negative"
                  checked={correlationType === 'negative'}
                  onChange={(e) => setCorrelationType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Negative (one increases, other decreases)</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border-grey rounded-md text-dark-grey hover:bg-light-grey transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Analyze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationFinder;
