# Census Data Files

Drop your CSV files here with the **exact names** listed below. The system will auto-detect and process them.

## Required Files (for basic functionality)

### Core Files
- `ward-constituency-mapping.csv` - Maps wards to constituencies (ONS lookup table)
- `wards.geojson` - Ward boundary data (GeoJSON format)

### LSOA Mapping
- `lsoa-ward-mapping.csv` - Maps LSOAs to wards (required for demographic data)

## Optional Files (demographic data)

### Deprivation Indices
- `lsoa-deprivation.csv` - IMD and all deprivation indices by LSOA

### Population & Age
- `lsoa-population.csv` - Population counts and age distribution by LSOA

### Ethnicity
- `lsoa-ethnicity.csv` - Ethnic group percentages by LSOA (20 categories)

### Census 2021 Data
- `lsoa-economic-activity.csv` - Economic activity status (20 categories)
- `lsoa-country-of-birth.csv` - Country of birth (12 categories)
- `lsoa-religion.csv` - Religion (10 categories)
- `lsoa-housing.csv` - Housing tenure (9 categories)
- `lsoa-qualifications.csv` - Highest qualification level (8 categories)

## How to Use

1. **Download your CSV files** from ONS or Nomis
2. **Rename them** to match the names above (exact match required)
3. **Drop them in this folder** (`scripts/data/`)
4. **Run the setup command:**
   ```bash
   npm run setup
   ```

The script will:
- Auto-detect which files are present
- Process all available data
- Generate constituency files in `src/data/constituencies/`
- Skip any files that are missing (they're optional)

## Test Mode

To test with just a few constituencies first:
```bash
npm run setup:test
```

This processes only 10 sample constituencies to verify everything works.

## File Sources

### ONS Geography Portal
- Ward boundaries: https://geoportal.statistics.gov.uk/
- Ward-Constituency lookup: https://geoportal.statistics.gov.uk/

### Nomis (Census 2021)
- All LSOA data: https://www.nomisweb.co.uk/
- Search for "LSOA 2021" + your data type

### LSOA Deprivation
- English Indices of Deprivation: https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019

## Notes

- All CSV files should be UTF-8 encoded
- The system handles BOM (Byte Order Mark) automatically
- Large files (>100MB) are fine, processing may take a few minutes
- Files are NOT committed to git (see `.gitignore`)
