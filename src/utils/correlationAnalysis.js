/**
 * Correlation Analysis Utility using Spearman's Rank Correlation Coefficient
 *
 * This utility analyzes correlations between two metrics across all wards in England
 * using Spearman's ρ (rho), which measures monotonic relationships.
 *
 * NOTE: Requires public/data/england-wards.json with all England wards and demographics.
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
    'populationDensity': 'population',
    'ethnicityAsian': 'asianPercent',
    'ethnicityBlack': 'blackPercent',
    'ethnicityMixed': 'mixedPercent',
    'ethnicityWhite': 'whitePercent',
  };

  const propertyName = metricMapping[metric] || metric;
  return demographics[propertyName];
};

/**
 * Assign ranks to values, handling ties with average ranks
 */
const rankValues = (values) => {
  // Create array of {value, originalIndex}
  const indexed = values.map((value, index) => ({ value, index }));

  // Separate nulls from valid values
  const validIndexed = indexed.filter(item => item.value !== null && item.value !== undefined);
  const nullIndexed = indexed.filter(item => item.value === null || item.value === undefined);

  // Sort valid values by value (ascending)
  validIndexed.sort((a, b) => a.value - b.value);

  // Assign ranks (1-based), handling ties with average rank
  const ranks = new Array(values.length).fill(null);

  let i = 0;
  while (i < validIndexed.length) {
    const currentValue = validIndexed[i].value;
    let j = i;

    // Find all items with the same value (ties)
    while (j < validIndexed.length && validIndexed[j].value === currentValue) {
      j++;
    }

    // Calculate average rank for tied values
    const avgRank = (i + 1 + j) / 2; // Average of ranks from (i+1) to j

    // Assign average rank to all tied values
    for (let k = i; k < j; k++) {
      ranks[validIndexed[k].index] = avgRank;
    }

    i = j;
  }

  return ranks;
};

/**
 * Calculate Pearson correlation coefficient
 */
const pearsonCorrelation = (x, y) => {
  const n = x.length;

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  // Calculate covariance and standard deviations
  let covariance = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    covariance += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  // Pearson correlation coefficient
  if (varX === 0 || varY === 0) return 0;
  return covariance / Math.sqrt(varX * varY);
};

/**
 * Calculate Spearman's Rank Correlation Coefficient
 * This is Pearson correlation applied to the ranks
 */
const spearmanCorrelation = (values1, values2) => {
  // Get ranks for both variables
  const ranks1 = rankValues(values1);
  const ranks2 = rankValues(values2);

  // Filter out pairs where either value is null
  const validPairs = [];
  for (let i = 0; i < values1.length; i++) {
    if (ranks1[i] !== null && ranks2[i] !== null) {
      validPairs.push({ rank1: ranks1[i], rank2: ranks2[i] });
    }
  }

  if (validPairs.length < 2) return null; // Need at least 2 points

  const x = validPairs.map(p => p.rank1);
  const y = validPairs.map(p => p.rank2);

  // Calculate Pearson correlation on ranks
  return pearsonCorrelation(x, y);
};

/**
 * Determine if a ward supports the overall correlation
 * Based on whether it falls on the same side of the trend
 */
const evaluateWardCorrelation = (rank1, rank2, medianRank1, medianRank2, correlationSign) => {
  if (rank1 === null || rank2 === null) return 'no_data';

  // Determine which quadrant the ward is in relative to medians
  const isAboveMedianX = rank1 > medianRank1;
  const isAboveMedianY = rank2 > medianRank2;

  if (correlationSign > 0) {
    // Positive correlation: expect both above or both below median
    if ((isAboveMedianX && isAboveMedianY) || (!isAboveMedianX && !isAboveMedianY)) {
      return 'supports';
    } else {
      return 'contradicts';
    }
  } else {
    // Negative correlation: expect one above, one below median
    if ((isAboveMedianX && !isAboveMedianY) || (!isAboveMedianX && isAboveMedianY)) {
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
 * Analyze correlation across all wards using Spearman's correlation
 */
export const analyzeCorrelation = async (metric1, metric2, correlationType) => {
  // Load all England wards
  const englandWardsData = await loadEnglandWards();

  if (!englandWardsData || !englandWardsData.features) {
    console.error('No England wards data available');
    return null;
  }

  const wards = englandWardsData.features;

  // Extract all values
  const allValues1 = wards.map(ward => getMetricValue(ward, metric1));
  const allValues2 = wards.map(ward => getMetricValue(ward, metric2));

  // Calculate Spearman's correlation coefficient
  const spearmanRho = spearmanCorrelation(allValues1, allValues2);

  if (spearmanRho === null) {
    console.error('Not enough valid data to calculate correlation');
    return null;
  }

  // Get ranks for individual ward evaluation
  const ranks1 = rankValues(allValues1);
  const ranks2 = rankValues(allValues2);

  // Calculate median ranks for quadrant analysis
  const validRanks1 = ranks1.filter(r => r !== null);
  const validRanks2 = ranks2.filter(r => r !== null);

  validRanks1.sort((a, b) => a - b);
  validRanks2.sort((a, b) => a - b);

  const medianRank1 = validRanks1[Math.floor(validRanks1.length / 2)];
  const medianRank2 = validRanks2[Math.floor(validRanks2.length / 2)];

  // Determine if the correlation matches user's expectation
  const expectedPositive = correlationType === 'positive';
  const actualPositive = spearmanRho > 0;
  const correlationMatches = expectedPositive === actualPositive;

  // Evaluate each ward
  const results = wards.map((ward, index) => {
    const value1 = allValues1[index];
    const value2 = allValues2[index];
    const rank1 = ranks1[index];
    const rank2 = ranks2[index];

    // Determine if this ward supports the actual correlation direction
    const result = evaluateWardCorrelation(
      rank1,
      rank2,
      medianRank1,
      medianRank2,
      spearmanRho
    );

    return {
      ...ward,
      correlationResult: result,
      metric1Value: value1,
      metric2Value: value2,
      rank1,
      rank2,
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
      spearmanRho: spearmanRho,
      correlationStrength: Math.abs(spearmanRho),
      correlationDirection: spearmanRho > 0 ? 'positive' : 'negative',
      correlationMatches,
      supportsPercent: supports + contradicts > 0
        ? Math.round((supports / (supports + contradicts)) * 100)
        : 0,
      contradictsPercent: supports + contradicts > 0
        ? Math.round((contradicts / (supports + contradicts)) * 100)
        : 0,
    },
    metric1,
    metric2,
    correlationType,
  };
};
