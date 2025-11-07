# MapIt API Integration

The Constituency Pulse dashboard now uses **real UK parliamentary constituency and ward boundaries** from the [MapIt API](https://mapit.mysociety.org/) by mySociety.

## Overview

Instead of dummy polygon data, the app fetches actual geographic boundaries for:
- **Constituency**: Westminster Parliamentary Constituency (e.g., Loughborough)
- **Wards**: All electoral wards within that constituency

## How It Works

### 1. API Service (`src/services/mapitApi.js`)

The service provides functions to:

```javascript
// Fetch constituency boundary by code
fetchConstituencyBoundary('65711')  // Loughborough

// Fetch all wards within constituency
fetchConstituencyWards('65711')

// Convert GeoJSON to Leaflet coordinates
geojsonToLeafletCoords(geojson)

// Calculate map center from GeoJSON
getGeojsonCenter(geojson)
```

### 2. Data Flow

```
App.jsx (on mount)
    ↓
fetchConstituencyBoundary('65711')
    ↓
MapIt API → GeoJSON response
    ↓
Convert to Leaflet coordinates
    ↓
Render on map with styling
```

### 3. Fallback Mechanism

If the MapIt API fails (rate limit, network error, etc.):
```javascript
try {
  // Fetch from MapIt API
} catch (error) {
  console.error('Failed to load boundaries');
  // Fall back to dummy data from constituencies.json
  setConstituency(constituencyDataFallback);
}
```

## API Endpoints Used

### Get Constituency
```
GET https://mapit.mysociety.org/area/65711.json
```
Returns constituency metadata (name, codes, type).

### Get Constituency Geometry
```
GET https://mapit.mysociety.org/area/65711.geojson
```
Returns GeoJSON boundary polygon.

### Get Wards
```
GET https://mapit.mysociety.org/area/65711/children.json
```
Returns all wards within the constituency.

### Get Ward Geometry
```
GET https://mapit.mysociety.org/area/{wardId}.geojson
```
Returns GeoJSON boundary for each ward.

## Rate Limits

**50 free API calls per day** without an API key.

With constituency + wards fetch:
- 1 call for constituency metadata
- 1 call for constituency geometry
- 1 call for wards list
- ~10-15 calls for individual ward geometries

**Total: ~13-17 API calls per page load**

### Optimization Tips

1. **Cache Results**: Consider caching GeoJSON in localStorage
2. **Use Fallback**: Keep dummy data for offline/testing
3. **API Key**: Contact mySociety for higher limits if needed

## Changing Constituency

To display a different constituency, change the code in `App.jsx`:

```javascript
// Current: Loughborough
const constituencyCode = '65711';

// Change to another constituency:
const constituencyCode = '65922'; // Sheffield Central
```

### Finding Constituency Codes

1. **By Postcode**:
```
GET https://mapit.mysociety.org/postcode/LE115BQ.json
```

2. **Browse**: Visit https://mapit.mysociety.org/areas/WMC.html

3. **Common Codes**:
- Loughborough: `65711`
- Sheffield Central: `65922`
- Bristol West: `65573`
- Manchester Central: `65810`

## Visual Styling

### Constituency Boundary
```javascript
{
  color: '#1f2937',      // Dark grey outline
  weight: 3,             // Thick border
  fillColor: '#3b82f6',  // Blue fill
  fillOpacity: 0.08,     // Very light
  dashArray: '5, 5'      // Dashed line
}
```

### Ward Boundaries (No Demographic Layer)
```javascript
{
  color: '#9ca3af',      // Medium grey outline
  weight: 1,             // Thin border
  fillColor: '#e5e7eb',  // Light grey fill
  fillOpacity: 0.15      // Very subtle
}
```

### Ward Boundaries (With Demographics)
```javascript
{
  color: '#555',         // Dark grey outline
  weight: 1,             // Thin border
  fillColor: [calculated from data],
  fillOpacity: 0.5       // Medium transparency
}
```

## Tooltips

### With Demographic Layer Active
```
Loughborough Central
Average Age: 31.2 years
```

### Without Demographic Layer
```
Loughborough Central
Median Age: —
Income Level: —
```

## Ward Name Matching

The app uses **fuzzy matching** to link MapIt wards with demographic data:

1. **Exact match**: Ward name matches exactly
2. **Partial match**: Ward name contains or is contained in data name
3. **Fallback**: Show placeholders if no match found

```javascript
// Example matches:
MapIt: "Loughborough Central"
Data:  "Loughborough Central" ✓ (exact)

MapIt: "Loughborough Shepshed East"
Data:  "Shepshed" ✓ (partial)
```

## Error Handling

### Network Errors
```javascript
Failed to fetch constituency: Network request failed
→ Falls back to dummy data
```

### Rate Limiting
```javascript
Failed to fetch constituency: 403 Forbidden
→ Falls back to dummy data
```

### Invalid Constituency Code
```javascript
Failed to fetch constituency: 404 Not Found
→ Falls back to dummy data
```

## Loading States

While fetching boundaries:
```
Loading constituency boundaries...
Fetching data from MapIt API
[Spinner animation]
```

## GeoJSON Format

MapIt returns GeoJSON in this format:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-1.1398, 52.6369],
        [-1.1298, 52.6489],
        // ... more coordinates
      ]
    ]
  }
}
```

**Note**: GeoJSON uses `[longitude, latitude]` order, but Leaflet uses `[latitude, longitude]`. The service automatically converts this.

## Future Enhancements

1. **Constituency Selector**: UI to switch between constituencies
2. **Postcode Search**: Enter postcode to find constituency
3. **Local Storage Cache**: Cache boundaries to reduce API calls
4. **Multi-Constituency**: Compare multiple constituencies side-by-side
5. **Historical Boundaries**: Show boundary changes over time

## Troubleshooting

### Map Shows Dummy Data
- Check browser console for API errors
- Verify network connectivity
- Check if MapIt API is accessible
- Verify constituency code is valid

### Wards Not Appearing
- Some constituencies may have 0 wards returned
- Check API response in browser DevTools
- Verify ward IDs are valid numbers

### Demographic Data Not Matching
- Ward names from MapIt may differ from census data
- Use fuzzy matching or manual mapping
- Update demographic JSON files with correct ward names

## Resources

- **MapIt API Docs**: https://mapit.mysociety.org/docs/
- **mySociety**: https://www.mysociety.org/
- **Source Code**: `src/services/mapitApi.js`

## Credits

- Boundary data: © [Ordnance Survey](https://www.ordnancesurvey.co.uk/)
- API: [mySociety MapIt](https://mapit.mysociety.org/)
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/)
