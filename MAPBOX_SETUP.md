# Mapbox GL JS Integration

The Constituency Pulse dashboard now uses **Mapbox GL JS** for high-performance vector-based mapping with interactive constituency boundaries and event markers.

## Quick Setup

### 1. Get a Mapbox Access Token

1. Sign up for a free account at [Mapbox](https://account.mapbox.com/auth/signup/)
2. Navigate to your [Access Tokens](https://account.mapbox.com/access-tokens/) page
3. Copy your **Default Public Token** (starts with `pk.`)

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Mapbox token:
   ```
   VITE_MAPBOX_TOKEN=pk.your_actual_token_here
   ```

3. Restart the dev server:
   ```bash
   npm run dev
   ```

## Features

### Constituency Boundaries

- **Data Source**: Mock GeoJSON representing ONS Westminster Parliamentary Constituencies
- **Styling**:
  - Transparent fill layer for click detection
  - Light grey stroke (`#CCCCCC`) with 1px width
  - Hover effect: Blue stroke (`#007cbf`) with 3px width
- **Interactions**:
  - Hover to highlight constituency
  - Click to log constituency name to console

### Event Markers

- **Data Source**: Mock GeoJSON point data for local events
- **Styling**: Circle markers with category-based colors:
  - **Healthcare**: `#3BB2D0` (Blue)
  - **Education**: `#A50F15` (Dark Red)
  - **Transport**: `#FFCC00` (Yellow)
  - **Housing**: `#8B4513` (Brown)
  - **Environment**: `#228B22` (Green)
  - **Default**: `#999999` (Grey)
- **Interactions**:
  - Click to log event title to console

## Map Configuration

### Initial Viewport

```javascript
{
  longitude: -3.0,    // Center on UK
  latitude: 55.0,
  zoom: 5             // Show entire UK
}
```

### Basemap Style

Using Mapbox's clean, minimalist `light-v10` style:
```
mapbox://styles/mapbox/light-v10
```

## Data Structure

### Constituencies GeoJSON

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "properties": {
        "PCON24NM": "Loughborough",
        "PCON24CD": "E14000797"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

**Key Properties:**
- `PCON24NM`: Constituency name (e.g., "Loughborough")
- `PCON24CD`: ONS constituency code

### Events GeoJSON

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "title": "New Health Centre Opening",
        "category": "Healthcare"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-1.20, 52.67]
      }
    }
  ]
}
```

**Key Properties:**
- `title`: Event name
- `category`: Used for color-coding (Healthcare, Education, Transport, etc.)

## Technical Implementation

### Hover Effects (Feature State)

Mapbox GL JS uses **feature state** for efficient hover effects:

```javascript
// Set hover state
map.setFeatureState(
  { source: 'constituencies', id: featureId },
  { hover: true }
);

// Style based on state
'line-color': [
  'case',
  ['boolean', ['feature-state', 'hover'], false],
  '#007cbf',  // Hovered
  '#CCCCCC'   // Default
]
```

### Data-Driven Styling

Event colors use Mapbox's **match expressions**:

```javascript
'circle-color': [
  'match',
  ['get', 'category'],
  'Healthcare', '#3BB2D0',
  'Education', '#A50F15',
  'Transport', '#FFCC00',
  '#999999'  // Default
]
```

### Click Detection

The `interactiveLayerIds` prop enables click detection:

```javascript
<Map
  interactiveLayerIds={['constituency-fill', 'events-circle']}
  onClick={onClick}
>
```

## Replacing Mock Data

### Using Real ONS Constituency Boundaries

1. Download the official dataset:
   - [ONS Geoportal - Westminster Parliamentary Constituencies (December 2024)](https://geoportal.statistics.gov.uk/)
   - Format: GeoJSON
   - Ensure properties include `PCON24NM` and `PCON24CD`

2. Import and use in MapDashboard.jsx:
   ```javascript
   import realConstituencies from './data/constituencies_ons.geojson';

   <Source
     id="constituencies"
     type="geojson"
     data={realConstituencies}
   >
   ```

### Using Real Event Data

Replace the mock `eventsData` with your actual API or JSON file:

```javascript
const [events, setEvents] = useState(null);

useEffect(() => {
  fetch('/api/events')
    .then(res => res.json())
    .then(data => setEvents(data));
}, []);

<Source
  id="events"
  type="geojson"
  data={events}
>
```

## Performance Notes

- **Vector tiles** render smoothly at all zoom levels
- **Feature state** updates are instant (no re-render)
- **WebGL rendering** handles thousands of features efficiently
- Constituency click detection uses transparent fill layer (no extra overhead)

## Browser Console Output

When interacting with the map:

```
Constituency clicked: Loughborough
Event clicked: New Health Centre Opening
```

## Troubleshooting

### Map doesn't load / blank screen

- Check your Mapbox token is valid and set in `.env`
- Ensure `.env` file is in the project root
- Restart the dev server after adding the token
- Check browser console for errors

### Token Error: "Unauthorized"

- Verify your token starts with `pk.`
- Ensure the token has the correct scopes (default public token should work)
- Check you haven't exceeded Mapbox's free tier limits (50,000 map loads/month)

### Hover effect not working

- Make sure `interactiveLayerIds` includes `'constituency-fill'`
- Check that GeoJSON features have unique `id` properties
- Feature state requires features to have numeric or string IDs

### Events not appearing

- Verify event coordinates are in `[longitude, latitude]` format
- Check that event categories match the color mapping
- Ensure `eventsData` is valid GeoJSON with `Point` geometries

## Resources

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/guides/)
- [react-map-gl Documentation](https://visgl.github.io/react-map-gl/)
- [Mapbox Style Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/)
- [ONS Geoportal](https://geoportal.statistics.gov.uk/)

## Next Steps

1. **Replace mock data** with real ONS constituency boundaries
2. **Integrate with existing event data** from `src/data/events.json`
3. **Add popups** showing constituency details on click
4. **Implement filters** to show/hide event categories
5. **Add demographic overlays** using Mapbox fill layers with data-driven opacity
6. **Integrate with RightSidebar** to display constituency statistics
