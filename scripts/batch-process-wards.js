import fs from 'fs';
import path from 'path';
import * as turf from '@turf/turf';

/**
 * Batch process ward GeoJSON and match to constituencies
 * Wards are already in WGS84 (lng, lat) format - no conversion needed
 */

// Input: Full wards GeoJSON file path
const WARDS_GEOJSON_PATH = process.argv[2] || './wards.geojson';

// Check for test mode flag
const TEST_MODE = process.argv.includes('--test');

// Test constituencies to process by NAME (10 constituencies for quick testing)
const TEST_CONSTITUENCY_NAMES = [
  'South Holland and The Deepings',
  'Bexhill and Battle',
  'Leicester South',
  'Loughborough',
  'Birmingham Edgbaston',
  'Bristol West',
  'Manchester Central',
  'Liverpool Riverside',
  'Leeds Central',
  'Norwich South'
];

// Constituency data directory
const CONSTITUENCIES_DIR = '../src/data/constituencies';

// Check if ward is within constituency using turf.js for accurate spatial matching
function wardInConstituency(wardGeometry, constituencyGeometry) {
  try {
    // Create turf polygon/multipolygon from the constituency geometry
    const constituencyPoly = turf.feature(constituencyGeometry);

    // Calculate the proper centroid of the ward using turf
    const wardPoly = turf.feature(wardGeometry);
    const wardCentroid = turf.centroid(wardPoly);

    // Method 1: Check if ward centroid is within constituency
    const centroidInside = turf.booleanPointInPolygon(wardCentroid, constituencyPoly);

    if (centroidInside) {
      return true;
    }

    // Method 2: If centroid isn't inside, check for polygon intersection
    // This catches wards that span across constituency boundaries
    try {
      const intersects = turf.booleanIntersects(wardPoly, constituencyPoly);
      if (intersects) {
        // Check if significant overlap (>25% of ward area is in constituency)
        const intersection = turf.intersect(turf.featureCollection([wardPoly, constituencyPoly]));
        if (intersection) {
          const wardArea = turf.area(wardPoly);
          const intersectionArea = turf.area(intersection);
          const overlapPercent = (intersectionArea / wardArea) * 100;

          // If more than 25% of the ward overlaps, consider it a match
          return overlapPercent > 25;
        }
      }
    } catch (e) {
      // If intersection calculation fails, fall back to centroid check
      return false;
    }

    return false;
  } catch (error) {
    console.error(`Error in spatial matching: ${error.message}`);
    return false;
  }
}

// Generate mock demographic data
function generateDemographics() {
  return {
    population: 8000 + Math.floor(Math.random() * 5000),
    voters: 6000 + Math.floor(Math.random() * 3000),
    medianAge: 35 + Math.floor(Math.random() * 30),
    medianIncome: 25000 + Math.floor(Math.random() * 20000),
    higherEducation: 25 + Math.floor(Math.random() * 40),
    employed: 55 + Math.floor(Math.random() * 30)
  };
}

// Generate placeholder events for a constituency based on its wards
function generateEventsForWards(wards) {
  const categories = ['healthcare', 'education', 'transport', 'housing', 'environment'];
  const eventTemplates = {
    healthcare: ['Surgery Expansion', 'Health Centre Opening', 'Hospital Campaign', 'Medical Consultation'],
    education: ['School Funding', 'College Open Day', 'Library Consultation', 'Education Meeting'],
    transport: ['Road Improvements', 'Bus Service Changes', 'Cycling Infrastructure', 'Parking Consultation'],
    housing: ['Development Proposal', 'Regeneration Meeting', 'Planning Consultation', 'Housing Forum'],
    environment: ['Flood Defence Review', 'Park Improvement', 'Recycling Initiative', 'Green Space Project']
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
      title: `${ward.name} ${template}`,
      category: category,
      coordinates: ward.center,
      date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      summary: `Local community event in ${ward.name}`
    });
  }

  return events;
}

// Convert ward GeoJSON to our format
function processWard(feature) {
  const properties = feature.properties;
  const geometry = feature.geometry;

  // Ward coordinates are already [lng, lat] in GeoJSON
  // Keep them as [lng, lat] for easier spatial operations
  const geoJsonBoundary = geometry.coordinates[0];

  // Convert to [lat, lng] for our storage format (to match constituencies)
  const boundary = geoJsonBoundary.map(coord => [coord[1], coord[0]]);

  // Calculate center from [lng, lat] coords
  let sumLat = 0, sumLng = 0, count = 0;
  for (const [lng, lat] of geoJsonBoundary) {
    sumLat += lat;
    sumLng += lng;
    count++;
  }
  const center = [sumLat / count, sumLng / count]; // [lat, lng] format

  return {
    id: properties.reference || properties.entity,
    name: properties.name,
    boundary: boundary,  // [lat, lng] format
    center: center,      // [lat, lng] format
    demographics: generateDemographics(),
    // Store original geometry for spatial matching (keeps [lng, lat] format)
    _geometry: geometry
  };
}

