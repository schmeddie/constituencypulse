/**
 * Ward filtering utilities
 */

/**
 * Get metric value from ward demographics
 * Uses same logic as correlation analysis with decile inversion
 */
const getMetricValue = (ward, metric) => {
  const demographics = ward.demographics || {};

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
  };

  // Metrics that use inverted deciles
  const invertedDecileMetrics = [
    'imd', 'income', 'education', 'employment',
    'health', 'crime', 'housing', 'environment'
  ];

  const propertyName = metricMapping[metric] || metric;
  let value = demographics[propertyName];

  // Invert decile values so higher number = more deprivation/crime/etc.
  if (invertedDecileMetrics.includes(metric) && value !== null && value !== undefined) {
    value = 11 - value;
  }

  return value;
};

/**
 * Evaluate a single filter condition
 */
const evaluateCondition = (value, operator, targetValue) => {
  if (value === null || value === undefined) return false;

  const numValue = Number(value);
  const numTarget = Number(targetValue);

  switch (operator) {
    case '>':
      return numValue > numTarget;
    case '>=':
      return numValue >= numTarget;
    case '<':
      return numValue < numTarget;
    case '<=':
      return numValue <= numTarget;
    case '=':
      return Math.abs(numValue - numTarget) < 0.01; // Allow small floating point differences
    default:
      return false;
  }
};

/**
 * Apply filters to a list of wards
 * Returns wards that match ALL filter conditions (AND logic)
 */
export const applyFiltersToWards = (wards, filters) => {
  if (!filters || filters.length === 0) {
    return wards; // No filters, return all wards
  }

  return wards.filter(ward => {
    // Ward must pass ALL filter conditions
    return filters.every(filter => {
      const value = getMetricValue(ward, filter.metric);
      return evaluateCondition(value, filter.operator, filter.value);
    });
  });
};

/**
 * Get human-readable description of filters
 */
export const getFilterDescription = (filters) => {
  if (!filters || filters.length === 0) {
    return 'No filters applied';
  }

  const metricLabels = {
    'imd': 'IMD',
    'income': 'Income Deprivation',
    'education': 'Education Deprivation',
    'employment': 'Employment Deprivation',
    'health': 'Health Deprivation',
    'crime': 'Crime',
    'housing': 'Housing',
    'environment': 'Environment',
    'age': 'Age',
    'population': 'Population',
    'ethnicityAsian': '% Asian',
    'ethnicityBlack': '% Black',
    'ethnicityMixed': '% Mixed',
    'ethnicityWhite': '% White',
  };

  const operatorSymbols = {
    '>': '>',
    '>=': '≥',
    '<': '<',
    '<=': '≤',
    '=': '='
  };

  const descriptions = filters.map(f =>
    `${metricLabels[f.metric] || f.metric} ${operatorSymbols[f.operator]} ${f.value}`
  );

  return descriptions.join(' AND ');
};
