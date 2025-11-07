import { useState, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MapDashboard from './components/MapDashboard';
import LoadingSpinner from './components/LoadingSpinner';

// Import demographic data (same across all constituencies)
import ageData from './data/demographics/age.json';
import incomeData from './data/demographics/income.json';
import educationData from './data/demographics/education.json';
import employmentData from './data/demographics/employment.json';

function App() {
  // Constituency selection state
  const [selectedConstituency, setSelectedConstituency] = useState(null);
  const [constituencyData, setConstituencyData] = useState(null);
  const [isLoadingConstituency, setIsLoadingConstituency] = useState(false);

  // Dashboard state
  const [events, setEvents] = useState([]);
  const [constituency, setConstituency] = useState(null);
  const [wards, setWards] = useState([]);
  const [activeLayers, setActiveLayers] = useState({
    events: true,
    age: false,
    income: false,
    education: false,
    employment: false,
    voting: false,
    turnout: false,
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [demographicData, setDemographicData] = useState({
    age: ageData,
    income: incomeData,
    education: educationData,
    employment: employmentData,
  });

  // Load constituency data when selected
  const handleSelectConstituency = async (constituencyInfo) => {
    setIsLoadingConstituency(true);
    setSelectedConstituency(constituencyInfo);

    try {
      // Determine the path to the constituency data file
      let dataPath;

      if (constituencyInfo.filename.startsWith('../')) {
        // Special case for bexhill-battle.json (existing file)
        dataPath = `/src/data/bexhill-battle.json`;
      } else {
        // Standard path for batch-processed constituencies
        dataPath = `/src/data/constituencies/${constituencyInfo.filename}`;
      }

      const response = await fetch(dataPath);

      if (!response.ok) {
        throw new Error(`Failed to load constituency data: ${response.statusText}`);
      }

      const data = await response.json();

      // Set all the constituency-related state
      setConstituencyData(data);
      setConstituency({
        name: data.constituency.name,
        id: data.constituency.id
      });
      setEvents(data.events);
      setVisibleEvents(data.events);
      setWards(data.wards);

      setIsLoadingConstituency(false);
    } catch (error) {
      console.error('Error loading constituency:', error);
      setIsLoadingConstituency(false);
      alert(`Failed to load constituency data: ${error.message}`);
      setSelectedConstituency(null);
    }
  };

  // Go back to start screen
  const handleBackToStart = () => {
    setSelectedConstituency(null);
    setConstituencyData(null);
    setConstituency(null);
    setEvents([]);
    setVisibleEvents([]);
    setWards([]);
    setActiveCategory('all');
    setMapBounds(null);
    setActiveLayers({
      events: true,
      age: false,
      income: false,
      education: false,
      employment: false,
      voting: false,
      turnout: false,
    });
  };

  // Filter events by category
  useEffect(() => {
    let filtered = events;

    if (activeCategory !== 'all') {
      filtered = events.filter(event => event.category === activeCategory);
    }

    // Filter by map bounds if available
    if (mapBounds) {
      filtered = filtered.filter(event => {
        return mapBounds.contains([event.lat, event.lng]);
      });
    }

    setVisibleEvents(filtered);
  }, [activeCategory, events, mapBounds]);

  // Toggle data layer - only one demographic layer active at a time
  const toggleLayer = (layerName) => {
    setLoading(true);

    // Simulate loading delay for smooth transition
    setTimeout(() => {
      setActiveLayers(prev => {
        const demographicLayers = ['age', 'income', 'education', 'employment'];

        // If toggling a demographic layer
        if (demographicLayers.includes(layerName)) {
          // Turn off all other demographic layers
          const newLayers = { ...prev };
          demographicLayers.forEach(layer => {
            newLayers[layer] = layer === layerName ? !prev[layerName] : false;
          });
          return newLayers;
        }

        // For non-demographic layers, just toggle normally
        return {
          ...prev,
          [layerName]: !prev[layerName]
        };
      });
      setLoading(false);
    }, 300);
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setLoading(true);
    setTimeout(() => {
      setActiveCategory(category);
      setLoading(false);
    }, 200);
  };

  // Handle map bounds change
  const handleMapBoundsChange = (bounds) => {
    setMapBounds(bounds);
  };

  // Search functionality
  const handleSearch = (query) => {
    if (query.length < 2) {
      setVisibleEvents(events);
      return;
    }

    const searchResults = events.filter(event =>
      (event.title || event.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (event.category || '').toLowerCase().includes(query.toLowerCase()) ||
      (event.summary || '').toLowerCase().includes(query.toLowerCase())
    );

    setVisibleEvents(searchResults);
  };

  // Show start screen if no constituency selected
  if (!selectedConstituency) {
    return <StartScreen onSelectConstituency={handleSelectConstituency} />;
  }

  // Show loading screen while constituency data is being loaded
  if (isLoadingConstituency || !constituencyData) {
    return (
      <div className="h-screen flex flex-col bg-light-grey">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-medium-grey text-lg">Loading {selectedConstituency.name}...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show main dashboard
  return (
    <div className="h-screen flex flex-col bg-light-grey">
      <Header onSearch={handleSearch} onBackToStart={handleBackToStart} constituency={constituency} />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          activeLayers={activeLayers}
          activeCategory={activeCategory}
          onToggleLayer={toggleLayer}
          onCategoryChange={handleCategoryChange}
        />

        <main className="flex-1 relative">
          {loading && <LoadingSpinner />}
          <MapDashboard
            activeLayers={activeLayers}
            visibleEvents={visibleEvents}
            constituencyData={constituencyData}
          />
        </main>

        <RightSidebar
          constituency={constituency}
          events={visibleEvents}
          mapBounds={mapBounds}
          demographicData={demographicData}
          activeLayers={activeLayers}
        />
      </div>
    </div>
  );
}

export default App;
