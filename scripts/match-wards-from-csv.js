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
const LSOA_DATA_PATH = process.argv[4]; // Optional: LSOA deprivation data CSV
const LSOA_WARD_MAPPING_PATH = process.argv[5]; // Optional: LSOA to Ward mapping CSV
const LSOA_POPULATION_PATH = process.argv[6]; // Optional: LSOA population/age data CSV

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

// Generate demographics from LSOA data or fall back to mock data
function generateDemographics(wardCode, lsoaData, lsoaPopulationData) {
  // If no LSOA data provided, return mock data
  if (!lsoaData || !lsoaData.wardToLSOAs || !lsoaData.lsoaRankings) {
    return {
      population: 5000 + Math.floor(Math.random() * 10000),
      averageAge: null,
      imdRank: null,
      imdDecile: null,
      incomeRank: null,
      incomeDecile: null,
      employmentRank: null,
      employmentDecile: null,
      educationRank: null,
      educationDecile: null,
      healthRank: null,
      healthDecile: null,
      crimeRank: null,
      crimeDecile: null,
      housingRank: null,
      housingDecile: null,
      environmentRank: null,
      environmentDecile: null
    };
  }

  // Get all LSOAs for this ward
  const lsoasInWard = lsoaData.wardToLSOAs[wardCode] || [];

  if (lsoasInWard.length === 0) {
    // No LSOAs found for this ward, return null values
    return {
      population: 8000, // Estimate
      averageAge: null,
      imdRank: null,
      imdDecile: null,
      incomeRank: null,
      incomeDecile: null,
      employmentRank: null,
      employmentDecile: null,
      educationRank: null,
      educationDecile: null,
      healthRank: null,
      healthDecile: null,
      crimeRank: null,
      crimeDecile: null,
      housingRank: null,
      housingDecile: null,
      environmentRank: null,
      environmentDecile: null
    };
  }

  // Initialize totals for population and age
  let totalPopulation = 0;
  let totalWeightedAge = 0;

  // Calculate average ranks across all LSOAs in this ward
  const averages = {
    imdRank: 0,
    imdDecile: 0,
    incomeRank: 0,
    incomeDecile: 0,
    employmentRank: 0,
    employmentDecile: 0,
    educationRank: 0,
    educationDecile: 0,
    healthRank: 0,
    healthDecile: 0,
    crimeRank: 0,
    crimeDecile: 0,
    housingRank: 0,
    housingDecile: 0,
    environmentRank: 0,
    environmentDecile: 0
  };

  let count = 0;
  for (const lsoaCode of lsoasInWard) {
    const lsoaRanking = lsoaData.lsoaRankings[lsoaCode];
    if (lsoaRanking) {
      averages.imdRank += lsoaRanking.imdRank || 0;
      averages.imdDecile += lsoaRanking.imdDecile || 0;
      averages.incomeRank += lsoaRanking.incomeRank || 0;
      averages.incomeDecile += lsoaRanking.incomeDecile || 0;
      averages.employmentRank += lsoaRanking.employmentRank || 0;
      averages.employmentDecile += lsoaRanking.employmentDecile || 0;
      averages.educationRank += lsoaRanking.educationRank || 0;
      averages.educationDecile += lsoaRanking.educationDecile || 0;
      averages.healthRank += lsoaRanking.healthRank || 0;
      averages.healthDecile += lsoaRanking.healthDecile || 0;
      averages.crimeRank += lsoaRanking.crimeRank || 0;
      averages.crimeDecile += lsoaRanking.crimeDecile || 0;
      averages.housingRank += lsoaRanking.housingRank || 0;
      averages.housingDecile += lsoaRanking.housingDecile || 0;
      averages.environmentRank += lsoaRanking.environmentRank || 0;
      averages.environmentDecile += lsoaRanking.environmentDecile || 0;
      count++;
    }

    // Add population data if available
    if (lsoaPopulationData && lsoaPopulationData[lsoaCode]) {
      const popData = lsoaPopulationData[lsoaCode];
      totalPopulation += popData.population;
      totalWeightedAge += popData.averageAge * popData.population;
    }
  }

  // Calculate averages and round to integers
  if (count > 0) {
    for (const key in averages) {
      averages[key] = Math.round(averages[key] / count);
    }
  }

  // Calculate average age (weighted by population)
  const averageAge = totalPopulation > 0 ? Math.round(totalWeightedAge / totalPopulation) : null;

  return {
    population: totalPopulation > 0 ? totalPopulation : count * 1600, // Use real data or estimate
    averageAge: averageAge,
    lsoaCount: count,
    imdRank: averages.imdRank,
    imdDecile: averages.imdDecile,
    incomeRank: averages.incomeRank,
    incomeDecile: averages.incomeDecile,
    employmentRank: averages.employmentRank,
    employmentDecile: averages.employmentDecile,
    educationRank: averages.educationRank,
    educationDecile: averages.educationDecile,
    healthRank: averages.healthRank,
    healthDecile: averages.healthDecile,
    crimeRank: averages.crimeRank,
    crimeDecile: averages.crimeDecile,
    housingRank: averages.housingRank,
    housingDecile: averages.housingDecile,
    environmentRank: averages.environmentRank,
    environmentDecile: averages.environmentDecile
  };
}

