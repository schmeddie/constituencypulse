import { useState, useEffect } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import InteractiveMap from './components/InteractiveMap';
import LoadingSpinner from './components/LoadingSpinner';
import { fetchConstituencyBoundary, fetchConstituencyWards, geojsonToLeafletCoords, getGeojsonCenter } from './services/mapitApi';

// Import data
import eventsData from './data/events.json';
import constituencyDataFallback from './data/constituencies.json';
import ageData from './data/demographics/age.json';
import incomeData from './data/demographics/income.json';
import educationData from './data/demographics/education.json';
import employmentData from './data/demographics/employment.json';

function App() {
  const [events, setEvents] = useState(eventsData);
  const [constituency, setConstituency] = useState(null);
  const [wards, setWards] = useState([]);
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(true);
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

  // Fetch real constituency and ward boundaries from MapIt API
  useEffect(() => {
    const loadBoundaries = async () => {
      try {
        setIsLoadingBoundaries(true);

        // Loughborough constituency code
        const constituencyCode = '65711'; // WMC:65711

        // Fetch constituency boundary
        const constituencyData = await fetchConstituencyBoundary(constituencyCode);
        const constituencyCoords = geojsonToLeafletCoords(constituencyData.geometry);
        const center = getGeojsonCenter(constituencyData.geometry);

        setConstituency({
          id: constituencyData.id,
          name: constituencyData.name,
          boundary: constituencyCoords[0] || constituencyCoords, // Take outer ring
          center: center,
          geometry: constituencyData.geometry,
        });

        // Fetch wards
        const wardsData = await fetchConstituencyWards(constituencyCode);
        const processedWards = wardsData.map((ward, index) => {
          const wardCoords = geojsonToLeafletCoords(ward.geometry);
          return {
            id: ward.id,
            name: ward.name,
            boundary: wardCoords[0] || wardCoords,
            geometry: ward.geometry,
            // Estimate population and voters (real data would come from census)
            population: 10000 + Math.floor(Math.random() * 5000),
            voters: 7500 + Math.floor(Math.random() * 3000),
          };
        });

        setWards(processedWards);
        setIsLoadingBoundaries(false);
      } catch (error) {
        console.error('Failed to load boundaries from MapIt API:', error);
        console.log('Falling back to dummy data...');

        // Fallback to dummy data
        setConstituency(constituencyDataFallback);
        setWards(constituencyDataFallback.wards || []);
        setIsLoadingBoundaries(false);
      }
    };

    loadBoundaries();
  }, []);

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

  // Show loading screen while fetching boundaries
  if (isLoadingBoundaries || !constituency) {
    return (
      <div className="h-screen flex flex-col bg-light-grey">
        <Header onSearch={handleSearch} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-medium-grey">Loading constituency boundaries...</p>
            <p className="text-sm text-medium-grey mt-2">Fetching data from MapIt API</p>
          </div>
        </div>
      </div>
    );
  }

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
            wards={wards}
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
