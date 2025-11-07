import { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';

const StartScreen = ({ onSelectConstituency }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [constituencies, setConstituencies] = useState([]);
  const [filteredConstituencies, setFilteredConstituencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load constituency index
  useEffect(() => {
    const loadConstituencies = async () => {
      try {
        // Try to load the index file
        const response = await fetch('/src/data/constituencies/index.json');

        if (!response.ok) {
          // If index doesn't exist, use Bexhill and Battle as default
          const fallbackConstituencies = [{
            id: 'E14001088',
            name: 'Bexhill and Battle',
            center: [51.461990, 0.166682],
            filename: '../bexhill-battle.json' // Using existing file
          }];
          setConstituencies(fallbackConstituencies);
          setFilteredConstituencies(fallbackConstituencies);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setConstituencies(data);
        setFilteredConstituencies(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading constituencies:', err);
        // Fallback to Bexhill and Battle
        const fallbackConstituencies = [{
          id: 'E14001088',
          name: 'Bexhill and Battle',
          center: [51.461990, 0.166682],
          filename: '../bexhill-battle.json'
        }];
        setConstituencies(fallbackConstituencies);
        setFilteredConstituencies(fallbackConstituencies);
        setLoading(false);
      }
    };

    loadConstituencies();
  }, []);

  // Filter constituencies based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConstituencies(constituencies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = constituencies.filter(constituency =>
      constituency.name.toLowerCase().includes(query) ||
      constituency.id.toLowerCase().includes(query)
    );

    setFilteredConstituencies(filtered);
  }, [searchQuery, constituencies]);

  const handleSelect = (constituency) => {
    onSelectConstituency(constituency);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary-blue to-soft-blue">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">
              Constituency Pulse
            </h1>
            <p className="text-xl text-blue-100">
              Data and mapping platform for UK Parliamentary constituencies
            </p>
          </div>

          {/* Search Box */}
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <label className="block text-dark-grey font-semibold mb-3 text-lg">
              Search for a constituency
            </label>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-medium-grey" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type constituency name..."
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-border-grey rounded-lg focus:outline-none focus:border-primary-blue transition-colors"
                autoFocus
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="mt-6 text-center text-medium-grey">
                Loading constituencies...
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Results List */}
            {!loading && !error && (
              <div className="mt-6">
                <div className="text-sm text-medium-grey mb-3">
                  {filteredConstituencies.length === constituencies.length
                    ? `${constituencies.length} constituencies available`
                    : `${filteredConstituencies.length} results`}
                </div>

                <div className="max-h-96 overflow-y-auto border border-border-grey rounded-lg">
                  {filteredConstituencies.length === 0 ? (
                    <div className="p-8 text-center text-medium-grey">
                      No constituencies found matching "{searchQuery}"
                    </div>
                  ) : (
                    <div className="divide-y divide-border-grey">
                      {filteredConstituencies.map((constituency) => (
                        <button
                          key={constituency.id}
                          onClick={() => handleSelect(constituency)}
                          className="w-full px-6 py-4 text-left hover:bg-light-blue transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-semibold text-dark-grey group-hover:text-primary-blue transition-colors">
                              {constituency.name}
                            </div>
                            <div className="text-sm text-medium-grey mt-1">
                              {constituency.id}
                            </div>
                          </div>
                          <MapPin className="text-medium-grey group-hover:text-primary-blue transition-colors" size={20} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Note */}
            {!loading && constituencies.length === 1 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Currently showing sample data for Bexhill and Battle.
                  Run the batch import script to load all UK constituencies.
                </p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-blue-100 text-sm">
            <p>Select a constituency to view interactive maps, demographics, and local events</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
