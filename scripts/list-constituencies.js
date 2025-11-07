import fs from 'fs';
import path from 'path';

/**
 * Quick helper to list constituency files and find specific ones
 */

const CONSTITUENCIES_DIR = '../src/data/constituencies';

// Search term from command line
const searchTerm = process.argv[2]?.toLowerCase();

if (!fs.existsSync(CONSTITUENCIES_DIR)) {
  console.error('Constituencies directory not found:', CONSTITUENCIES_DIR);
  console.error('Please run batch-process-constituencies.js first');
  process.exit(1);
}

const files = fs.readdirSync(CONSTITUENCIES_DIR)
  .filter(f => f.endsWith('.json') && f !== 'index.json');

console.log(`Found ${files.length} constituency files\n`);

if (searchTerm) {
  console.log(`Searching for: "${searchTerm}"\n`);

  let found = 0;
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(CONSTITUENCIES_DIR, file), 'utf8'));
    const name = data.constituency.name.toLowerCase();

    if (name.includes(searchTerm)) {
      console.log(`ID: ${data.constituency.id}`);
      console.log(`Name: ${data.constituency.name}`);
      console.log(`File: ${file}`);
      console.log('---');
      found++;
    }
  }

  if (found === 0) {
    console.log('No matches found');
  } else {
    console.log(`\nFound ${found} matches`);
  }
} else {
  // Show first 20 constituencies alphabetically
  console.log('First 20 constituencies (alphabetically):\n');

  const constituencies = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(CONSTITUENCIES_DIR, file), 'utf8'));
    return {
      id: data.constituency.id,
      name: data.constituency.name,
      file: file
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  constituencies.slice(0, 20).forEach(c => {
    console.log(`${c.id} - ${c.name}`);
  });

  console.log(`\n... and ${files.length - 20} more`);
  console.log('\nUsage: node list-constituencies.js [search-term]');
  console.log('Example: node list-constituencies.js "south holland"');
}
