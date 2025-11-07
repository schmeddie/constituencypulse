/**
 * Correlation Analysis Utility
 *
 * This utility analyzes correlations between two metrics across all wards in England.
 *
 * NOTE: You will need to provide an all-England wards GeoJSON file with demographics.
 * Place it at: public/data/england-wards.json
 *
 * The file should contain:
 * - GeoJSON FeatureCollection with all England wards
 * - Each feature should have properties with demographics (imdDecile, incomeDecile, etc.)
 */

/**
 * Get the value for a specific metric from ward demographics
 */
const getMetricValue = (ward, metric) => {
  const demographics = ward.properties || ward.demographics || {};

  // Map metric names to actual property names
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
    'populationDensity': 'population', // Use population as proxy for density
    'ethnicityAsian': 'asianPercent',
    'ethnicityBlack': 'blackPercent',
    'ethnicityMixed': 'mixedPercent',
    'ethnicityWhite': 'whitePercent',
  };

  const propertyName = metricMapping[metric] || metric;
  return demographics[propertyName];
};

/**
 * Normalize a value to 0-1 scale based on metric type
 */
const normalizeValue = (value, metric, allValues) => {
  if (value === null || value === undefined) return null;

  // For decile metrics (1-10), higher is less deprived
  const decileMetrics = ['imd', 'income', 'education', 'employment', 'health', 'crime', 'housing', 'environment'];

  if (decileMetrics.includes(metric)) {
    // Decile 1-10, where 10 = least deprived
    return (value - 1) / 9; // Normalize to 0-1
  }

  // For other metrics, use min-max normalization
  const validValues = allValues.filter(v => v !== null && v !== undefined);
  if (validValues.length === 0) return null;

  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  if (max === min) return 0.5;

  return (value - min) / (max - min);
};

/**
 * Determine if a ward supports the expected correlation
 */
const evaluateCorrelation = (value1, value2, correlationType) => {
  // Need both values
  if (value1 === null || value2 === null) {
    return 'no_data';
  }

  // Define thresholds for high/low
  const threshold = 0.5; // Middle point

  const isHigh1 = value1 > threshold;
  const isHigh2 = value2 > threshold;

  if (correlationType === 'positive') {
    // Positive correlation: both high OR both low = supports
    if ((isHigh1 && isHigh2) || (!isHigh1 && !isHigh2)) {
      return 'supports';
    } else {
      return 'contradicts';
    }
  } else {
    // Negative correlation: one high, one low = supports
    if ((isHigh1 && !isHigh2) || (!isHigh1 && isHigh2)) {
      return 'supports';
    } else {
      return 'contradicts';
    }
  }
};

/**
 * Load all England wards data
 */
export const loadEnglandWards = async () => {
  try {
    const response = await fetch('/data/england-wards.json');

    if (!response.ok) {
      console.error('England wards file not found. Please add england-wards.json to public/data/');
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading England wards:', error);
    return null;
  }
};

/**
 * Analyze correlation across all wards
 */
export const analyzeCorrelation = async (metric1, metric2, correlationType) => {
  // Load all England wards
  const englandWardsData = await loadEnglandWards();

  if (!englandWardsData || !englandWardsData.features) {
    console.error('No England wards data available');
    return null;
  }

  const wards = englandWardsData.features;

  // Extract all values for normalization
  const allValues1 = wards.map(ward => getMetricValue(ward, metric1));
  const allValues2 = wards.map(ward => getMetricValue(ward, metric2));

  // Analyze each ward
  const results = wards.map(ward => {
    const value1 = getMetricValue(ward, metric1);
    const value2 = getMetricValue(ward, metric2);

    const normalizedValue1 = normalizeValue(value1, metric1, allValues1);
    const normalizedValue2 = normalizeValue(value2, metric2, allValues2);

    const result = evaluateCorrelation(normalizedValue1, normalizedValue2, correlationType);

    return {
      ...ward,
      correlationResult: result,
      metric1Value: value1,
      metric2Value: value2,
      normalizedValue1,
      normalizedValue2,
    };
  });

  // Calculate statistics
  const supports = results.filter(r => r.correlationResult === 'supports').length;
  const contradicts = results.filter(r => r.correlationResult === 'contradicts').length;
  const noData = results.filter(r => r.correlationResult === 'no_data').length;

  return {
    wards: results,
    statistics: {
      total: wards.length,
      supports,
      contradicts,
      noData,
      supportsPercent: Math.round((supports / (supports + contradicts)) * 100),
      contradictsPercent: Math.round((contradicts / (supports + contradicts)) * 100),
    },
    metric1,
    metric2,
    correlationType,
  };
};
