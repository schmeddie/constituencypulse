// Census 2021 layer metadata for consistent labeling across the app
export const LAYER_METADATA = {
  // Deprivation indices
  imd: { label: 'IMD - Overall Deprivation', type: 'decile', field: 'imdDecile' },
  income: { label: 'Income Deprivation', type: 'decile', field: 'incomeDecile' },
  education: { label: 'Education Deprivation', type: 'decile', field: 'educationDecile' },
  employment: { label: 'Employment Deprivation', type: 'decile', field: 'employmentDecile' },
  health: { label: 'Health Deprivation', type: 'decile', field: 'healthDecile' },
  crime: { label: 'Crime Levels', type: 'decile', field: 'crimeDecile' },
  housing: { label: 'Housing Barriers', type: 'decile', field: 'housingDecile' },
  environment: { label: 'Living Environment', type: 'decile', field: 'environmentDecile' },

  // Demographics
  age: { label: 'Average Age', type: 'age', field: 'averageAge' },
  populationDensity: { label: 'Population Density', type: 'density', field: null },

  // Ethnicity
  ethnicityAsian: { label: 'Ethnicity: % Asian', type: 'ethnicity', field: 'asianPercent' },
  ethnicityBlack: { label: 'Ethnicity: % Black', type: 'ethnicity', field: 'blackPercent' },
  ethnicityMixed: { label: 'Ethnicity: % Mixed', type: 'ethnicity', field: 'mixedPercent' },
  ethnicityWhite: { label: 'Ethnicity: % White', type: 'ethnicity', field: 'whitePercent' },

  // Economic Activity
  economicEmployed: { label: 'Economic Activity: % Employed', type: 'percentage', field: 'employedPercent' },
  economicSelfEmployed: { label: 'Economic Activity: % Self-Employed', type: 'percentage', field: 'selfEmployedPercent' },
  economicUnemployed: { label: 'Economic Activity: % Unemployed', type: 'percentage', field: 'unemployedPercent' },
  economicRetired: { label: 'Economic Activity: % Retired', type: 'percentage', field: 'retiredPercent' },
  economicStudent: { label: 'Economic Activity: % Students', type: 'percentage', field: 'studentPercent' },

  // Country of Birth
  ukBorn: { label: 'Country of Birth: % UK Born', type: 'percentage', field: 'ukBornPercent' },
  euBorn: { label: 'Country of Birth: % EU Born', type: 'percentage', field: 'euBornPercent' },
  nonEuBorn: { label: 'Country of Birth: % Non-EU Born', type: 'percentage', field: 'nonEuBornPercent' },

  // Religion
  religionChristian: { label: 'Religion: % Christian', type: 'percentage', field: 'christianPercent' },
  religionMuslim: { label: 'Religion: % Muslim', type: 'percentage', field: 'muslimPercent' },
  religionHindu: { label: 'Religion: % Hindu', type: 'percentage', field: 'hinduPercent' },
  religionSikh: { label: 'Religion: % Sikh', type: 'percentage', field: 'sikhPercent' },
  religionJewish: { label: 'Religion: % Jewish', type: 'percentage', field: 'jewishPercent' },
  religionNone: { label: 'Religion: % No Religion', type: 'percentage', field: 'noReligionPercent' },

  // Housing Tenure
  housingOwnedOutright: { label: 'Housing: % Owned Outright', type: 'percentage', field: 'ownedOutrightPercent' },
  housingOwnedMortgage: { label: 'Housing: % Owned with Mortgage', type: 'percentage', field: 'ownedMortgagePercent' },
  housingSocialRented: { label: 'Housing: % Social Rented', type: 'percentage', field: 'socialRentedPercent' },
  housingPrivateRented: { label: 'Housing: % Private Rented', type: 'percentage', field: 'privateRentedPercent' },

  // Qualifications
  qualificationsNone: { label: 'Qualifications: % No Qualifications', type: 'percentage', field: 'noQualificationsPercent' },
  qualificationsLevel1to3: { label: 'Qualifications: % Level 1-3', type: 'percentage', field: 'level1to3Percent' },
  qualificationsLevel4Plus: { label: 'Qualifications: % Level 4+', type: 'percentage', field: 'level4PlusPercent' },
  qualificationsApprenticeship: { label: 'Qualifications: % Apprenticeship', type: 'percentage', field: 'apprenticeshipPercent' }
};

// Helper to get value from ward demographics
export const getLayerValue = (layer, wardDemographics) => {
  const metadata = LAYER_METADATA[layer];
  if (!metadata) return 'N/A';

  if (!metadata.field) return 'View on map';

  const value = wardDemographics[metadata.field];
  if (value === null || value === undefined) return 'N/A';

  switch (metadata.type) {
    case 'decile':
      return `Decile ${value} / 10`;
    case 'age':
      return `${value} years`;
    case 'percentage':
    case 'ethnicity':
      return `${value}%`;
    default:
      return value;
  }
};

// Helper to format popup display
export const formatPopupValue = (layer, wardDemographics) => {
  const metadata = LAYER_METADATA[layer];
  if (!metadata) return 'N/A';

  if (!metadata.field) return 'View on map';

  const value = wardDemographics[metadata.field];
  if (value === null || value === undefined) return 'N/A';

  switch (metadata.type) {
    case 'decile':
      return `Decile ${value} / 10`;
    case 'age':
      return `${value} years`;
    case 'percentage':
    case 'ethnicity':
      return `${value}%`;
    default:
      return value;
  }
};

// Helper to check if layer should show deprivation note
export const shouldShowDeprivationNote = (layer) => {
  const metadata = LAYER_METADATA[layer];
  return metadata && metadata.type === 'decile';
};
