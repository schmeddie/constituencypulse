# Data Processing System

This system processes LSOA (Lower Layer Super Output Area) census data and aggregates it to ward level.

**NO PLACEHOLDER DATA. NO MOCK DATA. ONLY REAL LSOA DATA.**

## How It Works

1. **You provide CSV files** with LSOA-level census data
2. **The script loads** each LSOA's data from the CSVs
3. **The script aggregates** all LSOAs within each ward by summing their values
4. **The script calculates** percentages for each ward based on the aggregated totals
5. **The script outputs** constituency JSON files with real ward-level demographics

## Required Files

### Core Files (REQUIRED)
- `ward-constituency-mapping.csv` - Maps wards to constituencies (ONS)
- `wards.geojson` - Ward boundary geometries (ONS GeoPortal)
- `lsoa-deprivation.csv` - LSOA deprivation indices (required for processing)
- `lsoa-ward-mapping.csv` - Maps LSOAs to wards (required for aggregation)

### Optional Demographic Data
If you don't provide these, the corresponding fields will be `null`:

- `lsoa-population.csv` - Population counts and age bands by LSOA
- `lsoa-ethnicity.csv` - Ethnicity (20 categories) by LSOA
- `lsoa-economic-activity.csv` - Economic activity status (20 categories)
- `lsoa-country-of-birth.csv` - Country of birth (12 categories)
- `lsoa-religion.csv` - Religion (10 categories)
- `lsoa-housing.csv` - Housing tenure (9 categories)
- `lsoa-qualifications.csv` - Highest qualification level (8 categories)

## Usage

1. **Download CSV files** from ONS/Nomis
2. **Rename them exactly** as shown above
3. **Place them in** `scripts/data/` folder
4. **Run setup:**
   ```bash
   npm run setup
   ```

The script will:
- Load LSOA data from each CSV
- Map LSOAs to their parent wards
- Aggregate all LSOA values for each ward
- Calculate ward-level percentages
- Output JSON files in `src/data/constituencies/`

## Example Aggregation

If a ward contains 5 LSOAs:

**LSOA Level (from CSV):**
- LSOA 1: 300 people, 45% white
- LSOA 2: 250 people, 60% white
- LSOA 3: 400 people, 30% white
- LSOA 4: 350 people, 50% white
- LSOA 5: 200 people, 70% white

**Ward Level (aggregated):**
- Total population: 1,500 people
- White population: (300×0.45 + 250×0.60 + 400×0.30 + 350×0.50 + 200×0.70) = 730
- Ward white %: 730 / 1,500 = 48.7%

This is done for ALL demographic fields across ALL wards.

## Test Mode

To verify with just 10 constituencies first:
```bash
npm run setup:test
```

## Data Sources

- **ONS Geography Portal**: https://geoportal.statistics.gov.uk/
  - Ward boundaries (GeoJSON)
  - Ward-Constituency mappings
  - LSOA-Ward mappings

- **Nomis (Census 2021)**: https://www.nomisweb.co.uk/
  - All LSOA demographic data
  - Search: "LSOA 2021" + your metric

- **IMD 2019**: https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019
  - LSOA deprivation indices

## Output Structure

Each constituency JSON will contain wards with demographics like:

```json
{
  "id": "E05012345",
  "name": "Example Ward",
  "demographics": {
    "population": 8523,
    "averageAge": 42,
    "whitePercent": 85.3,
    "asianPercent": 8.2,
    "employedPercent": 62.4,
    "christianPercent": 45.1,
    ...
  }
}
```

All percentages are calculated from real LSOA data aggregated to ward level.
