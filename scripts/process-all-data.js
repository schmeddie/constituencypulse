import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auto-detect and process census data files
 * Looks for specifically-named CSV files in scripts/data/ folder
 */

// Check for test mode
const TEST_MODE = process.argv.includes('--test');

// Data folder path
const DATA_FOLDER = path.join(__dirname, 'data');

// Expected file names and their descriptions
const EXPECTED_FILES = {
  required: {
    'ward-constituency-mapping.csv': 'Ward-Constituency mapping',
    'wards.geojson': 'Ward boundaries'
  },
  optional: {
    'lsoa-deprivation.csv': 'LSOA Deprivation indices',
    'lsoa-ward-mapping.csv': 'LSOA-Ward mapping',
    'lsoa-population.csv': 'LSOA Population & age',
    'lsoa-ethnicity.csv': 'LSOA Ethnicity data',
    'lsoa-economic-activity.csv': 'LSOA Economic activity',
    'lsoa-country-of-birth.csv': 'LSOA Country of birth',
    'lsoa-religion.csv': 'LSOA Religion',
    'lsoa-housing.csv': 'LSOA Housing tenure',
    'lsoa-qualifications.csv': 'LSOA Qualifications'
  }
};

// Check if data folder exists
function ensureDataFolder() {
  if (!fs.existsSync(DATA_FOLDER)) {
    console.log('📁 Creating data folder...');
    fs.mkdirSync(DATA_FOLDER, { recursive: true });

    // Create README if it doesn't exist
    const readmePath = path.join(DATA_FOLDER, 'README.md');
    if (!fs.existsSync(readmePath)) {
      console.log('📝 Data folder created. Please read scripts/data/README.md for instructions.');
      console.log('\nYou need to add your CSV files to scripts/data/ folder first.');
      process.exit(1);
    }
  }
}

// Ensure constituencies output directory exists
function ensureConstituenciesDir() {
  const constituenciesDir = path.join(__dirname, '..', 'src', 'data', 'constituencies');

  if (!fs.existsSync(constituenciesDir)) {
    console.log('📁 Creating constituencies directory...');
    fs.mkdirSync(constituenciesDir, { recursive: true });
    console.log('✅ Created: src/data/constituencies/\n');
  }

  return constituenciesDir;
}

// Auto-detect available files
function detectFiles() {
  console.log('🔍 Detecting available data files...\n');

  const detected = {
    required: {},
    optional: {}
  };

  // Check required files
  console.log('📋 Required files:');
  for (const [filename, description] of Object.entries(EXPECTED_FILES.required)) {
    const filepath = path.join(DATA_FOLDER, filename);
    const exists = fs.existsSync(filepath);
    detected.required[filename] = exists ? filepath : null;

    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${description} (${filename})`);
  }

  // Check optional files
  console.log('\n📊 Optional files:');
  for (const [filename, description] of Object.entries(EXPECTED_FILES.optional)) {
    const filepath = path.join(DATA_FOLDER, filename);
    const exists = fs.existsSync(filepath);
    detected.optional[filename] = exists ? filepath : null;

    const status = exists ? '✅' : '⚠️  SKIP';
    console.log(`  ${status} ${description} (${filename})`);
  }

  console.log();
  return detected;
}

// Validate that required files are present
function validateRequired(detected) {
  const missing = [];

  for (const [filename, filepath] of Object.entries(detected.required)) {
    if (!filepath) {
      missing.push(filename);
    }
  }

  if (missing.length > 0) {
    console.error('❌ ERROR: Missing required files:');
    missing.forEach(f => console.error(`   - ${f}`));
    console.error('\nPlease add these files to scripts/data/ folder.');
    console.error('See scripts/data/README.md for more information.\n');
    return false;
  }

  return true;
}

// Build command arguments for match-wards-from-csv.js
function buildArguments(detected) {
  const args = [];

  // Required arguments
  args.push(detected.required['ward-constituency-mapping.csv']);
  args.push(detected.required['wards.geojson']);

  // Optional arguments (in specific order expected by the script)
  args.push(detected.optional['lsoa-deprivation.csv'] || '');
  args.push(detected.optional['lsoa-ward-mapping.csv'] || '');
  args.push(detected.optional['lsoa-population.csv'] || '');
  args.push(detected.optional['lsoa-ethnicity.csv'] || '');
  args.push(detected.optional['lsoa-economic-activity.csv'] || '');
  args.push(detected.optional['lsoa-country-of-birth.csv'] || '');
  args.push(detected.optional['lsoa-religion.csv'] || '');
  args.push(detected.optional['lsoa-housing.csv'] || '');
  args.push(detected.optional['lsoa-qualifications.csv'] || '');

  // Add test mode flag if requested
  if (TEST_MODE) {
    args.push('--test');
  }

  // Filter out empty strings (missing optional files)
  return args.filter(arg => arg !== '');
}

// Run the data processing script
function runProcessor(args) {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting data processing...\n');

    if (TEST_MODE) {
      console.log('🧪 TEST MODE: Processing only 10 sample constituencies\n');
    }

    const scriptPath = path.join(__dirname, 'match-wards-from-csv.js');

    // Spawn the processing script
    const child = spawn('node', [scriptPath, ...args], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Processing failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Constituency Pulse - Data Setup');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Ensure data folder exists
    ensureDataFolder();

    // Ensure constituencies directory exists
    ensureConstituenciesDir();

    // Detect available files
    const detected = detectFiles();

    // Validate required files
    if (!validateRequired(detected)) {
      process.exit(1);
    }

    // Build command arguments
    const args = buildArguments(detected);

    // Show what will be processed
    const optionalCount = Object.values(detected.optional).filter(v => v !== null).length;
    console.log(`📊 Will process ${optionalCount} optional datasets\n`);

    // Run the processor
    await runProcessor(args);

    // Success message
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ Data processing complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nConstituency data has been generated in:');
    console.log('  src/data/constituencies/\n');

    if (TEST_MODE) {
      console.log('🧪 Test mode complete. Review the results, then run:');
      console.log('   npm run setup');
      console.log('   to process all constituencies.\n');
    } else {
      console.log('You can now start the development server:');
      console.log('  npm run dev\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
main();
