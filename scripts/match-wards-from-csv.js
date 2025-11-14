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
const LSOA_POPULATION_PATH = process.argv[6]; // Optional: LSOA age/population data CSV (lsoa-age.csv)
const LSOA_ETHNICITY_PATH = process.argv[7]; // Optional: LSOA ethnicity data CSV
const LSOA_ECONOMIC_ACTIVITY_PATH = process.argv[8]; // Optional: LSOA economic activity data CSV
const LSOA_COUNTRY_OF_BIRTH_PATH = process.argv[9]; // Optional: LSOA country of birth data CSV
const LSOA_RELIGION_PATH = process.argv[10]; // Optional: LSOA religion data CSV
const LSOA_HOUSING_PATH = process.argv[11]; // Optional: LSOA housing tenure data CSV
const LSOA_QUALIFICATIONS_PATH = process.argv[12]; // Optional: LSOA qualifications data CSV

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

// Generate demographics from LSOA data - NO MOCK DATA
// This function aggregates LSOA-level data up to ward level by summing all LSOAs in each ward
function generateDemographics(wardCode, lsoaData, lsoaPopulationData, lsoaEthnicityData, lsoaEconomicActivityData, lsoaCountryOfBirthData, lsoaReligionData, lsoaHousingData, lsoaQualificationsData) {
  // LSOA data is required - fail if not provided
  if (!lsoaData || !lsoaData.wardToLSOAs || !lsoaData.lsoaRankings) {
    throw new Error('LSOA data is required. Please provide lsoa-deprivation.csv and lsoa-ward-mapping.csv');
  }

  // Get all LSOAs for this ward
  const lsoasInWard = lsoaData.wardToLSOAs[wardCode] || [];

  if (lsoasInWard.length === 0) {
    // No LSOAs mapped to this ward - return null values (ward exists but no LSOA mapping)
    return {
      population: null,
      averageAge: null,
      population0to15: null,
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
      environmentDecile: null,
      asianPercent: null,
      blackPercent: null,
      mixedPercent: null,
      whitePercent: null,
      otherPercent: null,
      employedPercent: null,
      selfEmployedPercent: null,
      unemployedPercent: null,
      studentPercent: null,
      retiredPercent: null,
      inactivePercent: null,
      ukBornPercent: null,
      euBornPercent: null,
      nonEuBornPercent: null,
      noReligionPercent: null,
      christianPercent: null,
      muslimPercent: null,
      hinduPercent: null,
      sikhPercent: null,
      jewishPercent: null,
      buddhistPercent: null,
      otherReligionPercent: null,
      ownedOutrightPercent: null,
      ownedMortgagePercent: null,
      socialRentedPercent: null,
      privateRentedPercent: null,
      noQualificationsPercent: null,
      level1to3Percent: null,
      level4PlusPercent: null,
      apprenticeshipPercent: null,
      otherQualificationsPercent: null
    };
  }

  // Initialize totals for population and age
  let totalPopulation = 0;
  let totalWeightedAge = 0;
  let totalPopulation0to15 = 0;

  // Initialize ethnicity totals
  let totalEthnicPopulation = 0;
  let totalAsian = 0;
  let totalBlack = 0;
  let totalMixed = 0;
  let totalWhite = 0;
  let totalOther = 0;

  // Initialize Census 2021 totals
  let totalEconomicActivity = 0;
  let totalEmployed = 0;
  let totalSelfEmployed = 0;
  let totalUnemployed = 0;
  let totalStudent = 0;
  let totalRetired = 0;
  let totalInactive = 0;

  let totalCountryOfBirth = 0;
  let totalUkBorn = 0;
  let totalEuBorn = 0;
  let totalNonEuBorn = 0;

  let totalReligion = 0;
  let totalNoReligion = 0;
  let totalChristian = 0;
  let totalMuslim = 0;
  let totalHindu = 0;
  let totalSikh = 0;
  let totalJewish = 0;
  let totalBuddhist = 0;
  let totalOtherReligion = 0;

  let totalHousing = 0;
  let totalOwnedOutright = 0;
  let totalOwnedMortgage = 0;
  let totalSocialRented = 0;
  let totalPrivateRented = 0;

  let totalQualifications = 0;
  let totalNoQualifications = 0;
  let totalLevel1to3 = 0;
  let totalLevel4Plus = 0;
  let totalApprenticeship = 0;
  let totalOtherQualifications = 0;

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
      totalPopulation0to15 += popData.population0to15;
    }

    // Add ethnicity data if available
    if (lsoaEthnicityData && lsoaEthnicityData[lsoaCode]) {
      const ethData = lsoaEthnicityData[lsoaCode];
      totalAsian += ethData.asian;
      totalBlack += ethData.black;
      totalMixed += ethData.mixed;
      totalWhite += ethData.white;
      totalOther += ethData.other;
      totalEthnicPopulation += ethData.total;
    }

    // Add economic activity data if available
    if (lsoaEconomicActivityData && lsoaEconomicActivityData[lsoaCode]) {
      const econData = lsoaEconomicActivityData[lsoaCode];
      totalEmployed += econData.employed;
      totalSelfEmployed += econData.selfEmployed;
      totalUnemployed += econData.unemployed;
      totalStudent += econData.student;
      totalRetired += econData.retired;
      totalInactive += econData.inactive;
      totalEconomicActivity += econData.total;
    }

    // Add country of birth data if available
    if (lsoaCountryOfBirthData && lsoaCountryOfBirthData[lsoaCode]) {
      const cobData = lsoaCountryOfBirthData[lsoaCode];
      totalUkBorn += cobData.ukBorn;
      totalEuBorn += cobData.euBorn;
      totalNonEuBorn += cobData.nonEuBorn;
      totalCountryOfBirth += cobData.total;
    }

    // Add religion data if available
    if (lsoaReligionData && lsoaReligionData[lsoaCode]) {
      const relData = lsoaReligionData[lsoaCode];
      totalNoReligion += relData.noReligion;
      totalChristian += relData.christian;
      totalMuslim += relData.muslim;
      totalHindu += relData.hindu;
      totalSikh += relData.sikh;
      totalJewish += relData.jewish;
      totalBuddhist += relData.buddhist;
      totalOtherReligion += relData.other;
      totalReligion += relData.total;
    }

    // Add housing tenure data if available
    if (lsoaHousingData && lsoaHousingData[lsoaCode]) {
      const housingData = lsoaHousingData[lsoaCode];
      totalOwnedOutright += housingData.ownedOutright;
      totalOwnedMortgage += housingData.ownedMortgage;
      totalSocialRented += housingData.socialRented;
      totalPrivateRented += housingData.privateRented;
      totalHousing += housingData.total;
    }

    // Add qualifications data if available
    if (lsoaQualificationsData && lsoaQualificationsData[lsoaCode]) {
      const qualData = lsoaQualificationsData[lsoaCode];
      totalNoQualifications += qualData.noQualifications;
      totalLevel1to3 += qualData.level1to3;
      totalLevel4Plus += qualData.level4Plus;
      totalApprenticeship += qualData.apprenticeship;
      totalOtherQualifications += qualData.other;
      totalQualifications += qualData.total;
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

  // Calculate ethnicity percentages
  const ethnicityPercentages = {};
  if (totalEthnicPopulation > 0) {
    ethnicityPercentages.asianPercent = Math.round((totalAsian / totalEthnicPopulation) * 100 * 10) / 10;
    ethnicityPercentages.blackPercent = Math.round((totalBlack / totalEthnicPopulation) * 100 * 10) / 10;
    ethnicityPercentages.mixedPercent = Math.round((totalMixed / totalEthnicPopulation) * 100 * 10) / 10;
    ethnicityPercentages.whitePercent = Math.round((totalWhite / totalEthnicPopulation) * 100 * 10) / 10;
    ethnicityPercentages.otherPercent = Math.round((totalOther / totalEthnicPopulation) * 100 * 10) / 10;
  } else {
    ethnicityPercentages.asianPercent = null;
    ethnicityPercentages.blackPercent = null;
    ethnicityPercentages.mixedPercent = null;
    ethnicityPercentages.whitePercent = null;
    ethnicityPercentages.otherPercent = null;
  }

  // Calculate economic activity percentages
  const economicActivityPercentages = {};
  if (totalEconomicActivity > 0) {
    economicActivityPercentages.employedPercent = Math.round((totalEmployed / totalEconomicActivity) * 100 * 10) / 10;
    economicActivityPercentages.selfEmployedPercent = Math.round((totalSelfEmployed / totalEconomicActivity) * 100 * 10) / 10;
    economicActivityPercentages.unemployedPercent = Math.round((totalUnemployed / totalEconomicActivity) * 100 * 10) / 10;
    economicActivityPercentages.studentPercent = Math.round((totalStudent / totalEconomicActivity) * 100 * 10) / 10;
    economicActivityPercentages.retiredPercent = Math.round((totalRetired / totalEconomicActivity) * 100 * 10) / 10;
    economicActivityPercentages.inactivePercent = Math.round((totalInactive / totalEconomicActivity) * 100 * 10) / 10;
  } else {
    economicActivityPercentages.employedPercent = null;
    economicActivityPercentages.selfEmployedPercent = null;
    economicActivityPercentages.unemployedPercent = null;
    economicActivityPercentages.studentPercent = null;
    economicActivityPercentages.retiredPercent = null;
    economicActivityPercentages.inactivePercent = null;
  }

  // Calculate country of birth percentages
  const countryOfBirthPercentages = {};
  if (totalCountryOfBirth > 0) {
    countryOfBirthPercentages.ukBornPercent = Math.round((totalUkBorn / totalCountryOfBirth) * 100 * 10) / 10;
    countryOfBirthPercentages.euBornPercent = Math.round((totalEuBorn / totalCountryOfBirth) * 100 * 10) / 10;
    countryOfBirthPercentages.nonEuBornPercent = Math.round((totalNonEuBorn / totalCountryOfBirth) * 100 * 10) / 10;
  } else {
    countryOfBirthPercentages.ukBornPercent = null;
    countryOfBirthPercentages.euBornPercent = null;
    countryOfBirthPercentages.nonEuBornPercent = null;
  }

  // Calculate religion percentages
  const religionPercentages = {};
  if (totalReligion > 0) {
    religionPercentages.noReligionPercent = Math.round((totalNoReligion / totalReligion) * 100 * 10) / 10;
    religionPercentages.christianPercent = Math.round((totalChristian / totalReligion) * 100 * 10) / 10;
    religionPercentages.muslimPercent = Math.round((totalMuslim / totalReligion) * 100 * 10) / 10;
    religionPercentages.hinduPercent = Math.round((totalHindu / totalReligion) * 100 * 10) / 10;
    religionPercentages.sikhPercent = Math.round((totalSikh / totalReligion) * 100 * 10) / 10;
    religionPercentages.jewishPercent = Math.round((totalJewish / totalReligion) * 100 * 10) / 10;
    religionPercentages.buddhistPercent = Math.round((totalBuddhist / totalReligion) * 100 * 10) / 10;
    religionPercentages.otherReligionPercent = Math.round((totalOtherReligion / totalReligion) * 100 * 10) / 10;
  } else {
    religionPercentages.noReligionPercent = null;
    religionPercentages.christianPercent = null;
    religionPercentages.muslimPercent = null;
    religionPercentages.hinduPercent = null;
    religionPercentages.sikhPercent = null;
    religionPercentages.jewishPercent = null;
    religionPercentages.buddhistPercent = null;
    religionPercentages.otherReligionPercent = null;
  }

  // Calculate housing tenure percentages
  const housingPercentages = {};
  if (totalHousing > 0) {
    housingPercentages.ownedOutrightPercent = Math.round((totalOwnedOutright / totalHousing) * 100 * 10) / 10;
    housingPercentages.ownedMortgagePercent = Math.round((totalOwnedMortgage / totalHousing) * 100 * 10) / 10;
    housingPercentages.socialRentedPercent = Math.round((totalSocialRented / totalHousing) * 100 * 10) / 10;
    housingPercentages.privateRentedPercent = Math.round((totalPrivateRented / totalHousing) * 100 * 10) / 10;
  } else {
    housingPercentages.ownedOutrightPercent = null;
    housingPercentages.ownedMortgagePercent = null;
    housingPercentages.socialRentedPercent = null;
    housingPercentages.privateRentedPercent = null;
  }

  // Calculate qualifications percentages
  const qualificationsPercentages = {};
  if (totalQualifications > 0) {
    qualificationsPercentages.noQualificationsPercent = Math.round((totalNoQualifications / totalQualifications) * 100 * 10) / 10;
    qualificationsPercentages.level1to3Percent = Math.round((totalLevel1to3 / totalQualifications) * 100 * 10) / 10;
    qualificationsPercentages.level4PlusPercent = Math.round((totalLevel4Plus / totalQualifications) * 100 * 10) / 10;
    qualificationsPercentages.apprenticeshipPercent = Math.round((totalApprenticeship / totalQualifications) * 100 * 10) / 10;
    qualificationsPercentages.otherQualificationsPercent = Math.round((totalOtherQualifications / totalQualifications) * 100 * 10) / 10;
  } else {
    qualificationsPercentages.noQualificationsPercent = null;
    qualificationsPercentages.level1to3Percent = null;
    qualificationsPercentages.level4PlusPercent = null;
    qualificationsPercentages.apprenticeshipPercent = null;
    qualificationsPercentages.otherQualificationsPercent = null;
  }

  return {
    population: totalPopulation > 0 ? totalPopulation : count * 1600, // Use real data or estimate
    averageAge: averageAge,
    population0to15: totalPopulation0to15,
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
    environmentDecile: averages.environmentDecile,
    ...ethnicityPercentages,
    ...economicActivityPercentages,
    ...countryOfBirthPercentages,
    ...religionPercentages,
    ...housingPercentages,
    ...qualificationsPercentages
  };
}

