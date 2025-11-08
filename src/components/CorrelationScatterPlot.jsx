import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CorrelationScatterPlot = ({ correlationResults, onWardClick }) => {
  if (!correlationResults || !correlationResults.wards) {
    return null;
  }

  // Prepare data for scatter plot
  const scatterData = correlationResults.wards
    .filter(ward => ward.metric1Value !== null && ward.metric2Value !== null)
    .map(ward => ({
      x: ward.metric1Value,
      y: ward.metric2Value,
      name: ward.properties?.name || 'Unknown',
      wardId: ward.id,
      result: ward.correlationResult
    }));

  // Calculate means for reference lines
  const meanX = scatterData.reduce((sum, d) => sum + d.x, 0) / scatterData.length;
  const meanY = scatterData.reduce((sum, d) => sum + d.y, 0) / scatterData.length;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.name}</div>
          <div>{correlationResults.metric1}: {data.x.toFixed(2)}</div>
          <div>{correlationResults.metric2}: {data.y.toFixed(2)}</div>
        </div>
      );
    }
    return null;
  };

  // Get color based on result
  const getPointColor = (result) => {
    if (result === 'supports') return '#22c55e';
    if (result === 'contradicts') return '#ef4444';
    return '#9ca3af';
  };

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '20px' }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name={correlationResults.metric1}
            label={{ value: correlationResults.metric1, position: 'bottom', offset: 0 }}
            stroke="#6b7280"
          />
          <YAxis
            type="number"
            dataKey="y"
            name={correlationResults.metric2}
            label={{ value: correlationResults.metric2, angle: -90, position: 'left' }}
            stroke="#6b7280"
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Mean reference lines */}
          <ReferenceLine x={meanX} stroke="#9ca3af" strokeDasharray="5 5" strokeWidth={1} />
          <ReferenceLine y={meanY} stroke="#9ca3af" strokeDasharray="5 5" strokeWidth={1} />

          {/* Scatter points colored by result */}
          {['supports', 'contradicts', 'no_data'].map(result => (
            <Scatter
              key={result}
              name={result}
              data={scatterData.filter(d => d.result === result)}
              fill={getPointColor(result)}
              opacity={0.6}
              cursor="pointer"
              onClick={(data) => onWardClick && onWardClick(data.wardId)}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '10px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%' }}></div>
          <span>Supports</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></div>
          <span>Contradicts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#9ca3af', borderRadius: '50%' }}></div>
          <span>No Data</span>
        </div>
      </div>
    </div>
  );
};

export default CorrelationScatterPlot;