// Load and process LSOA data files
function loadLSOAData() {
  if (!LSOA_DATA_PATH || !LSOA_WARD_MAPPING_PATH) {
    console.log('LSOA data files not provided - using mock demographics\n');
    return null;
  }

  if (!fs.existsSync(LSOA_DATA_PATH)) {
    console.warn(`Warning: LSOA data file not found: ${LSOA_DATA_PATH}`);
    return null;
  }

  if (!fs.existsSync(LSOA_WARD_MAPPING_PATH)) {
    console.warn(`Warning: LSOA-Ward mapping file not found: ${LSOA_WARD_MAPPING_PATH}`);
    return null;
  }

  console.log(`Loading LSOA data from: ${LSOA_DATA_PATH}...`);
  console.log(`Loading LSOA-Ward mapping from: ${LSOA_WARD_MAPPING_PATH}...`);

  // Load LSOA deprivation rankings
  let lsoaContent = fs.readFileSync(LSOA_DATA_PATH, 'utf8');
  if (lsoaContent.charCodeAt(0) === 0xFEFF) {
    lsoaContent = lsoaContent.slice(1);
  }
  const lsoaRecords = parse(lsoaContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${lsoaRecords.length} LSOA records`);

  // Build LSOA rankings map: lsoaCode -> rankings object
  const lsoaRankings = {};
  for (const record of lsoaRecords) {
    const lsoaCode = record['LSOA code (2021)'] || record.LSOA21CD;
    if (lsoaCode) {
      lsoaRankings[lsoaCode] = {
        imdRank: parseInt(record['Index of Multiple Deprivation (IMD) Rank']) || null,
        imdDecile: parseInt(record['Index of Multiple Deprivation (IMD) Decile']) || null,
        incomeRank: parseInt(record['Income Rank']) || null,
        incomeDecile: parseInt(record['Income Decile']) || null,
        employmentRank: parseInt(record['Employment Rank']) || null,
        employmentDecile: parseInt(record['Employment Decile']) || null,
        educationRank: parseInt(record['Education Skills and Training Rank']) || null,
        educationDecile: parseInt(record['Education Skills and Training Decile']) || null,
        healthRank: parseInt(record['Health Deprivation and Disability Rank']) || null,
        healthDecile: parseInt(record['Health Deprivation and Disability Decile']) || null,
        crimeRank: parseInt(record['Crime Rank']) || null,
        crimeDecile: parseInt(record['Crime Decile']) || null,
        housingRank: parseInt(record['Barriers to Housing and Services Rank']) || null,
        housingDecile: parseInt(record['Barriers to Housing and Services Decile']) || null,
        environmentRank: parseInt(record['Living Environment Rank']) || null,
        environmentDecile: parseInt(record['Living Environment Decile']) || null
      };
    }
  }

  // Load LSOA to Ward mapping
  let mappingContent = fs.readFileSync(LSOA_WARD_MAPPING_PATH, 'utf8');
  if (mappingContent.charCodeAt(0) === 0xFEFF) {
    mappingContent = mappingContent.slice(1);
  }
  const mappingRecords = parse(mappingContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${mappingRecords.length} LSOA-Ward mappings`);

  // Build ward to LSOAs map: wardCode -> [lsoaCode1, lsoaCode2, ...]
  const wardToLSOAs = {};
  for (const record of mappingRecords) {
    const lsoaCode = record.LSOA21CD;
    const wardCode = record.WD25CD;

    if (lsoaCode && wardCode) {
      if (!wardToLSOAs[wardCode]) {
        wardToLSOAs[wardCode] = [];
      }
      wardToLSOAs[wardCode].push(lsoaCode);
    }
  }

  console.log(`Mapped ${Object.keys(wardToLSOAs).length} wards to LSOAs\n`);

  return {
    lsoaRankings,
    wardToLSOAs
  };
}

