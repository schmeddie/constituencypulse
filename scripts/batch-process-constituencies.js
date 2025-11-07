import fs from 'fs';
import path from 'path';
import { bngToLatLng } from './bng-converter.js';

/**
 * Batch process ONS Westminster Parliamentary Constituencies GeoJSON
 * Converts all constituencies to individual JSON files with lat/lng coordinates
 */

// Input: Full ONS GeoJSON file path (you'll provide this)
const ONS_GEOJSON_PATH = process.argv[2] || './ons-constituencies.geojson';

// Output directory for processed constituencies
const OUTPUT_DIR = '../src/data/constituencies';

// Convert MultiPolygon coordinates from BNG to lat/lng
function convertMultiPolygon(coordinates) {
  return coordinates.map(polygon =>
    polygon.map(ring =>
      ring.map(coord => {
        const [lat, lng] = bngToLatLng(coord[0], coord[1]);
        return [lat, lng];
      })
    )
  );
}

// Convert Polygon coordinates from BNG to lat/lng
function convertPolygon(coordinates) {
  return coordinates.map(ring =>
    ring.map(coord => {
      const [lat, lng] = bngToLatLng(coord[0], coord[1]);
      return [lat, lng];
    })
  );
}

// Calculate center point from coordinates
function calculateCenter(coords) {
  let allLats = [];
  let allLngs = [];

  function extractCoords(arr, depth = 0) {
    if (Array.isArray(arr[0])) {
      arr.forEach(item => extractCoords(item, depth + 1));
    } else {
      // arr is [lat, lng]
      allLats.push(arr[0]);
      allLngs.push(arr[1]);
    }
  }

  extractCoords(coords);

  const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
  const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;

  return [centerLat, centerLng];
}

// Generate placeholder wards for a constituency
function generatePlaceholderWards(constituencyCenter, constituencyName) {
  // Create 6 placeholder wards around the constituency center
  const wardCount = 6;
  const wards = [];

  for (let i = 0; i < wardCount; i++) {
    const angle = (i * 360) / wardCount;
    const radius = 0.02; // ~2km offset

    const centerLat = constituencyCenter[0] + radius * Math.cos(angle * Math.PI / 180);
    const centerLng = constituencyCenter[1] + radius * Math.sin(angle * Math.PI / 180);

    // Create a small polygon around this center
    const boundary = [];
    for (let j = 0; j < 6; j++) {
      const wardAngle = (j * 360) / 6;
      const wardRadius = 0.01; // ~1km radius
      boundary.push([
        centerLat + wardRadius * Math.cos(wardAngle * Math.PI / 180),
        centerLng + wardRadius * Math.sin(wardAngle * Math.PI / 180)
      ]);
    }
    // Close the polygon
    boundary.push(boundary[0]);

    wards.push({
      id: `ward_${String(i + 1).padStart(3, '0')}`,
      name: `${constituencyName} Ward ${i + 1}`,
      boundary: boundary,
      center: [centerLat, centerLng],
      demographics: {
        population: 8000 + Math.floor(Math.random() * 5000),
        voters: 6000 + Math.floor(Math.random() * 3000),
        medianAge: 35 + Math.floor(Math.random() * 30),
        medianIncome: 25000 + Math.floor(Math.random() * 20000),
        higherEducation: 25 + Math.floor(Math.random() * 40),
        employed: 55 + Math.floor(Math.random() * 30)
      }
    });
  }

  return wards;
}

