# Constituency Import System

This document explains how to import all UK Westminster Parliamentary Constituencies into the Constituency Pulse dashboard.

## Overview

The system allows you to:
1. **Batch process** all constituencies from ONS GeoJSON data
2. **Convert coordinates** from British National Grid to latitude/longitude
3. **Generate placeholder wards** for each constituency
4. **Create mock events** for demonstration
5. **Enable search** and selection of any constituency

## Prerequisites

### Get ONS Data

Download the official Westminster Parliamentary Constituencies GeoJSON from ONS:

**URL**: https://geoportal.statistics.gov.uk/

Search for: **"Westminster Parliamentary Constituencies (December 2024) Boundaries UK"**

Download format: **GeoJSON**

Save it as: `Westminster_Parliamentary_Constituencies_2024.geojson` (or any name you prefer)

## Step-by-Step Import Process

### 1. Place the GeoJSON File

Put your downloaded GeoJSON file in the `scripts/` directory:

```bash
cd /home/user/constituencypulse/scripts
# Copy your file here
```

### 2. Run the Batch Processor

Execute the batch processing script with the path to your GeoJSON file:

```bash
node batch-process-constituencies.js Westminster_Parliamentary_Constituencies_2024.geojson
```

**What it does:**
- Reads all constituency features from the GeoJSON
- Converts BNG coordinates to lat/lng for each constituency
- Generates 6 placeholder wards per constituency
- Creates 6-10 placeholder events per constituency
- Saves each constituency as a separate JSON file in `src/data/constituencies/`
- Creates an index file for search functionality

### 3. Expected Output

```
=== Constituency Batch Processor ===

✓ Created output directory: ../src/data/constituencies

Loading: Westminster_Parliamentary_Constituencies_2024.geojson...
Found 650 constituencies

Processing: Aberavon (W07000049)
  ✓ Saved: W07000049.json
Processing: Aberdeenshire North and Moray East (S14000001)
  ✓ Saved: S14000001.json
...
Processing: York Outer (E14001071)
  ✓ Saved: E14001071.json

✓ Saved constituency index: ../src/data/constituencies/index.json

=== Processing Complete ===
Successful: 650
Errors: 0
Total: 650
```

## Directory Structure After Import

```
src/data/
├── constituencies/
│   ├── index.json              # Searchable list of all constituencies
│   ├── E14001088.json          # Bexhill and Battle
│   ├── E14000532.json          # Birmingham Edgbaston
│   ├── W07000049.json          # Aberavon (Wales)
│   ├── S14000001.json          # Aberdeenshire (Scotland)
│   └── ... (650 total files)
└── bexhill-battle.json         # Original sample (can be removed)
```

## File Format

Each constituency JSON file contains:

```json
{
  "constituency": {
    "id": "E14001088",
    "name": "Bexhill and Battle",
    "center": [51.461990, 0.166682],
    "zoom": 11,
    "multiPolygonBoundary": [/* lat/lng coordinates */]
  },
  "wards": [
    {
      "id": "ward_001",
      "name": "Bexhill and Battle Ward 1",
      "boundary": [/* polygon coordinates */],
      "center": [51.48, 0.17],
      "demographics": {
        "population": 12450,
        "voters": 9320,
        "medianAge": 52,
        "medianIncome": 28500,
        "higherEducation": 32,
        "employed": 68
      }
    }
    /* ... 5 more wards */
  ],
  "events": [
    {
      "id": "event_001",
      "title": "Battle Surgery Expansion",
      "category": "healthcare",
      "coordinates": [51.89, 0.48],
      "date": "2024-03-15",
      "summary": "Local community event in Bexhill and Battle Ward 3"
    }
    /* ... 5-9 more events */
  ]
}
```

## Index File Format

The `index.json` file enables the search functionality:

```json
[
  {
    "id": "E14001088",
    "name": "Bexhill and Battle",
    "center": [51.461990, 0.166682],
    "filename": "E14001088.json"
  },
  ...
]
```

## Using the Search Screen

Once imported, the start screen will show all constituencies:

1. **Start the app**: `npm run dev`
2. **Search screen** appears automatically
3. **Type to search**: Start typing constituency name (e.g., "Manchester", "Edinburgh")
4. **Click to select**: Click any constituency to load its map
5. **Change constituency**: Click "Change Constituency" button in header

## Placeholder Data

### Wards
- **Count**: 6 per constituency
- **Layout**: Evenly distributed around constituency center
- **Demographics**: Randomized but realistic values
- **Purpose**: Demonstration until real ward data is imported

### Events
- **Count**: 6-10 per constituency
- **Categories**: Healthcare, Education, Transport, Housing, Environment
- **Location**: Distributed across wards
- **Purpose**: Demonstrate event functionality

## Importing Real Ward Boundaries

After importing constituencies, you can add real ward boundaries:

### Prerequisites

Download the official wards GeoJSON from ONS:

**URL**: https://geoportal.statistics.gov.uk/

Search for: **"Wards (December 2024) Boundaries UK"**