// Main processing
async function batchProcessWards() {
  console.log('=== Ward Batch Processor ===\n');

  // Check if wards file exists
  if (!fs.existsSync(WARDS_GEOJSON_PATH)) {
    console.error(`Error: Wards file not found: ${WARDS_GEOJSON_PATH}`);
    console.error('\nUsage: node batch-process-wards.js <path-to-wards-geojson> [--test]');
    console.error('Example: node batch-process-wards.js ./Wards_December_2024.geojson');
    console.error('Test mode: node batch-process-wards.js ./Wards_December_2024.geojson --test');
    console.error('\nTest mode processes only 10 constituencies including South Holland and The Deepings');
    process.exit(1);
  }

  // Check if constituencies directory exists
  if (!fs.existsSync(CONSTITUENCIES_DIR)) {
    console.error(`Error: Constituencies directory not found: ${CONSTITUENCIES_DIR}`);
    console.error('Please run batch-process-constituencies.js first');
    process.exit(1);
  }

  // Load wards GeoJSON
  console.log(`Loading: ${WARDS_GEOJSON_PATH}...`);
  const wardsGeoJSON = JSON.parse(fs.readFileSync(WARDS_GEOJSON_PATH, 'utf8'));

  if (!wardsGeoJSON.features || !Array.isArray(wardsGeoJSON.features)) {
    console.error('Error: Invalid GeoJSON format (no features array)');
    process.exit(1);
  }

  console.log(`Found ${wardsGeoJSON.features.length} wards\n`);

  // Load English constituency files only (E14 prefix)
  // Filter out Scottish (S14) and Welsh (W09) constituencies
  let constituencyFiles = fs.readdirSync(CONSTITUENCIES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json' && f.startsWith('E14'));

  console.log(`Found ${constituencyFiles.length} English constituency files\n`);

  // If test mode, filter to only test constituencies by name
  const constituencies = {};
  for (const file of constituencyFiles) {
    const data = JSON.parse(
      fs.readFileSync(path.join(CONSTITUENCIES_DIR, file), 'utf8')
    );

    // IMPORTANT: Clear existing placeholder wards
    data.wards = [];

    // In test mode, only include constituencies in the test list
    if (TEST_MODE) {
      if (TEST_CONSTITUENCY_NAMES.includes(data.constituency.name)) {
        constituencies[file] = data;
      }
    } else {
      constituencies[file] = data;
    }
  }

  if (TEST_MODE) {
    console.log(`\n🧪 TEST MODE: Processing only ${Object.keys(constituencies).length} constituencies:`);
    Object.values(constituencies).forEach(c => console.log(`  - ${c.constituency.name}`));
    console.log();
  } else {
    console.log(`Processing ${Object.keys(constituencies).length} English constituencies\n`);
  }

  // Process each ward and match to constituency
  console.log('Processing wards and matching to constituencies...\n');

  let matched = 0;
  let unmatched = 0;
  const unmatchedWards = [];

  for (const wardFeature of wardsGeoJSON.features) {
    const ward = processWard(wardFeature);
    let foundMatch = false;

    // Try to match ward to constituency
    for (const [filename, constituencyData] of Object.entries(constituencies)) {
      if (!constituencyData.constituency.multiPolygonBoundary) continue;

      // Create geometry object for constituency
      // Constituencies are stored as [lat, lng], convert to [lng, lat] for GeoJSON/spatial operations
      const constituencyGeometry = {
        type: 'MultiPolygon',
        coordinates: constituencyData.constituency.multiPolygonBoundary.map(polygon =>
          polygon.map(ring =>
            ring.map(coord => [coord[1], coord[0]]) // Convert [lat,lng] to [lng,lat]
          )
        )
      };

      if (wardInConstituency(ward._geometry, constituencyGeometry)) {
        // Remove temporary geometry property
        delete ward._geometry;

        // Add ward to this constituency
        constituencyData.wards.push(ward);

        matched++;
        console.log(`✓ ${ward.name} → ${constituencyData.constituency.name}`);

        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      unmatched++;
      unmatchedWards.push(ward.name);
      if (unmatched <= 10) { // Only log first 10
        console.log(`✗ ${ward.name} - no constituency match found`);
      }
    }
  }

  if (unmatched > 10) {
    console.log(`... and ${unmatched - 10} more unmatched wards`);
  }

  console.log('\n=== Regenerating events for real wards ===\n');

  // Regenerate events for constituencies with real wards
  for (const [filename, constituencyData] of Object.entries(constituencies)) {
    if (constituencyData.wards.length > 0) {
      // Generate new events based on real wards
      constituencyData.events = generateEventsForWards(constituencyData.wards);
    }
  }

  console.log('=== Saving updated constituency files ===\n');

  // Save updated constituency files
  let updatedCount = 0;
  let emptyCount = 0;

  for (const [filename, constituencyData] of Object.entries(constituencies)) {
    const filepath = path.join(CONSTITUENCIES_DIR, filename);

    if (constituencyData.wards.length > 0) {
      // Has real wards, save it
      fs.writeFileSync(filepath, JSON.stringify(constituencyData, null, 2));
      updatedCount++;
      console.log(`✓ Updated: ${filename} (${constituencyData.wards.length} wards, ${constituencyData.events.length} events)`);
    } else {
      // No wards matched - this constituency will have empty wards array
      // Still save it to clear out placeholder wards
      fs.writeFileSync(filepath, JSON.stringify(constituencyData, null, 2));
      emptyCount++;
      console.log(`⚠ ${filename} has no matched wards`);
    }
  }

  console.log(`\n=== Processing Complete ===`);
  if (TEST_MODE) {
    console.log(`🧪 TEST MODE - Only ${Object.keys(constituencies).length} constituencies processed`);
  }
  console.log(`Wards matched: ${matched}`);
  console.log(`Wards unmatched: ${unmatched}`);
  console.log(`Constituencies with wards: ${updatedCount}`);
  console.log(`Constituencies without wards: ${emptyCount}`);
  console.log(`Total wards processed: ${wardsGeoJSON.features.length}`);

  if (unmatchedWards.length > 0) {
    console.log(`\nFirst unmatched wards: ${unmatchedWards.slice(0, 5).join(', ')}`);
  }

  if (TEST_MODE) {
    console.log(`\n✅ Test complete! If results look good, run without --test flag to process all constituencies.`);
  }
}

// Run
batchProcessWards().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
