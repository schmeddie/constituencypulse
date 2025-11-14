/**
 * Calculate 2025 ward-level election predictions
 *
 * Uses:
 * - 2024 ward election results (baseline)
 * - 2025 constituency polling (shift direction)
 * - Ward demographics (susceptibility to shifts)
 * - Demographic weights (how demographics affect voting)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculate demographic similarity score between two wards
 * Returns 0-100, where 100 = identical demographics
 */
function calculateDemographicSimilarity(ward1Demographics, ward2Demographics) {
  const demographicFields = [
    { field: 'averageAge', weight: 2.0, scale: 100 },
    { field: 'imdDecile', weight: 1.5, scale: 10 },
    { field: 'whitePercent', weight: 1.8, scale: 100 },
    { field: 'asianPercent', weight: 1.2, scale: 100 },
    { field: 'blackPercent', weight: 1.2, scale: 100 },
    { field: 'level4PlusPercent', weight: 2.0, scale: 100 },
    { field: 'noQualificationsPercent', weight: 1.8, scale: 100 },
    { field: 'ownedOutrightPercent', weight: 1.5, scale: 100 },
    { field: 'socialRentedPercent', weight: 1.5, scale: 100 },
    { field: 'employedPercent', weight: 1.0, scale: 100 },
    { field: 'unemployedPercent', weight: 1.2, scale: 100 },
    { field: 'retiredPercent', weight: 1.0, scale: 100 }
  ];

  let totalWeightedDifference = 0;
  let totalWeight = 0;

  for (const { field, weight, scale } of demographicFields) {
    const val1 = ward1Demographics[field];
    const val2 = ward2Demographics[field];

    if (val1 !== null && val1 !== undefined &&
        val2 !== null && val2 !== undefined) {
      // Normalize difference to 0-1 range
      const normalizedDiff = Math.abs(val1 - val2) / scale;
      totalWeightedDifference += normalizedDiff * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  // Convert to similarity score (0-100)
  const avgDifference = totalWeightedDifference / totalWeight;
  const similarity = Math.max(0, (1 - avgDifference) * 100);

  return similarity;
}

/**
 * Find the N most similar wards that have 2024 election data
 */
function findSimilarWardsWithData(targetWard, allWardsWithData, n = 5) {
  const similarities = allWardsWithData.map(wardWithData => ({
    ward: wardWithData,
    similarity: calculateDemographicSimilarity(
      targetWard.demographics,
      wardWithData.demographics
    )
  }));

  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top N
  return similarities.slice(0, n);
}

/**
 * Calculate average 2024 results from similar wards
 */
function averageResultsFromSimilarWards(similarWards, wardResults2024Map) {
  const weightedTotals = {
    labour: 0,
    conservative: 0,
    libdem: 0,
    green: 0,
    reform: 0,
    independent: 0
  };

  let totalWeight = 0;

  for (const { ward, similarity } of similarWards) {
    // Try matching by ID first, then by name
    const result2024 = wardResults2024Map[ward.id] || wardResults2024Map[ward.name];
    if (result2024) {
      // Weight by similarity (higher similarity = more influence)
      const weight = similarity / 100;

      Object.keys(weightedTotals).forEach(party => {
        weightedTotals[party] += (result2024[party] || 0) * weight;
      });

      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return null;

  // Calculate weighted average
  const averageResults = {};
  Object.keys(weightedTotals).forEach(party => {
    averageResults[party] = weightedTotals[party] / totalWeight;
  });

  return averageResults;
}

console.log('\n=== Calculating 2025 Ward Predictions ===\n');

// Load demographic weights
const weightsPath = path.join(__dirname, 'data', 'demographic-weights.json');
if (!fs.existsSync(weightsPath)) {
  console.error('❌ demographic-weights.json not found');
  process.exit(1);
}
const { weights: demographicWeights } = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
console.log('✓ Loaded demographic weights\n');

// Load 2024 ward results
const wardResults2024Path = path.join(__dirname, 'data', 'ward-election-results-2024.csv');
if (!fs.existsSync(wardResults2024Path)) {
  console.log('⚠ ward-election-results-2024.csv not found - skipping predictions');
  process.exit(0);
}

const wardResults2024CSV = fs.readFileSync(wardResults2024Path, 'utf8');
const wardResults2024 = parse(wardResults2024CSV, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true
});
console.log(`✓ Loaded ${wardResults2024.length} ward results from 2024\n`);

// Load 2025 constituency polling
const constituencyPolling2025Path = path.join(__dirname, 'data', 'constituency-polling-2025.csv');
if (!fs.existsSync(constituencyPolling2025Path)) {
  console.log('⚠ constituency-polling-2025.csv not found - skipping predictions');
  process.exit(0);
}

const constituencyPolling2025CSV = fs.readFileSync(constituencyPolling2025Path, 'utf8');
const constituencyPolling2025 = parse(constituencyPolling2025CSV, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,
  from_line: 2  // Skip the title row
});
console.log(`✓ Loaded polling for ${constituencyPolling2025.length} constituencies\n`);

// Create lookup maps - index by BOTH ward code AND ward name for flexibility
const wardResults2024Map = {};
wardResults2024.forEach(row => {
  const wardCode = row['Ward code']?.trim();
  const wardName = row['Ward name']?.trim();

  const result = {
    labour: parseFloat(row['LAB']) || 0,
    conservative: parseFloat(row['CON']) || 0,
    libdem: parseFloat(row['LD']) || 0,
    green: parseFloat(row['GREEN']) || 0,
    reform: parseFloat(row['REF']) || 0,
    independent: parseFloat(row['IND']) || 0
  };

  // Index by ward code (ONS code)
  if (wardCode) {
    wardResults2024Map[wardCode] = result;
  }

  // Also index by ward name (for matching when codes don't align)
  if (wardName) {
    wardResults2024Map[wardName] = result;
  }
});

const constituencyPolling2025Map = {};
constituencyPolling2025.forEach(row => {
  const name = row['Seat Name']?.trim();
  if (name) {
    constituencyPolling2025Map[name] = {
      labour: parseFloat(row['LAB']?.replace('%', '')) || 0,
      conservative: parseFloat(row['CON']?.replace('%', '')) || 0,
      libdem: parseFloat(row['LIB']?.replace('%', '')) || 0,
      green: parseFloat(row['Green']?.replace('%', '')) || 0,
      reform: parseFloat(row['Reform']?.replace('%', '')) || 0
    };
  }
});

/**
 * Calculate demographic susceptibility score for a party
 */
function calculateSusceptibility(wardDemographics, constituencyAvgDemographics, party) {
  const weights = demographicWeights[party];
  if (!weights) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  for (const [demographic, weight] of Object.entries(weights)) {
    const wardValue = wardDemographics[demographic];
    const avgValue = constituencyAvgDemographics[demographic];

    if (wardValue !== null && wardValue !== undefined &&
        avgValue !== null && avgValue !== undefined) {
      const deviation = wardValue - avgValue;
      const contribution = deviation * weight;

      totalScore += contribution;
      totalWeight += Math.abs(weight);
    }
  }

  // Normalize to 0-1 range, with 0.5 being neutral
  if (totalWeight === 0) return 0.5;

  const normalizedScore = 0.5 + (totalScore / (totalWeight * 100));
  return Math.max(0, Math.min(1, normalizedScore));
}

/**
 * Calculate constituency average demographics
 */
function calculateConstituencyAverages(wards) {
  const demographics = {};
  const counts = {};

  const demographicFields = [
    'averageAge', 'imdDecile',
    'asianPercent', 'blackPercent', 'mixedPercent', 'whitePercent',
    'employedPercent', 'selfEmployedPercent', 'unemployedPercent',
    'studentPercent', 'retiredPercent',
    'ukBornPercent', 'euBornPercent', 'nonEuBornPercent',
    'christianPercent', 'muslimPercent', 'hinduPercent', 'sikhPercent',
    'jewishPercent', 'noReligionPercent',
    'ownedOutrightPercent', 'ownedMortgagePercent',
    'socialRentedPercent', 'privateRentedPercent',
    'noQualificationsPercent', 'level1to3Percent',
    'level4PlusPercent', 'apprenticeshipPercent'
  ];

  wards.forEach(ward => {
    demographicFields.forEach(field => {
      const value = ward.demographics[field];
      if (value !== null && value !== undefined) {
        demographics[field] = (demographics[field] || 0) + value;
        counts[field] = (counts[field] || 0) + 1;
      }
    });
  });

  const averages = {};
  Object.keys(demographics).forEach(field => {
    averages[field] = demographics[field] / counts[field];
  });

  return averages;
}

/**
 * Calculate 2024 constituency aggregate from ward results
 */
function calculate2024ConstituencyAggregate(wards, wardResults2024Map) {
  let totalVotes = 0;
  const partyTotals = {
    labour: 0,
    conservative: 0,
    libdem: 0,
    green: 0,
    reform: 0,
    independent: 0
  };

  let wardsWithData = 0;
  wards.forEach(ward => {
    // Try matching by ID first, then by name
    const wardResult = wardResults2024Map[ward.id] || wardResults2024Map[ward.name];
    if (wardResult) {
      const wardTotal = Object.values(wardResult).reduce((sum, v) => sum + v, 0);
      if (wardTotal > 0) {
        totalVotes += wardTotal;
        Object.keys(partyTotals).forEach(party => {
          partyTotals[party] += wardResult[party] || 0;
        });
        wardsWithData++;
      }
    }
  });

  if (totalVotes === 0 || wardsWithData === 0) return null;

  const percentages = {};
  Object.keys(partyTotals).forEach(party => {
    percentages[party] = (partyTotals[party] / totalVotes) * 100;
  });

  return percentages;
}

/**
 * Process predictions for a constituency
 */
function processPredictions(constituencyData, wardResults2024Map, constituencyPolling2025Map, allWardsWithData) {
  const constituencyName = constituencyData.constituency.name;

  // Find polling data
  const polling2025 = constituencyPolling2025Map[constituencyName];
  if (!polling2025) {
    console.log(`  ⚠ No 2025 polling found for ${constituencyName}`);
    return false;
  }

  // Calculate 2024 constituency aggregate
  const aggregate2024 = calculate2024ConstituencyAggregate(
    constituencyData.wards,
    wardResults2024Map
  );

  if (!aggregate2024) {
    console.log(`  ⚠ Insufficient 2024 ward data for ${constituencyName}`);
    return false;
  }

  // Calculate shifts
  const shifts = {
    labour: polling2025.labour - aggregate2024.labour,
    conservative: polling2025.conservative - aggregate2024.conservative,
    libdem: polling2025.libdem - aggregate2024.libdem,
    green: polling2025.green - aggregate2024.green,
    reform: polling2025.reform - aggregate2024.reform
  };

  console.log(`  ${constituencyName}:`);
  console.log(`    2024: Lab ${aggregate2024.labour.toFixed(1)}%, Con ${aggregate2024.conservative.toFixed(1)}%, LD ${aggregate2024.libdem.toFixed(1)}%, Reform ${aggregate2024.reform.toFixed(1)}%`);
  console.log(`    2025: Lab ${polling2025.labour}%, Con ${polling2025.conservative}%, LD ${polling2025.libdem}%, Reform ${polling2025.reform}%`);
  console.log(`    Shifts: Lab ${shifts.labour > 0 ? '+' : ''}${shifts.labour.toFixed(1)}pp, Con ${shifts.conservative > 0 ? '+' : ''}${shifts.conservative.toFixed(1)}pp, Reform ${shifts.reform > 0 ? '+' : ''}${shifts.reform.toFixed(1)}pp`);

  // Calculate constituency demographic averages
  const constituencyAvgDemographics = calculateConstituencyAverages(constituencyData.wards);

  // Process each ward
  let wardsProcessed = 0;
  let wardsWithActualData = 0;
  let wardsWithSimilarData = 0;
  let wardsWithConstituencyAvg = 0;

  constituencyData.wards.forEach(ward => {
    // Try matching by ID first, then by name
    const wardResult2024 = wardResults2024Map[ward.id] || wardResults2024Map[ward.name];
    let baseline2024;
    let dataSource;
    let similarWardsInfo = null;
    let baseConfidence;

    if (wardResult2024) {
      // Ward has actual 2024 data - HIGH confidence
      baseline2024 = wardResult2024;
      dataSource = 'actual';
      baseConfidence = 90;
      wardsWithActualData++;
    } else {
      // Ward missing 2024 data - try to find similar wards
      const similarWards = findSimilarWardsWithData(ward, allWardsWithData, 5);

      if (similarWards && similarWards.length > 0 && similarWards[0].similarity > 30) {
        // Use similar wards' average - MEDIUM confidence
        baseline2024 = averageResultsFromSimilarWards(similarWards, wardResults2024Map);

        if (baseline2024) {
          dataSource = 'similar';
          baseConfidence = Math.min(70, 40 + (similarWards[0].similarity / 3)); // 30-70% based on similarity
          wardsWithSimilarData++;

          // Store similarity info for transparency
          similarWardsInfo = similarWards.slice(0, 3).map(sw => ({
            name: sw.ward.name,
            constituency: sw.ward.constituency,
            similarity: Math.round(sw.similarity)
          }));
        } else {
          // Fallback to constituency average
          baseline2024 = {
            labour: aggregate2024.labour,
            conservative: aggregate2024.conservative,
            libdem: aggregate2024.libdem,
            green: aggregate2024.green,
            reform: aggregate2024.reform,
            independent: aggregate2024.independent || 0
          };
          dataSource = 'constituency_avg';
          baseConfidence = 30;
          wardsWithConstituencyAvg++;
        }
      } else {
        // No similar wards found - use constituency average - LOW confidence
        baseline2024 = {
          labour: aggregate2024.labour,
          conservative: aggregate2024.conservative,
          libdem: aggregate2024.libdem,
          green: aggregate2024.green,
          reform: aggregate2024.reform,
          independent: aggregate2024.independent || 0
        };
        dataSource = 'constituency_avg';
        baseConfidence = 30;
        wardsWithConstituencyAvg++;
      }
    }

    // Calculate susceptibility scores
    const susceptibility = {};
    ['Labour', 'Conservative', 'Liberal Democrat', 'Green', 'Reform'].forEach(party => {
      susceptibility[party] = calculateSusceptibility(
        ward.demographics,
        constituencyAvgDemographics,
        party
      );
    });

    // Apply shifts proportionally based on susceptibility
    const predicted2025 = {
      labour: baseline2024.labour + (shifts.labour * susceptibility['Labour']),
      conservative: baseline2024.conservative + (shifts.conservative * susceptibility['Conservative']),
      libdem: baseline2024.libdem + (shifts.libdem * susceptibility['Liberal Democrat']),
      green: baseline2024.green + (shifts.green * susceptibility['Green']),
      reform: baseline2024.reform + (shifts.reform * susceptibility['Reform']),
      independent: baseline2024.independent // Keep unchanged
    };

    // Ensure no negative values
    Object.keys(predicted2025).forEach(party => {
      predicted2025[party] = Math.max(0, predicted2025[party]);
    });

    // Normalize to 100%
    const total = Object.values(predicted2025).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      Object.keys(predicted2025).forEach(party => {
        predicted2025[party] = (predicted2025[party] / total) * 100;
      });
    }

    // Determine winner
    let winner = 'labour';
    let maxVote = predicted2025.labour;
    Object.entries(predicted2025).forEach(([party, vote]) => {
      if (vote > maxVote) {
        maxVote = vote;
        winner = party;
      }
    });

    // Calculate confidence based on winner margin AND data quality
    const sortedVotes = Object.values(predicted2025).sort((a, b) => b - a);
    const margin = sortedVotes[0] - sortedVotes[1];
    const marginConfidence = Math.min(100, Math.round((margin / 20) * 100)); // 20pp margin = 100%

    // Combine base confidence (data quality) with margin confidence
    const confidence = Math.round((baseConfidence * 0.6) + (marginConfidence * 0.4));

    // Store prediction in ward demographics
    const prediction = {
      labour: parseFloat(predicted2025.labour.toFixed(1)),
      conservative: parseFloat(predicted2025.conservative.toFixed(1)),
      libdem: parseFloat(predicted2025.libdem.toFixed(1)),
      green: parseFloat(predicted2025.green.toFixed(1)),
      reform: parseFloat(predicted2025.reform.toFixed(1)),
      independent: parseFloat(predicted2025.independent.toFixed(1)),
      winner: winner,
      confidence: confidence,
      dataSource: dataSource,
      keyFactors: getKeyFactors(ward.demographics, constituencyAvgDemographics, susceptibility)
    };

    // Add similar wards info if applicable
    if (similarWardsInfo) {
      prediction.similarWards = similarWardsInfo;
    }

    ward.demographics.predicted2025 = prediction;

    wardsProcessed++;
  });

  console.log(`    ✓ Processed ${wardsProcessed} wards:`);
  console.log(`      ${wardsWithActualData} with actual 2024 data (high confidence)`);
  console.log(`      ${wardsWithSimilarData} with similar ward data (medium confidence)`);
  console.log(`      ${wardsWithConstituencyAvg} with constituency average (low confidence)\n`);
  return true;
}

/**
 * Identify key demographic factors influencing the prediction
 */
function getKeyFactors(wardDemographics, constituencyAvgDemographics, susceptibility) {
  const factors = [];

  // Age
  const ageDiff = wardDemographics.averageAge - constituencyAvgDemographics.averageAge;
  if (Math.abs(ageDiff) > 5) {
    factors.push(ageDiff > 0 ? `+${ageDiff.toFixed(0)} years older` : `${Math.abs(ageDiff).toFixed(0)} years younger`);
  }

  // Education
  const degreeDiff = wardDemographics.level4PlusPercent - constituencyAvgDemographics.level4PlusPercent;
  if (Math.abs(degreeDiff) > 10) {
    factors.push(degreeDiff > 0 ? `+${degreeDiff.toFixed(0)}% degree holders` : `${Math.abs(degreeDiff).toFixed(0)}% fewer degrees`);
  }

  const noQualsDiff = wardDemographics.noQualificationsPercent - constituencyAvgDemographics.noQualificationsPercent;
  if (Math.abs(noQualsDiff) > 10) {
    factors.push(noQualsDiff > 0 ? `+${noQualsDiff.toFixed(0)}% no qualifications` : `${Math.abs(noQualsDiff).toFixed(0)}% fewer unqualified`);
  }

  // Ethnicity
  const whiteDiff = wardDemographics.whitePercent - constituencyAvgDemographics.whitePercent;
  if (Math.abs(whiteDiff) > 10) {
    factors.push(whiteDiff > 0 ? `+${whiteDiff.toFixed(0)}% white` : `${Math.abs(whiteDiff).toFixed(0)}% less white`);
  }

  // Housing
  const ownedDiff = wardDemographics.ownedOutrightPercent - constituencyAvgDemographics.ownedOutrightPercent;
  if (Math.abs(ownedDiff) > 10) {
    factors.push(ownedDiff > 0 ? `+${ownedDiff.toFixed(0)}% homeowners` : `${Math.abs(ownedDiff).toFixed(0)}% fewer owners`);
  }

  // Deprivation
  const imdDiff = wardDemographics.imdDecile - constituencyAvgDemographics.imdDecile;
  if (Math.abs(imdDiff) > 2) {
    factors.push(imdDiff > 0 ? 'More deprived' : 'Less deprived');
  }

  return factors.slice(0, 3); // Top 3 factors
}

// Build index of all wards WITH 2024 election data across all constituencies
console.log('🔍 Building similarity index...\n');
const constituenciesDir = path.join(__dirname, '../src/data/constituencies');
const files = fs.readdirSync(constituenciesDir)
  .filter(f => f.endsWith('.json'));

const allWardsWithData = [];
files.forEach(file => {
  const filePath = path.join(constituenciesDir, file);
  const constituencyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Skip files without expected structure
  if (!constituencyData.constituency || !constituencyData.wards) {
    return;
  }

  constituencyData.wards.forEach(ward => {
    // Try matching by ID first, then by name
    if (wardResults2024Map[ward.id] || wardResults2024Map[ward.name]) {
      allWardsWithData.push({
        id: ward.id,
        name: ward.name,
        constituency: constituencyData.constituency.name,
        demographics: ward.demographics
      });
    }
  });
});

console.log(`✓ Found ${allWardsWithData.length} wards with 2024 election data\n`);
console.log('🔮 Calculating predictions...\n');

// Process all constituencies
let processedCount = 0;
let skippedCount = 0;

files.forEach(file => {
  const filePath = path.join(constituenciesDir, file);
  const constituencyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Skip files without expected structure
  if (!constituencyData.constituency || !constituencyData.constituency.name || !constituencyData.wards) {
    console.log(`  ⚠ Skipping ${file} - invalid structure`);
    skippedCount++;
    return;
  }

  const success = processPredictions(
    constituencyData,
    wardResults2024Map,
    constituencyPolling2025Map,
    allWardsWithData
  );

  if (success) {
    // Write updated file
    fs.writeFileSync(filePath, JSON.stringify(constituencyData, null, 2));
    processedCount++;
  } else {
    skippedCount++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`✓ Processed ${processedCount} constituencies`);
if (skippedCount > 0) {
  console.log(`⚠ Skipped ${skippedCount} constituencies (no data)`);
}
console.log(`\n2025 predictions added to ward demographics\n`);
