import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Match wards to constituencies using official ONS CSV mapping
 * This is much faster and more accurate than spatial matching
 */

// Input files
const CSV_PATH = process.argv[2] || './ward-constituency-mapping.csv';
const WARDS_GEOJSON_PATH = process.argv[3] || './wards.geojson';

// Output directory
const CONSTITUENCIES_DIR = '../src/data/constituencies';

// Check for test mode
const TEST_MODE = process.argv.includes('--test');

// Test constituencies by name
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

// Generate mock demographic data
function generateDemographics() {
  return {
    population: 5000 + Math.floor(Math.random() * 10000),
    income: {
      median: 25000 + Math.floor(Math.random() * 30000),
      mean: 30000 + Math.floor(Math.random() * 40000)
    },
    age: {
      under18: Math.floor(Math.random() * 25),
      '18-64': 60 + Math.floor(Math.random() * 15),
      over65: 15 + Math.floor(Math.random() * 20)
    },
    education: {
      noQualifications: Math.floor(Math.random() * 20),
      level4Plus: 25 + Math.floor(Math.random() * 30)
    },
    employment: {
      employed: 65 + Math.floor(Math.random() * 20),
      unemployed: 2 + Math.floor(Math.random() * 8)
    }
  };
}

// Generate events for wards
function generateEventsForWards(wards) {
  const events = [];
  const eventCount = 6 + Math.floor(Math.random() * 4);

  const eventTemplates = [
    { template: 'Community Meeting', category: 'community' },
    { template: 'Public Consultation', category: 'consultation' },
    { template: 'Street Fair', category: 'community' },
    { template: 'Planning Application', category: 'planning' },
    { template: 'Health Clinic', category: 'health' },
    { template: 'Town Hall', category: 'government' },
    { template: 'Road Works', category: 'infrastructure' },
    { template: 'Park Renovation', category: 'infrastructure' }
  ];

  for (let i = 0; i < eventCount; i++) {
    const ward = wards[Math.floor(Math.random() * wards.length)];
    const { template, category } = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];

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

// Calculate center point of a polygon
function calculateCenter(coordinates) {
  let sumLat = 0, sumLng = 0, count = 0;

  function addCoords(coords) {
    if (Array.isArray(coords[0][0])) {
      coords.forEach(ring => addCoords(ring));
    } else {
      coords.forEach(([lng, lat]) => {
        sumLng += lng;
        sumLat += lat;
        count++;
      });
    }
  }

  addCoords(coordinates);

  return [sumLat / count, sumLng / count]; // [lat, lng]
}

// Main processing function
async function matchWardsFromCSV() {
  console.log('=== Ward-Constituency Matcher (CSV-based) ===\n');

  // Check if CSV exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: CSV file not found: ${CSV_PATH}`);
    console.error('\nUsage: node match-wards-from-csv.js <csv-path> <wards-geojson-path> [--test]');
    console.error('Example: node match-wards-from-csv.js ./ward-mapping.csv ./Wards_December_2024.geojson');
    process.exit(1);
  }

  // Check if wards GeoJSON exists
  if (!fs.existsSync(WARDS_GEOJSON_PATH)) {
    console.error(`Error: Wards GeoJSON not found: ${WARDS_GEOJSON_PATH}`);
    process.exit(1);
  }

  // Check if constituencies directory exists
  if (!fs.existsSync(CONSTITUENCIES_DIR)) {
    console.error(`Error: Constituencies directory not found: ${CONSTITUENCIES_DIR}`);
    console.error('Please run batch-process-constituencies.js first');
    process.exit(1);
  }

  // Load and parse CSV (may be tab-delimited or comma-delimited)
  console.log(`Loading CSV: ${CSV_PATH}...`);
  let csvContent = fs.readFileSync(CSV_PATH, 'utf8');

  // Remove BOM if present (common in Excel-saved UTF-8 CSV files)
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
    console.log('Removed UTF-8 BOM from CSV');
  }

  // Detect delimiter (tab or comma)
  const firstLine = csvContent.split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  console.log(`Detected delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'}`);

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: delimiter,
    trim: true,
    bom: true  // Also tell csv-parse to handle BOM
  });

  console.log(`Found ${records.length} ward-constituency mappings`);

  // Debug: Show what columns were actually parsed
  if (records.length > 0) {
    const columns = Object.keys(records[0]);
    console.log(`CSV columns found: ${columns.join(', ')}`);
    console.log(`First record sample:`, records[0]);
    console.log();
  }

  // Build mapping: wardCode -> [constituencyCode1, constituencyCode2, ...]
  // Some wards span multiple constituencies
  const wardToConstituencies = {};
  for (const record of records) {
    const wardCode = record.WD25CD || record.WD24CD || record.WD23CD; // Try 2025, 2024, and 2023
    const constituencyCode = record.PCON24CD || record.PCON23CD; // Try 2024 and 2023

    if (wardCode && constituencyCode) {
      if (!wardToConstituencies[wardCode]) {
        wardToConstituencies[wardCode] = [];
      }
      if (!wardToConstituencies[wardCode].includes(constituencyCode)) {
        wardToConstituencies[wardCode].push(constituencyCode);
      }
    }
  }

  console.log(`Unique wards in CSV: ${Object.keys(wardToConstituencies).length}`);

  // Show first 10 ward codes from CSV for debugging
  const csvWardCodes = Object.keys(wardToConstituencies).slice(0, 10);
  console.log(`First 10 ward codes in CSV: ${csvWardCodes.join(', ')}\n`);

  // Load wards GeoJSON
  console.log(`Loading wards: ${WARDS_GEOJSON_PATH}...`);
  const wardsGeoJSON = JSON.parse(fs.readFileSync(WARDS_GEOJSON_PATH, 'utf8'));
  console.log(`Found ${wardsGeoJSON.features.length} wards`);

  // Show sample ward properties for debugging
  if (wardsGeoJSON.features.length > 0) {
    const sampleProps = wardsGeoJSON.features[0].properties;
    console.log(`Sample ward properties:`, Object.keys(sampleProps).join(', '));
    console.log(`Sample ward code fields: WD25CD=${sampleProps.WD25CD}, WD24CD=${sampleProps.WD24CD}, WD23CD=${sampleProps.WD23CD}, reference=${sampleProps.reference}, entity=${sampleProps.entity}`);

    // Show first 10 ward codes from GeoJSON
    const geojsonWardCodes = wardsGeoJSON.features.slice(0, 10).map(f =>
      f.properties.WD25CD || f.properties.WD24CD || f.properties.WD23CD || f.properties.reference || f.properties.entity
    );
    console.log(`First 10 ward codes in GeoJSON: ${geojsonWardCodes.join(', ')}\n`);
  }

  // Load constituency files
  let constituencyFiles = fs.readdirSync(CONSTITUENCIES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json' && f.startsWith('E14'));

  console.log(`Found ${constituencyFiles.length} English constituency files\n`);

  // Load and prepare constituencies
  const constituencies = {};
  for (const file of constituencyFiles) {
    const data = JSON.parse(
      fs.readFileSync(path.join(CONSTITUENCIES_DIR, file), 'utf8')
    );

    // Clear existing wards
    data.wards = [];

    // In test mode, only include test constituencies
    if (TEST_MODE) {
      if (TEST_CONSTITUENCY_NAMES.includes(data.constituency.name)) {
        constituencies[data.constituency.id] = { file, data };
      }
    } else {
      constituencies[data.constituency.id] = { file, data };
    }
  }

  if (TEST_MODE) {
    console.log(`\n🧪 TEST MODE: Processing only ${Object.keys(constituencies).length} constituencies:`);
    Object.values(constituencies).forEach(c => console.log(`  - ${c.data.constituency.name}`));
    console.log();
  }

  // Match wards to constituencies
  console.log('Matching wards to constituencies...\n');

  let matched = 0;
  let unmatched = 0;
  const unmatchedWards = [];

  for (const wardFeature of wardsGeoJSON.features) {
    // Try multiple possible property names for ward code
    const wardCode = wardFeature.properties.WD25CD ||
                     wardFeature.properties.WD24CD ||
                     wardFeature.properties.WD23CD ||
                     wardFeature.properties.reference ||
                     wardFeature.properties.entity;

    // Try multiple possible property names for ward name
    const wardName = wardFeature.properties.WD25NM ||
                     wardFeature.properties.WD24NM ||
                     wardFeature.properties.WD23NM ||
                     wardFeature.properties.name;

    if (!wardCode) {
      console.log(`⚠ Ward has no code: ${wardName || 'Unknown'}`);
      unmatched++;
      unmatchedWards.push(wardName || 'Unknown');
      continue;
    }

    // Look up which constituency/constituencies this ward belongs to
    const constituencyCodes = wardToConstituencies[wardCode];

    if (!constituencyCodes || constituencyCodes.length === 0) {
      unmatched++;
      unmatchedWards.push(wardName);
      if (unmatched <= 10) {
        console.log(`✗ ${wardName} (${wardCode}) - not in CSV mapping`);
      }
      continue;
    }

    // Create ward object - handle both Polygon and MultiPolygon
    let boundary;
    let center;
    let multiPolygonBoundary = null; // Store all polygons for MultiPolygon wards

    const geomType = wardFeature.geometry.type;

    if (geomType === 'Polygon') {
      // Polygon: coordinates[0] is the outer ring
      boundary = wardFeature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      center = calculateCenter(wardFeature.geometry.coordinates);
    } else if (geomType === 'MultiPolygon') {
      // MultiPolygon: Store ALL polygons (main area + islands/exclaves)
      multiPolygonBoundary = wardFeature.geometry.coordinates.map(polygon =>
        polygon.map(ring =>
          ring.map(([lng, lat]) => [lat, lng])
        )
      );

      // Find the largest polygon for the main boundary (backward compatibility)
      let largestPolygon = wardFeature.geometry.coordinates[0][0];
      let maxPoints = largestPolygon.length;

      for (const polygon of wardFeature.geometry.coordinates) {
        const outerRing = polygon[0];
        if (outerRing.length > maxPoints) {
          largestPolygon = outerRing;
          maxPoints = outerRing.length;
        }
      }

      boundary = largestPolygon.map(([lng, lat]) => [lat, lng]);
      // Calculate center from all polygons
      const allCoords = wardFeature.geometry.coordinates.flatMap(polygon => polygon[0]);
      center = calculateCenter([allCoords]);
    } else {
      console.warn(`⚠ Ward ${wardName} has unsupported geometry type: ${geomType}`);
      unmatched++;
      unmatchedWards.push(wardName);
      continue;
    }

    const ward = {
      id: wardCode,
      name: wardName,
      boundary: boundary,
      center: center,
      demographics: generateDemographics()
    };

    // Add multiPolygonBoundary if it's a MultiPolygon ward
    if (multiPolygonBoundary) {
      ward.multiPolygonBoundary = multiPolygonBoundary;
    }

    // Add ward to each constituency it belongs to
    let addedToAny = false;
    for (const constituencyCode of constituencyCodes) {
      if (constituencies[constituencyCode]) {
        constituencies[constituencyCode].data.wards.push(ward);
        console.log(`✓ ${wardName} → ${constituencies[constituencyCode].data.constituency.name}`);
        addedToAny = true;
      }
    }

    if (addedToAny) {
      matched++;
    } else {
      // Ward is in CSV but constituency not in our dataset (probably Scottish/Welsh)
      unmatched++;
      unmatchedWards.push(wardName);
    }
  }

  if (unmatched > 10) {
    console.log(`... and ${unmatched - 10} more unmatched wards`);
  }

  console.log('\n=== Regenerating events for real wards ===\n');

  // Regenerate events for constituencies with wards
  for (const constituency of Object.values(constituencies)) {
    if (constituency.data.wards.length > 0) {
      constituency.data.events = generateEventsForWards(constituency.data.wards);
    }
  }

  console.log('=== Saving updated constituency files ===\n');

  // Save updated files
  let updatedCount = 0;
  let emptyCount = 0;

  for (const constituency of Object.values(constituencies)) {
    const filepath = path.join(CONSTITUENCIES_DIR, constituency.file);

    if (constituency.data.wards.length > 0) {
      fs.writeFileSync(filepath, JSON.stringify(constituency.data, null, 2));
      updatedCount++;
      console.log(`✓ Updated: ${constituency.file} (${constituency.data.wards.length} wards, ${constituency.data.events.length} events)`);
    } else {
      fs.writeFileSync(filepath, JSON.stringify(constituency.data, null, 2));
      emptyCount++;
      console.log(`⚠ ${constituency.file} has no matched wards`);
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
    console.log(`\nFirst unmatched wards: ${unmatchedWards.slice(0, 10).join(', ')}`);
  }

  if (TEST_MODE) {
    console.log(`\n✅ Test complete! If results look good, run without --test flag to process all constituencies.`);
  }
}

// Run
matchWardsFromCSV().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
