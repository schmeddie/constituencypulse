import fs from 'fs';

// Read the converted boundary
const convertedData = JSON.parse(fs.readFileSync('boundary-converted.json', 'utf8'));

// Read the existing bexhill-battle.json
const existingData = JSON.parse(fs.readFileSync('../src/data/bexhill-battle.json', 'utf8'));

// Update constituency with real boundary (as MultiPolygon)
const updatedData = {
  constituency: {
    id: "E14001088",
    name: "Bexhill and Battle",
    center: convertedData.center,
    zoom: convertedData.zoom,
    // Store as MultiPolygon - each polygon is an array of rings, each ring is an array of [lat,lng] points
    multiPolygonBoundary: convertedData.multiPolygonBoundary
  },
  wards: existingData.wards,  // Keep existing wards
  events: existingData.events // Keep existing events
};

// Write updated data
fs.writeFileSync(
  '../src/data/bexhill-battle.json',
  JSON.stringify(updatedData, null, 2)
);

console.log('✓ Updated bexhill-battle.json with real constituency boundary');
console.log(`  Center: [${convertedData.center[0].toFixed(6)}, ${convertedData.center[1].toFixed(6)}]`);
console.log(`  Zoom: ${convertedData.zoom}`);
console.log(`  Polygons: ${convertedData.multiPolygonBoundary.length}`);
console.log(`  Main polygon vertices: ${convertedData.multiPolygonBoundary[2][0].length}`);
