import { useState, useEffect, useMemo } from 'react';
import { getPartyColor, getPartyDisplayName } from '../utils/layerMetadata';

const NationalPredictor = ({ onClose, onShowAllWards }) => {
  const [constituencies, setConstituencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // name, winner, majority
  const [filterParty, setFilterParty] = useState('all');

  useEffect(() => {
    loadAllConstituencies();
  }, []);

  const loadAllConstituencies = async () => {
    try {
      setLoading(true);

      // First load the constituencies list
      const listResponse = await fetch('/src/data/constituencies.json');
      if (!listResponse.ok) throw new Error('Failed to load constituencies list');

      const constituenciesList = await listResponse.json();

      // Load each constituency's prediction data
      const results = await Promise.all(
        constituenciesList.map(async (constituency) => {
          try {
            const response = await fetch(`/src/data/constituencies/${constituency.filename}`);
            if (!response.ok) return null;

            const data = await response.json();
            return processPredictionData(data);
          } catch (err) {
            console.warn(`Failed to load ${constituency.name}:`, err);
            return null;
          }
        })
      );

      // Filter out failed loads
      const validResults = results.filter(r => r !== null);
      setConstituencies(validResults);
      setLoading(false);
    } catch (err) {
      console.error('Error loading constituencies:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const processPredictionData = (constituencyData) => {
    const { constituency, wards } = constituencyData;

    // Aggregate ward predictions to determine constituency winner
    const partyTotals = {
      labour: 0,
      conservative: 0,
      libdem: 0,
      green: 0,
      reform: 0,
      independent: 0
    };

    let wardsWithPredictions = 0;
    let totalPopulation = 0;

    wards.forEach(ward => {
      if (ward.demographics?.predicted2025) {
        const pred = ward.demographics.predicted2025;
        const pop = ward.demographics.population || 1;

        // Weight by population
        Object.keys(partyTotals).forEach(party => {
          if (typeof pred[party] === 'number') {
            partyTotals[party] += (pred[party] * pop);
          }
        });

        totalPopulation += pop;
        wardsWithPredictions++;
      }
    });

    if (wardsWithPredictions === 0) {
      return null; // No predictions available for this constituency
    }

    // Calculate percentages
    const partyPercentages = {};
    Object.keys(partyTotals).forEach(party => {
      partyPercentages[party] = (partyTotals[party] / totalPopulation);
    });

    // Determine winner and runner-up
    const sorted = Object.entries(partyPercentages).sort(([, a], [, b]) => b - a);
    const winner = sorted[0][0];
    const winnerVote = sorted[0][1];
    const runnerUp = sorted[1][0];
    const runnerUpVote = sorted[1][1];
    const majority = winnerVote - runnerUpVote;

    return {
      name: constituency.name,
      id: constituency.id,
      filename: constituencyData.filename || `${constituency.name.toLowerCase().replace(/\s+/g, '-')}.json`,
      winner,
      winnerVote,
      runnerUp,
      runnerUpVote,
      majority,
      votes: partyPercentages,
      wardsTotal: wards.length,
      wardsWithPredictions,
      totalPopulation
    };
  };

  // Calculate national totals
  const nationalStats = useMemo(() => {
    if (constituencies.length === 0) return null;

    const seatsByParty = {
      labour: 0,
      conservative: 0,
      libdem: 0,
      green: 0,
      reform: 0,
      independent: 0
    };

    const votesByParty = {
      labour: 0,
      conservative: 0,
      libdem: 0,
      green: 0,
      reform: 0,
      independent: 0
    };

    let totalPopulation = 0;

    constituencies.forEach(constituency => {
      // Count seats
      seatsByParty[constituency.winner]++;

      // Sum votes (population-weighted)
      Object.keys(votesByParty).forEach(party => {
        votesByParty[party] += (constituency.votes[party] * constituency.totalPopulation);
      });

      totalPopulation += constituency.totalPopulation;
    });

    // Calculate national vote shares
    const nationalVoteShare = {};
    Object.keys(votesByParty).forEach(party => {
      nationalVoteShare[party] = (votesByParty[party] / totalPopulation) * 100;
    });

    return {
      totalSeats: constituencies.length,
      seatsByParty,
      nationalVoteShare
    };
  }, [constituencies]);

  // Filtered and sorted constituencies
  const filteredConstituencies = useMemo(() => {
    let filtered = constituencies;

    // Apply party filter
    if (filterParty !== 'all') {
      filtered = filtered.filter(c => c.winner === filterParty);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'majority':
          return b.majority - a.majority;
        case 'winner':
          return a.winner.localeCompare(b.winner) || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  }, [constituencies, sortBy, filterParty]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Loading National Predictions...</div>
            <div className="text-sm text-gray-600">Processing 632 constituencies</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">2025 General Election Prediction</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* National Summary */}
          {nationalStats && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              {Object.entries(nationalStats.seatsByParty).map(([party, seats]) => (
                <div
                  key={party}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: `${getPartyColor(party)}15`, borderLeft: `4px solid ${getPartyColor(party)}` }}
                >
                  <div className="text-sm text-gray-600 mb-1">{getPartyDisplayName(party)}</div>
                  <div className="text-2xl font-bold">{seats}</div>
                  <div className="text-xs text-gray-500">{nationalStats.nationalVoteShare[party].toFixed(1)}% votes</div>
                </div>
              ))}
            </div>
          )}

          {/* View Map Button */}
          <button
            onClick={onShowAllWards}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mb-4"
          >
            📊 View National Map (All {constituencies.reduce((sum, c) => sum + c.wardsWithPredictions, 0)} Wards)
          </button>

          {/* Controls */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Party</label>
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Parties</option>
                {Object.keys(nationalStats.seatsByParty).map(party => (
                  <option key={party} value={party}>{getPartyDisplayName(party)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="name">Name (A-Z)</option>
                <option value="winner">Winning Party</option>
                <option value="majority">Largest Majority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Constituency List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredConstituencies.length} of {constituencies.length} constituencies
          </div>

          <div className="space-y-2">
            {filteredConstituencies.map(constituency => (
              <div
                key={constituency.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{constituency.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-3 py-1 rounded text-white text-sm font-medium"
                        style={{ backgroundColor: getPartyColor(constituency.winner) }}
                      >
                        {getPartyDisplayName(constituency.winner)} WIN
                      </span>
                      <span className="text-sm text-gray-600">
                        Majority: {constituency.majority.toFixed(1)}pp over {getPartyDisplayName(constituency.runnerUp)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold" style={{ color: getPartyColor(constituency.winner) }}>
                      {constituency.winnerVote.toFixed(1)}%
                    </div>
                    <div className="text-gray-500 text-xs">
                      {constituency.wardsWithPredictions}/{constituency.wardsTotal} wards
                    </div>
                  </div>
                </div>

                {/* Vote breakdown */}
                <div className="mt-3 grid grid-cols-6 gap-2 text-xs">
                  {Object.entries(constituency.votes)
                    .sort(([, a], [, b]) => b - a)
                    .map(([party, vote]) => (
                      <div key={party} className="text-center">
                        <div className="font-medium" style={{ color: getPartyColor(party) }}>
                          {vote.toFixed(1)}%
                        </div>
                        <div className="text-gray-500 text-xs">{party.substring(0, 3).toUpperCase()}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NationalPredictor;
