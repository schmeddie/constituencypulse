import { useState, useEffect } from 'react';

/**
 * Constituency Comparison Component
 * Allows users to select and compare 2-3 constituencies side-by-side
 */
const ConstituencyComparison = ({ isOpen, onClose, onCompare }) => {
  const [selectedConstituencies, setSelectedConstituencies] = useState([]);
  const [availableConstituencies, setAvailableConstituencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableConstituencies();
    }
  }, [isOpen]);

  const loadAvailableConstituencies = async () => {
    setLoading(true);
    try {
      // Load constituencies.json which contains list of all constituencies
      const response = await fetch('/data/constituencies.json');
      if (!response.ok) {
        throw new Error('Failed to load constituencies');
      }
      const data = await response.json();
      setAvailableConstituencies(data);
    } catch (error) {
      console.error('Error loading constituencies:', error);
      alert('Failed to load constituency list');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConstituency = (constituency) => {
    if (selectedConstituencies.find(c => c.id === constituency.id)) {
      // Remove if already selected
      setSelectedConstituencies(prev => prev.filter(c => c.id !== constituency.id));
    } else {
      // Add if not selected (max 3)
      if (selectedConstituencies.length >= 3) {
        alert('You can only compare up to 3 constituencies at once');
        return;
      }
      setSelectedConstituencies(prev => [...prev, constituency]);
    }
  };

  const handleCompare = () => {
    if (selectedConstituencies.length < 2) {
      alert('Please select at least 2 constituencies to compare');
      return;
    }
    onCompare(selectedConstituencies);
  };

  const handleClear = () => {
    setSelectedConstituencies([]);
  };

  // Filter constituencies by search query
  const filteredConstituencies = availableConstituencies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-grey">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-dark-grey">Compare Constituencies</h2>
            <button
              onClick={onClose}
              className="text-medium-grey hover:text-dark-grey text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-medium-grey">
            Select 2-3 constituencies to compare side-by-side
          </p>
        </div>

        {/* Selected Constituencies */}
        <div className="p-6 border-b border-border-grey bg-light-grey">
          <h3 className="text-sm font-semibold text-dark-grey mb-3">
            Selected ({selectedConstituencies.length}/3)
          </h3>
          {selectedConstituencies.length === 0 ? (
            <p className="text-sm text-medium-grey italic">No constituencies selected yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedConstituencies.map((constituency, index) => (
                <div
                  key={constituency.id}
                  className="flex items-center gap-2 px-3 py-2 bg-primary-blue text-white rounded-lg text-sm"
                >
                  <span className="font-medium">{index + 1}. {constituency.name}</span>
                  <button
                    onClick={() => handleToggleConstituency(constituency)}
                    className="hover:text-red-200"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-6 border-b border-border-grey">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search constituencies..."
            className="w-full px-4 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
          />
        </div>

        {/* Constituency List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-medium-grey">
              Loading constituencies...
            </div>
          ) : filteredConstituencies.length === 0 ? (
            <div className="text-center py-12 text-medium-grey">
              No constituencies found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredConstituencies.map(constituency => {
                const isSelected = selectedConstituencies.find(c => c.id === constituency.id);
                return (
                  <button
                    key={constituency.id}
                    onClick={() => handleToggleConstituency(constituency)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary-blue bg-blue-50'
                        : 'border-border-grey hover:border-primary-blue hover:bg-light-grey'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-dark-grey">
                        {constituency.name}
                      </span>
                      {isSelected && (
                        <span className="text-xs bg-primary-blue text-white px-2 py-1 rounded">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-grey flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2 border border-border-grey rounded-md text-dark-grey hover:bg-light-grey transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border-grey rounded-md text-dark-grey hover:bg-light-grey transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCompare}
            disabled={selectedConstituencies.length < 2}
            className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConstituencyComparison;