// Generate placeholder events for a constituency
function generatePlaceholderEvents(wards) {
  const categories = ['healthcare', 'education', 'transport', 'housing', 'environment'];
  const eventTemplates = {
    healthcare: ['Surgery Expansion', 'Health Centre Opening', 'Hospital Campaign'],
    education: ['School Funding', 'College Open Day', 'Library Consultation'],
    transport: ['Road Improvements', 'Bus Service Changes', 'Cycling Infrastructure'],
    housing: ['Development Proposal', 'Regeneration Meeting', 'Planning Consultation'],
    environment: ['Flood Defence Review', 'Park Improvement', 'Recycling Initiative']
  };

  const events = [];
  const eventCount = 6 + Math.floor(Math.random() * 4); // 6-10 events

  for (let i = 0; i < eventCount; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const templates = eventTemplates[category];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const ward = wards[Math.floor(Math.random() * wards.length)];

    events.push({
      id: `event_${String(i + 1).padStart(3, '0')}`,
      title: `${ward.name.split(' ')[0]} ${template}`,
      category: category,
      coordinates: ward.center,
      date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      summary: `Local community event in ${ward.name}`
    });
  }

  return events;
}

// Process single constituency
function processConstituency(feature) {
  const properties = feature.properties;
  const geometry = feature.geometry;

  console.log(`Processing: ${properties.PCON24NM} (${properties.PCON24CD})`);

  let convertedBoundary;
  let geometryType;

  if (geometry.type === 'MultiPolygon') {
    convertedBoundary = convertMultiPolygon(geometry.coordinates);
    geometryType = 'MultiPolygon';
  } else if (geometry.type === 'Polygon') {
    convertedBoundary = convertPolygon(geometry.coordinates);
    geometryType = 'Polygon';
    // Wrap in array to make it consistent with MultiPolygon structure
    convertedBoundary = [convertedBoundary];
  } else {
    console.warn(`  Skipping - unsupported geometry type: ${geometry.type}`);
    return null;
  }

  const center = calculateCenter(convertedBoundary);
  const wards = generatePlaceholderWards(center, properties.PCON24NM);
  const events = generatePlaceholderEvents(wards);

  return {
    constituency: {
      id: properties.PCON24CD,
      name: properties.PCON24NM,
      center: center,
      zoom: 11,
      multiPolygonBoundary: convertedBoundary
    },
    wards: wards,
    events: events
  };
}

// Main batch processing
async function batchProcess() {
  console.log('=== Constituency Batch Processor ===\n');

  // Check if input file exists
  if (!fs.existsSync(ONS_GEOJSON_PATH)) {
    console.error(`Error: Input file not found: ${ONS_GEOJSON_PATH}`);
    console.error('\nUsage: node batch-process-constituencies.js <path-to-ons-geojson>');
    console.error('Example: node batch-process-constituencies.js ./Westminster_Parliamentary_Constituencies_2024.geojson');
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${OUTPUT_DIR}\n`);
  }

  // Load GeoJSON
  console.log(`Loading: ${ONS_GEOJSON_PATH}...`);
  const geojson = JSON.parse(fs.readFileSync(ONS_GEOJSON_PATH, 'utf8'));

  if (!geojson.features || !Array.isArray(geojson.features)) {
    console.error('Error: Invalid GeoJSON format (no features array)');
    process.exit(1);
  }

  console.log(`Found ${geojson.features.length} constituencies\n`);

  // Process each constituency
  const index = [];
  let successCount = 0;
  let errorCount = 0;

  for (const feature of geojson.features) {
    try {
      const constituencyData = processConstituency(feature);

      if (!constituencyData) {
        errorCount++;
        continue;
      }

      // Save individual constituency file
      const filename = `${constituencyData.constituency.id}.json`;
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(constituencyData, null, 2));

      // Add to index
      index.push({
        id: constituencyData.constituency.id,
        name: constituencyData.constituency.name,
        center: constituencyData.constituency.center,
        filename: filename
      });

      successCount++;
      console.log(`  ✓ Saved: ${filename}`);

    } catch (error) {
      console.error(`  ✗ Error processing ${feature.properties?.PCON24NM}: ${error.message}`);
      errorCount++;
    }
  }

  // Sort index alphabetically by name
  index.sort((a, b) => a.name.localeCompare(b.name));

  // Save index file
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(`\n✓ Saved constituency index: ${indexPath}`);
  console.log(`\n=== Processing Complete ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total: ${successCount + errorCount}`);
}

// Run batch process
batchProcess().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
