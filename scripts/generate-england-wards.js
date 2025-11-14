/**
 * Generate england-wards.json from existing constituency JSON files
 * This extracts all wards from constituency files and creates a GeoJSON with all England wards
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const constituenciesDir = path.join(__dirname, '../src/data/constituencies');
const publicDataDir = path.join(__dirname, '../public/data');

console.log('=== Generating england-wards.json from constituency files ===\n');

// Create public/data directory if it doesn't exist
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
  console.log('✓ Created public/data directory\n');
}

// Read all constituency JSON files
const files = fs.readdirSync(constituenciesDir)
  .filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} constituency files\n`);

const allWardsFeatures = [];
let totalWards = 0;

// Extract wards from each constituency
for (const file of files) {
  const filePath = path.join(constituenciesDir, file);
  const constituencyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!constituencyData.wards || !Array.isArray(constituencyData.wards)) {
    console.log(`⚠ Skipping ${file} - no wards array`);
    continue;
  }

  const wardCount = constituencyData.wards.length;
  totalWards += wardCount;

  console.log(`Processing ${constituencyData.constituency?.name || file}: ${wardCount} wards`);

  // Convert each ward to a GeoJSON feature
  for (const ward of constituencyData.wards) {
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: ward.boundary ? [ward.boundary] : [[]]
      },
      properties: {
        id: ward.id,
        name: ward.name,
        ...ward.demographics
      }
    };

    allWardsFeatures.push(feature);
  }
}

// Create GeoJSON FeatureCollection
const englandWardsGeoJSON = {
  type: 'FeatureCollection',
  features: allWardsFeatures
};

// Write to public/data/england-wards.json
const outputPath = path.join(publicDataDir, 'england-wards.json');
fs.writeFileSync(outputPath, JSON.stringify(englandWardsGeoJSON, null, 2));

console.log(`\n✓ Generated england-wards.json with ${allWardsFeatures.length} wards`);
console.log(`  File saved to: ${outputPath}`);
console.log(`\nSummary:`);
console.log(`  - Processed ${files.length} constituencies`);
console.log(`  - Total wards: ${totalWards}`);
console.log(`  - Output: ${allWardsFeatures.length} ward features`);