// Load and process LSOA population/age data
function loadLSOAPopulationData() {
  if (!LSOA_POPULATION_PATH) {
    console.log('LSOA population data file not provided - using estimated population\n');
    return null;
  }

  if (!fs.existsSync(LSOA_POPULATION_PATH)) {
    console.warn(`Warning: LSOA population file not found: ${LSOA_POPULATION_PATH}`);
    return null;
  }

  console.log(`Loading LSOA population data from: ${LSOA_POPULATION_PATH}...`);

  // Load LSOA population/age data
  let popContent = fs.readFileSync(LSOA_POPULATION_PATH, 'utf8');
  if (popContent.charCodeAt(0) === 0xFEFF) {
    popContent = popContent.slice(1);
  }
  const popRecords = parse(popContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${popRecords.length} LSOA population records`);

  // Build LSOA population map: lsoaCode -> { population, averageAge }
  const lsoaPopulation = {};
  for (const record of popRecords) {
    const lsoaCode = record['LSOA 2021 Code'];
    // Remove commas from Total field before parsing (e.g., "1,898" -> 1898)
    const total = parseInt((record['Total'] || '').replace(/,/g, '')) || 0;

    if (lsoaCode && total > 0) {
      // Parse age group populations
      const f0to15 = parseInt(record['F0 to 15']) || 0;
      const f16to29 = parseInt(record['F16 to 29']) || 0;
      const f30to44 = parseInt(record['F30 to 44']) || 0;
      const f45to64 = parseInt(record['F45 to 64']) || 0;
      const f65plus = parseInt(record['F65 and over']) || 0;
      const m0to15 = parseInt(record['M0 to 15']) || 0;
      const m16to29 = parseInt(record['M16 to 29']) || 0;
      const m30to44 = parseInt(record['M30 to 44']) || 0;
      const m45to64 = parseInt(record['M45 to 64']) || 0;
      const m65plus = parseInt(record['M65 and over']) || 0;

      // Calculate weighted average age using midpoints of age ranges
      // 0-15: midpoint = 7.5
      // 16-29: midpoint = 22.5
      // 30-44: midpoint = 37
      // 45-64: midpoint = 54.5
      // 65+: estimate = 75
      const weightedAge =
        (f0to15 + m0to15) * 7.5 +
        (f16to29 + m16to29) * 22.5 +
        (f30to44 + m30to44) * 37 +
        (f45to64 + m45to64) * 54.5 +
        (f65plus + m65plus) * 75;

      const averageAge = total > 0 ? Math.round(weightedAge / total) : 0;

      lsoaPopulation[lsoaCode] = {
        population: total,
        averageAge: averageAge
      };
    }
  }

  console.log(`Processed ${Object.keys(lsoaPopulation).length} LSOA population records\n`);

  return lsoaPopulation;
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
    console.error('\nUsage: node match-wards-from-csv.js <ward-constituency-csv> <wards-geojson> [lsoa-data-csv] [lsoa-ward-mapping-csv] [--test]');
    console.error('Example: node match-wards-from-csv.js ./ward-mapping.csv ./Wards_May_2025.geojson');
    console.error('With LSOA data: node match-wards-from-csv.js ./ward-mapping.csv ./Wards_May_2025.geojson ./LSOA_Data.csv ./LSOA_Ward_Mapping.csv');
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

  // Load LSOA deprivation data (optional)
  const lsoaData = loadLSOAData();

  // Load LSOA population/age data (optional)
  const lsoaPopulationData = loadLSOAPopulationData();

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
      demographics: generateDemographics(wardCode, lsoaData, lsoaPopulationData)
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
