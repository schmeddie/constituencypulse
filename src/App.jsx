import { useState, useEffect } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import InteractiveMap from './components/InteractiveMap';
import LoadingSpinner from './components/LoadingSpinner';

// Import data
import eventsData from './data/events.json';
import constituencyData from './data/constituencies.json';
import ageData from './data/demographics/age.json';
import incomeData from './data/demographics/income.json';
import educationData from './data/demographics/education.json';
import employmentData from './data/demographics/employment.json';

function App() {
  const [events, setEvents] = useState(eventsData);
  const [constituency, setConstituency] = useState(constituencyData);
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
  const [visibleEvents, setVisibleEvents] = useState(eventsData);
  const [demographicData, setDemographicData] = useState({
    age: ageData,
    income: incomeData,
    education: educationData,
    employment: employmentData,
  });

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
      event.name.toLowerCase().includes(query.toLowerCase()) ||
      event.category.toLowerCase().includes(query.toLowerCase()) ||
      event.summary.toLowerCase().includes(query.toLowerCase())
    );

    setVisibleEvents(searchResults);
  };

  return (
    <div className="h-screen flex flex-col bg-light-grey">
      <Header onSearch={handleSearch} />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          activeLayers={activeLayers}
          activeCategory={activeCategory}
          onToggleLayer={toggleLayer}
          onCategoryChange={handleCategoryChange}
        />

        <main className="flex-1 relative">
          {loading && <LoadingSpinner />}
          <InteractiveMap
            constituency={constituency}
            events={visibleEvents}
            activeLayers={activeLayers}
            demographicData={demographicData}
            onBoundsChange={handleMapBoundsChange}
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