Download format: **GeoJSON**

### Step-by-Step Ward Import

**1. Place the Wards GeoJSON File**

Put your downloaded wards file in the `scripts/` directory:

```bash
cd /home/user/constituencypulse/scripts
# Copy your wards file here
```

**2. Run the Ward Processor**

**IMPORTANT**: You must run `batch-process-constituencies.js` FIRST before running this script!

```bash
node batch-process-wards.js Wards_December_2024.geojson
```

**What it does:**
- Reads all ward features from the GeoJSON
- Wards are already in WGS84 format (no conversion needed)
- Uses spatial containment to match wards to constituencies
- Calculates ward centroids and checks if they fall within constituency boundaries
- Generates mock demographic data for each ward
- Replaces placeholder wards with real boundaries
- Updates constituency JSON files with real ward data

**3. Expected Output**

```
=== Ward Batch Processor ===

Loading: Wards_December_2024.geojson...
Found 8,694 wards

Found 650 constituencies

Processing wards and matching to constituencies...

✓ Woodside → Croydon South
✓ Bexhill Central → Bexhill and Battle
✓ Battle → Bexhill and Battle
...
✗ Some Ward - no constituency match found

=== Saving updated constituency files ===

✓ Updated: E14001088.json (12 wards)
✓ Updated: E14000532.json (18 wards)
...

=== Processing Complete ===
Wards matched: 8,650
Wards unmatched: 44
Constituencies updated: 650
Total wards processed: 8,694
```

**Note on unmatched wards**: Some wards may not match due to:
- Boundary misalignments in source data
- Offshore islands or special administrative areas
- Data quality issues

### How Ward Matching Works

The script uses **point-in-polygon testing**:

1. **Calculate centroid** of each ward polygon
2. **Test if centroid falls within** any constituency boundary
3. **Assign ward** to the containing constituency
4. **Generate mock demographics** (until real data available)

### After Import

Once complete, when you select a constituency:
- Real ward boundaries display (not placeholder hexagons)
- Accurate ward shapes and names
- Mock demographic data (replace with real data later)

### Example: Updated Constituency File

```json
{
  "constituency": {
    "id": "E14001088",
    "name": "Bexhill and Battle",
    "center": [51.461990, 0.166682],
    "zoom": 11,
    "multiPolygonBoundary": [...]
  },
  "wards": [
    {
      "id": "E05011489",
      "name": "Woodside",
      "boundary": [[51.398013, -0.050419], ...],
      "center": [51.395, -0.062],
      "demographics": {
        "population": 11234,
        "voters": 8456,
        "medianAge": 42,
        "medianIncome": 32500,
        "higherEducation": 38,
        "employed": 72
      }
    },
    ...
  ],
  "events": [...]
}
```

## Next Steps

### Add Real Events

Integrate with actual data sources:

1. Connect to council meeting APIs
2. Parse planning applications
3. Import healthcare announcements
4. Update constituency JSON files with real events

## Troubleshooting

### "Error: Input file not found"
- Check the file path is correct
- Ensure you're in the `scripts/` directory
- Use the full path if needed

### "Invalid GeoJSON format"
- Verify the file is valid GeoJSON
- Check it contains a `features` array
- Ensure each feature has `properties.PCON24CD` and `properties.PCON24NM`

### Processing is slow
- Normal: ~650 constituencies take 2-3 minutes
- Each constituency has 220+ vertices to convert
- Progress is shown in real-time

### Some constituencies have errors
- Check the console for specific error messages
- Unsupported geometry types (other than Polygon/MultiPolygon) are skipped
- Missing properties will cause errors

### Search screen shows "No constituencies found"
- Check `src/data/constituencies/index.json` exists
- Verify the file contains an array of constituencies
- Check browser console for fetch errors

## Performance

- **File size**: ~50-150KB per constituency JSON
- **Total size**: ~50-100MB for all 650 constituencies
- **Load time**: <500ms per constituency (on demand)
- **Initial load**: Only loads index (~40KB)
- **Memory usage**: Only selected constituency in memory

## Development Notes

### Testing Single Constituency

To test with just one constituency:

```bash
node batch-process-constituencies.js test-single.geojson
```

Where `test-single.geojson` contains only one feature.

### Updating Existing Constituencies

Re-running the script will overwrite existing files. Backup if needed:

```bash
cp -r src/data/constituencies src/data/constituencies-backup
```

### Manual Edits

You can manually edit any constituency JSON file. Changes persist until re-import.

## Command Summary

```bash
# Navigate to scripts directory
cd scripts

# Run batch processor
node batch-process-constituencies.js <path-to-geojson>

# Example with full path
node batch-process-constituencies.js ~/Downloads/Westminster_Constituencies_2024.geojson

# Check output
ls -lh ../src/data/constituencies/

# Verify index
cat ../src/data/constituencies/index.json | jq length
```

## Support

For issues or questions:
- Check the console output for error messages
- Verify your GeoJSON file format
- Ensure Node.js version is compatible (18+)
- Review the generated files in `src/data/constituencies/`