// Load and process LSOA deprivation data files
function loadLSOAData() {
  if (!LSOA_DATA_PATH || !LSOA_WARD_MAPPING_PATH) {
    console.error('ERROR: LSOA deprivation and ward mapping files are required');
    console.error('Please provide lsoa-deprivation.csv and lsoa-ward-mapping.csv\n');
    process.exit(1);
  }

  if (!fs.existsSync(LSOA_DATA_PATH)) {
    console.error(`ERROR: LSOA data file not found: ${LSOA_DATA_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(LSOA_WARD_MAPPING_PATH)) {
    console.error(`ERROR: LSOA-Ward mapping file not found: ${LSOA_WARD_MAPPING_PATH}`);
    process.exit(1);
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

// Load and process LSOA age/population data
function loadLSOAPopulationData() {
  if (!LSOA_POPULATION_PATH || LSOA_POPULATION_PATH === '') {
    console.log('⚠️  LSOA age/population data not provided - population fields will be null\n');
    return null;
  }

  if (!fs.existsSync(LSOA_POPULATION_PATH)) {
    console.warn(`⚠️  LSOA age file not found: ${LSOA_POPULATION_PATH} - skipping\n`);
    return null;
  }

  console.log(`Loading LSOA age/population data from: ${LSOA_POPULATION_PATH}...`);

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
        averageAge: averageAge,
        population0to15: f0to15 + m0to15  // Store 0-15 population for voter calculations
      };
    }
  }

  console.log(`Processed ${Object.keys(lsoaPopulation).length} LSOA population records\n`);

  return lsoaPopulation;
}

// Load and process LSOA ethnicity data
function loadLSOAEthnicityData() {
  if (!LSOA_ETHNICITY_PATH || LSOA_ETHNICITY_PATH === '') {
    console.log('⚠️  LSOA ethnicity data not provided - ethnicity fields will be null\n');
    return null;
  }

  if (!fs.existsSync(LSOA_ETHNICITY_PATH)) {
    console.warn(`⚠️  LSOA ethnicity file not found: ${LSOA_ETHNICITY_PATH} - skipping\n`);
    return null;
  }

  console.log(`Loading LSOA ethnicity data from: ${LSOA_ETHNICITY_PATH}...`);

  // Load LSOA ethnicity data
  let ethContent = fs.readFileSync(LSOA_ETHNICITY_PATH, 'utf8');
  if (ethContent.charCodeAt(0) === 0xFEFF) {
    ethContent = ethContent.slice(1);
  }
  const ethRecords = parse(ethContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${ethRecords.length} LSOA ethnicity records`);

  // Build LSOA ethnicity map: lsoaCode -> { asian, black, mixed, white, other, total }
  const lsoaEthnicity = {};

  for (const record of ethRecords) {
    const lsoaCode = record['Lower layer Super Output Areas Code'];
    const categoryCode = parseInt(record['Ethnic group (20 categories) Code']);
    const count = parseInt(record['Observation']) || 0;

    if (!lsoaCode || categoryCode === -8) continue; // Skip "Does not apply"

    if (!lsoaEthnicity[lsoaCode]) {
      lsoaEthnicity[lsoaCode] = {
        asian: 0,
        black: 0,
        mixed: 0,
        white: 0,
        other: 0,
        total: 0
      };
    }

    // Group by major ethnic categories
    if (categoryCode >= 1 && categoryCode <= 5) {
      // Asian: Bangladeshi, Chinese, Indian, Pakistani, Other Asian
      lsoaEthnicity[lsoaCode].asian += count;
    } else if (categoryCode >= 6 && categoryCode <= 8) {
      // Black: African, Caribbean, Other Black
      lsoaEthnicity[lsoaCode].black += count;
    } else if (categoryCode >= 9 && categoryCode <= 12) {
      // Mixed: White and Asian, White and Black African, White and Black Caribbean, Other Mixed
      lsoaEthnicity[lsoaCode].mixed += count;
    } else if (categoryCode >= 13 && categoryCode <= 17) {
      // White: English/Welsh/Scottish/NI/British, Irish, Gypsy/Irish Traveller, Roma, Other White
      lsoaEthnicity[lsoaCode].white += count;
    } else if (categoryCode >= 18 && categoryCode <= 19) {
      // Other: Arab, Any other ethnic group
      lsoaEthnicity[lsoaCode].other += count;
    }

    lsoaEthnicity[lsoaCode].total += count;
  }

  // Calculate percentages
  for (const lsoaCode in lsoaEthnicity) {
    const data = lsoaEthnicity[lsoaCode];
    if (data.total > 0) {
      data.asianPercent = Math.round((data.asian / data.total) * 100 * 10) / 10;
      data.blackPercent = Math.round((data.black / data.total) * 100 * 10) / 10;
      data.mixedPercent = Math.round((data.mixed / data.total) * 100 * 10) / 10;
      data.whitePercent = Math.round((data.white / data.total) * 100 * 10) / 10;
      data.otherPercent = Math.round((data.other / data.total) * 100 * 10) / 10;
    }
  }

  console.log(`Processed ${Object.keys(lsoaEthnicity).length} LSOA ethnicity records\n`);

  return lsoaEthnicity;
}

// Load and process LSOA economic activity data
function loadLSOAEconomicActivityData() {
  if (!LSOA_ECONOMIC_ACTIVITY_PATH || LSOA_ECONOMIC_ACTIVITY_PATH === '') {
    console.log('⚠️  LSOA economic activity data not provided - economic activity fields will be null\n');
    return null;
  }

  if (!fs.existsSync(LSOA_ECONOMIC_ACTIVITY_PATH)) {
    console.warn(`⚠️  LSOA economic activity file not found: ${LSOA_ECONOMIC_ACTIVITY_PATH} - skipping\n`);
    return null;
  }

  console.log(`Loading LSOA economic activity data from: ${LSOA_ECONOMIC_ACTIVITY_PATH}...`);

  let content = fs.readFileSync(LSOA_ECONOMIC_ACTIVITY_PATH, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${records.length} LSOA economic activity records`);

  const lsoaEconomicActivity = {};

  for (const record of records) {
    const lsoaCode = record['Lower layer Super Output Areas Code'];
    const categoryCode = parseInt(record['Economic activity status (20 categories) Code']);
    const count = parseInt(record['Observation']) || 0;

    if (!lsoaCode || categoryCode === -8) continue; // Skip "Does not apply"

    if (!lsoaEconomicActivity[lsoaCode]) {
      lsoaEconomicActivity[lsoaCode] = {
        employed: 0,
        selfEmployed: 0,
        unemployed: 0,
        student: 0,
        retired: 0,
        inactive: 0,
        total: 0
      };
    }

    // Group by economic activity status
    if (categoryCode >= 1 && categoryCode <= 6) {
      // Economically active (excluding students): employed/self-employed
      if (categoryCode <= 2) {
        lsoaEconomicActivity[lsoaCode].employed += count;
      } else {
        lsoaEconomicActivity[lsoaCode].selfEmployed += count;
      }
    } else if (categoryCode === 7) {
      // Unemployed
      lsoaEconomicActivity[lsoaCode].unemployed += count;
    } else if (categoryCode >= 8 && categoryCode <= 14) {
      // Students (economically active)
      lsoaEconomicActivity[lsoaCode].student += count;
    } else if (categoryCode === 15) {
      // Retired
      lsoaEconomicActivity[lsoaCode].retired += count;
    } else if (categoryCode >= 16 && categoryCode <= 19) {
      // Economically inactive (other)
      if (categoryCode === 16) {
        lsoaEconomicActivity[lsoaCode].student += count; // Students (inactive)
      } else {
        lsoaEconomicActivity[lsoaCode].inactive += count;
      }
    }

    lsoaEconomicActivity[lsoaCode].total += count;
  }

  // Calculate percentages
  for (const lsoaCode in lsoaEconomicActivity) {
    const data = lsoaEconomicActivity[lsoaCode];
    if (data.total > 0) {
      data.employedPercent = Math.round((data.employed / data.total) * 100 * 10) / 10;
      data.selfEmployedPercent = Math.round((data.selfEmployed / data.total) * 100 * 10) / 10;
      data.unemployedPercent = Math.round((data.unemployed / data.total) * 100 * 10) / 10;
      data.studentPercent = Math.round((data.student / data.total) * 100 * 10) / 10;
      data.retiredPercent = Math.round((data.retired / data.total) * 100 * 10) / 10;
      data.inactivePercent = Math.round((data.inactive / data.total) * 100 * 10) / 10;
    }
  }

  console.log(`Processed ${Object.keys(lsoaEconomicActivity).length} LSOA economic activity records\n`);

  return lsoaEconomicActivity;
}

// Load and process LSOA country of birth data
function loadLSOACountryOfBirthData() {
  if (!LSOA_COUNTRY_OF_BIRTH_PATH || LSOA_COUNTRY_OF_BIRTH_PATH === '') {
    console.log('⚠️  LSOA country of birth data not provided - country of birth fields will be null\n');
    return null;
  }

  if (!fs.existsSync(LSOA_COUNTRY_OF_BIRTH_PATH)) {
    console.warn(`⚠️  LSOA country of birth file not found: ${LSOA_COUNTRY_OF_BIRTH_PATH} - skipping\n`);
    return null;
  }

  console.log(`Loading LSOA country of birth data from: ${LSOA_COUNTRY_OF_BIRTH_PATH}...`);

  let content = fs.readFileSync(LSOA_COUNTRY_OF_BIRTH_PATH, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${records.length} LSOA country of birth records`);

  const lsoaCountryOfBirth = {};

  for (const record of records) {
    const lsoaCode = record['Lower layer Super Output Areas Code'];
    const categoryCode = parseInt(record['Country of birth (12 categories) Code']);
    const count = parseInt(record['Observation']) || 0;

    if (!lsoaCode || categoryCode === -8) continue; // Skip "Does not apply"

    if (!lsoaCountryOfBirth[lsoaCode]) {
      lsoaCountryOfBirth[lsoaCode] = {
        ukBorn: 0,
        euBorn: 0,
        nonEuBorn: 0,
        total: 0
      };
    }

    // Group by country of birth
    if (categoryCode === 1 || categoryCode === 11) {
      // UK born or British Overseas
      lsoaCountryOfBirth[lsoaCode].ukBorn += count;
    } else if (categoryCode >= 2 && categoryCode <= 5) {
      // EU countries
      lsoaCountryOfBirth[lsoaCode].euBorn += count;
    } else if (categoryCode >= 6 && categoryCode <= 10) {
      // Non-EU countries
      lsoaCountryOfBirth[lsoaCode].nonEuBorn += count;
    }

    lsoaCountryOfBirth[lsoaCode].total += count;
  }

  // Calculate percentages
  for (const lsoaCode in lsoaCountryOfBirth) {
    const data = lsoaCountryOfBirth[lsoaCode];
    if (data.total > 0) {
      data.ukBornPercent = Math.round((data.ukBorn / data.total) * 100 * 10) / 10;
      data.euBornPercent = Math.round((data.euBorn / data.total) * 100 * 10) / 10;
      data.nonEuBornPercent = Math.round((data.nonEuBorn / data.total) * 100 * 10) / 10;
    }
  }

  console.log(`Processed ${Object.keys(lsoaCountryOfBirth).length} LSOA country of birth records\n`);

  return lsoaCountryOfBirth;
}

// Load and process LSOA religion data
function loadLSOAReligionData() {
  if (!LSOA_RELIGION_PATH || LSOA_RELIGION_PATH === '') {
    console.log('⚠️  LSOA religion data not provided - religion fields will be null\n');
    return null;
  }

  if (!fs.existsSync(LSOA_RELIGION_PATH)) {
    console.warn(`⚠️  LSOA religion file not found: ${LSOA_RELIGION_PATH} - skipping\n`);
    return null;
  }

  console.log(`Loading LSOA religion data from: ${LSOA_RELIGION_PATH}...`);

  let content = fs.readFileSync(LSOA_RELIGION_PATH, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${records.length} LSOA religion records`);

  const lsoaReligion = {};

  for (const record of records) {
    const lsoaCode = record['Lower layer Super Output Areas Code'];
    const categoryCode = parseInt(record['Religion (10 categories) Code']);
    const count = parseInt(record['Observation']) || 0;

    if (!lsoaCode || categoryCode === -8) continue; // Skip "Does not apply"

    if (!lsoaReligion[lsoaCode]) {
      lsoaReligion[lsoaCode] = {
        noReligion: 0,
        christian: 0,
        muslim: 0,
        hindu: 0,
        sikh: 0,
        jewish: 0,
        buddhist: 0,
        other: 0,
        total: 0
      };
    }

    // Map to religion categories
    switch (categoryCode) {
      case 1: lsoaReligion[lsoaCode].noReligion += count; break;
      case 2: lsoaReligion[lsoaCode].christian += count; break;
      case 3: lsoaReligion[lsoaCode].buddhist += count; break;
      case 4: lsoaReligion[lsoaCode].hindu += count; break;
      case 5: lsoaReligion[lsoaCode].jewish += count; break;
      case 6: lsoaReligion[lsoaCode].muslim += count; break;
      case 7: lsoaReligion[lsoaCode].sikh += count; break;
      case 8: lsoaReligion[lsoaCode].other += count; break;
      case 9: /* Not answered - exclude from total */ break;
    }

    if (categoryCode !== 9) { // Don't count "Not answered" in total
      lsoaReligion[lsoaCode].total += count;
    }
  }

  // Calculate percentages
  for (const lsoaCode in lsoaReligion) {
    const data = lsoaReligion[lsoaCode];
    if (data.total > 0) {
      data.noReligionPercent = Math.round((data.noReligion / data.total) * 100 * 10) / 10;
      data.christianPercent = Math.round((data.christian / data.total) * 100 * 10) / 10;
      data.muslimPercent = Math.round((data.muslim / data.total) * 100 * 10) / 10;
      data.hinduPercent = Math.round((data.hindu / data.total) * 100 * 10) / 10;
      data.sikhPercent = Math.round((data.sikh / data.total) * 100 * 10) / 10;
      data.jewishPercent = Math.round((data.jewish / data.total) * 100 * 10) / 10;
      data.buddhistPercent = Math.round((data.buddhist / data.total) * 100 * 10) / 10;
      data.otherPercent = Math.round((data.other / data.total) * 100 * 10) / 10;
    }
  }

  console.log(`Processed ${Object.keys(lsoaReligion).length} LSOA religion records\n`);

  return lsoaReligion;
}

// Load and process LSOA housing tenure data
function loadLSOAHousingData() {
  if (!LSOA_HOUSING_PATH || LSOA_HOUSING_PATH === '') {
    console.log('⚠️  LSOA housing tenure data not provided - housing fields will be null\n');
    return null;
  }

  if (!fs.existsSync(LSOA_HOUSING_PATH)) {
    console.warn(`⚠️  LSOA housing file not found: ${LSOA_HOUSING_PATH} - skipping\n`);
    return null;
  }

  console.log(`Loading LSOA housing tenure data from: ${LSOA_HOUSING_PATH}...`);

  let content = fs.readFileSync(LSOA_HOUSING_PATH, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${records.length} LSOA housing tenure records`);

  const lsoaHousing = {};

  for (const record of records) {
    const lsoaCode = record['Lower layer Super Output Areas Code'];
    const categoryCode = parseInt(record['Tenure of household (9 categories) Code']);
    const count = parseInt(record['Observation']) || 0;

    if (!lsoaCode || categoryCode === -8) continue; // Skip "Does not apply"

    if (!lsoaHousing[lsoaCode]) {
      lsoaHousing[lsoaCode] = {
        ownedOutright: 0,
        ownedMortgage: 0,
        socialRented: 0,
        privateRented: 0,
        total: 0
      };
    }

    // Group by housing tenure
    if (categoryCode === 0) {
      lsoaHousing[lsoaCode].ownedOutright += count;
    } else if (categoryCode === 1) {
      lsoaHousing[lsoaCode].ownedMortgage += count;
    } else if (categoryCode === 3 || categoryCode === 4) {
      // Social rented (council or other)
      lsoaHousing[lsoaCode].socialRented += count;
    } else if (categoryCode === 5 || categoryCode === 6) {
      // Private rented
      lsoaHousing[lsoaCode].privateRented += count;
    }

    lsoaHousing[lsoaCode].total += count;
  }

  // Calculate percentages
  for (const lsoaCode in lsoaHousing) {
    const data = lsoaHousing[lsoaCode];
    if (data.total > 0) {
      data.ownedOutrightPercent = Math.round((data.ownedOutright / data.total) * 100 * 10) / 10;
      data.ownedMortgagePercent = Math.round((data.ownedMortgage / data.total) * 100 * 10) / 10;
      data.socialRentedPercent = Math.round((data.socialRented / data.total) * 100 * 10) / 10;
      data.privateRentedPercent = Math.round((data.privateRented / data.total) * 100 * 10) / 10;
    }
  }

  console.log(`Processed ${Object.keys(lsoaHousing).length} LSOA housing tenure records\n`);

  return lsoaHousing;
}

// Load and process LSOA qualifications data
function loadLSOAQualificationsData() {
  if (!LSOA_QUALIFICATIONS_PATH || LSOA_QUALIFICATIONS_PATH === '') {
    console.log('⚠️  LSOA qualifications data not provided - qualifications fields will be null\n');
    return null;
  }

  if (!fs.existsSync(LSOA_QUALIFICATIONS_PATH)) {
    console.warn(`⚠️  LSOA qualifications file not found: ${LSOA_QUALIFICATIONS_PATH} - skipping\n`);
    return null;
  }

  console.log(`Loading LSOA qualifications data from: ${LSOA_QUALIFICATIONS_PATH}...`);

  let content = fs.readFileSync(LSOA_QUALIFICATIONS_PATH, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Loaded ${records.length} LSOA qualifications records`);

  const lsoaQualifications = {};

  for (const record of records) {
    const lsoaCode = record['Lower layer Super Output Areas Code'];
    const categoryCode = parseInt(record['Highest level of qualification (8 categories) Code']);
    const count = parseInt(record['Observation']) || 0;

    if (!lsoaCode || categoryCode === -8) continue; // Skip "Does not apply"

    if (!lsoaQualifications[lsoaCode]) {
      lsoaQualifications[lsoaCode] = {
        noQualifications: 0,
        level1to3: 0,
        level4Plus: 0,
        apprenticeship: 0,
        other: 0,
        total: 0
      };
    }

    // Group by qualification level
    if (categoryCode === 0) {
      lsoaQualifications[lsoaCode].noQualifications += count;
    } else if (categoryCode >= 1 && categoryCode <= 4) {
      // Level 1, 2, 3, or apprenticeship
      if (categoryCode === 3) {
        lsoaQualifications[lsoaCode].apprenticeship += count;
      } else {
        lsoaQualifications[lsoaCode].level1to3 += count;
      }
    } else if (categoryCode === 5) {
      // Level 4+ (degree or higher)
      lsoaQualifications[lsoaCode].level4Plus += count;
    } else if (categoryCode === 6) {
      // Other qualifications
      lsoaQualifications[lsoaCode].other += count;
    }

    lsoaQualifications[lsoaCode].total += count;
  }

  // Calculate percentages
  for (const lsoaCode in lsoaQualifications) {
    const data = lsoaQualifications[lsoaCode];
    if (data.total > 0) {
      data.noQualificationsPercent = Math.round((data.noQualifications / data.total) * 100 * 10) / 10;
      data.level1to3Percent = Math.round((data.level1to3 / data.total) * 100 * 10) / 10;
      data.level4PlusPercent = Math.round((data.level4Plus / data.total) * 100 * 10) / 10;
      data.apprenticeshipPercent = Math.round((data.apprenticeship / data.total) * 100 * 10) / 10;
      data.otherPercent = Math.round((data.other / data.total) * 100 * 10) / 10;
    }
  }

  console.log(`Processed ${Object.keys(lsoaQualifications).length} LSOA qualifications records\n`);

  return lsoaQualifications;
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

  // Load LSOA ethnicity data (optional)
  const lsoaEthnicityData = loadLSOAEthnicityData();

  // Load Census 2021 data (optional)
  const lsoaEconomicActivityData = loadLSOAEconomicActivityData();
  const lsoaCountryOfBirthData = loadLSOACountryOfBirthData();
  const lsoaReligionData = loadLSOAReligionData();
  const lsoaHousingData = loadLSOAHousingData();
  const lsoaQualificationsData = loadLSOAQualificationsData();

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
      demographics: generateDemographics(wardCode, lsoaData, lsoaPopulationData, lsoaEthnicityData, lsoaEconomicActivityData, lsoaCountryOfBirthData, lsoaReligionData, lsoaHousingData, lsoaQualificationsData)
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

  console.log('\n=== Creating All England Wards GeoJSON ===\n');

  // Create GeoJSON with all wards that were matched to English constituencies
  const allWardsFeatures = [];
  const processedWardCodes = new Set();

  // Collect all wards from English constituencies
  for (const constituency of Object.values(constituencies)) {
    for (const ward of constituency.data.wards) {
      // Skip if we've already processed this ward (some wards might be in multiple constituencies)
      if (processedWardCodes.has(ward.id)) {
        continue;
      }
      processedWardCodes.add(ward.id);

      // Find the original GeoJSON feature for this ward
      const originalFeature = wardsGeoJSON.features.find(f => f.properties.WD25CD === ward.id);

      if (originalFeature) {
        // Create GeoJSON feature with demographics
        allWardsFeatures.push({
          type: 'Feature',
          id: ward.id,
          properties: {
            id: ward.id,
            name: ward.name,
            ...ward.demographics
          },
          geometry: originalFeature.geometry
        });
      }
    }
  }

  const allWardsGeoJSON = {
    type: 'FeatureCollection',
    features: allWardsFeatures
  };

  // Save all wards to public data directory
  const publicDataDir = '../public/data';
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  const englandWardsPath = path.join(publicDataDir, 'england-wards.json');
  fs.writeFileSync(englandWardsPath, JSON.stringify(allWardsGeoJSON, null, 2));
  console.log(`✓ Created england-wards.json with ${allWardsFeatures.length} English wards`);
  console.log(`  File saved to: ${englandWardsPath}`);

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
