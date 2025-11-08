/**
 * Export utilities for correlation results and screenshots
 */

/**
 * Convert correlation results to CSV format
 */
export const exportCorrelationToCSV = (correlationResults) => {
  if (!correlationResults || !correlationResults.wards) {
    console.error('No correlation results to export');
    return;
  }

  // Build CSV header
  const headers = [
    'Ward Name',
    'Ward ID',
    correlationResults.metric1,
    correlationResults.metric2,
    'Rank ' + correlationResults.metric1,
    'Rank ' + correlationResults.metric2,
    'Correlation Result'
  ];

  // Build CSV rows
  const rows = correlationResults.wards.map(ward => [
    ward.properties?.name || 'Unknown',
    ward.id,
    ward.metric1Value !== null ? ward.metric1Value.toFixed(2) : 'N/A',
    ward.metric2Value !== null ? ward.metric2Value.toFixed(2) : 'N/A',
    ward.rank1 !== null ? ward.rank1.toFixed(1) : 'N/A',
    ward.rank2 !== null ? ward.rank2.toFixed(1) : 'N/A',
    ward.correlationResult
  ]);

  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `correlation_${correlationResults.metric1}_vs_${correlationResults.metric2}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export correlation statistics to JSON
 */
export const exportCorrelationToJSON = (correlationResults) => {
  if (!correlationResults) {
    console.error('No correlation results to export');
    return;
  }

  const exportData = {
    analysis: {
      metric1: correlationResults.metric1,
      metric2: correlationResults.metric2,
      correlationType: correlationResults.correlationType,
      spearmanRho: correlationResults.statistics.spearmanRho,
      correlationStrength: correlationResults.statistics.correlationStrength,
      correlationDirection: correlationResults.statistics.correlationDirection
    },
    statistics: correlationResults.statistics,
    wards: correlationResults.wards.map(ward => ({
      name: ward.properties?.name || 'Unknown',
      id: ward.id,
      metric1Value: ward.metric1Value,
      metric2Value: ward.metric2Value,
      rank1: ward.rank1,
      rank2: ward.rank2,
      result: ward.correlationResult
    })),
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `correlation_${correlationResults.metric1}_vs_${correlationResults.metric2}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Take a screenshot of the map
 */
export const takeMapScreenshot = async (elementId = 'map-container') => {
  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default;

    const element = document.getElementById(elementId) || document.querySelector('.mapboxgl-map');

    if (!element) {
      console.error('Map element not found');
      return;
    }

    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f3f4f6'
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `map_screenshot_${new Date().toISOString().split('T')[0]}.png`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  } catch (error) {
    console.error('Error taking screenshot:', error);
    alert('Screenshot feature requires html2canvas library. Install with: npm install html2canvas');
  }
};
