// BNG to WGS84 conversion (Ordnance Survey coordinates to lat/lng)
// Using OSGB36 to WGS84 transformation

function bngToLatLng(easting, northing) {
  // Constants for OSGB36 ellipsoid
  const a = 6377563.396;      // Semi-major axis
  const b = 6356256.909;      // Semi-minor axis
  const F0 = 0.9996012717;    // Central meridian scale factor
  const lat0 = 49 * Math.PI / 180;  // Latitude of true origin (49°N)
  const lon0 = -2 * Math.PI / 180;  // Longitude of true origin (2°W)
  const N0 = -100000;         // Northing of true origin
  const E0 = 400000;          // Easting of true origin
  const e2 = 1 - (b * b) / (a * a);  // Eccentricity squared
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n * n * n;

  let lat = lat0;
  let M = 0;

  // Iterate to find latitude
  do {
    lat = (northing - N0 - M) / (a * F0) + lat;
    const Ma = (1 + n + (5/4) * n2 + (5/4) * n3) * (lat - lat0);
    const Mb = (3 * n + 3 * n2 + (21/8) * n3) * Math.sin(lat - lat0) * Math.cos(lat + lat0);
    const Mc = ((15/8) * n2 + (15/8) * n3) * Math.sin(2 * (lat - lat0)) * Math.cos(2 * (lat + lat0));
    const Md = (35/24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0));
    M = b * F0 * (Ma - Mb + Mc - Md);
  } while (northing - N0 - M >= 0.00001);

  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const nu = a * F0 / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;

  const tanLat = Math.tan(lat);
  const tan2lat = tanLat * tanLat;
  const tan4lat = tan2lat * tan2lat;
  const tan6lat = tan4lat * tan2lat;
  const secLat = 1 / cosLat;
  const nu3 = nu * nu * nu;
  const nu5 = nu3 * nu * nu;
  const nu7 = nu5 * nu * nu;

  const VII = tanLat / (2 * rho * nu);
  const VIII = tanLat / (24 * rho * nu3) * (5 + 3 * tan2lat + eta2 - 9 * tan2lat * eta2);
  const IX = tanLat / (720 * rho * nu5) * (61 + 90 * tan2lat + 45 * tan4lat);
  const X = secLat / nu;
  const XI = secLat / (6 * nu3) * (nu / rho + 2 * tan2lat);
  const XII = secLat / (120 * nu5) * (5 + 28 * tan2lat + 24 * tan4lat);
  const XIIA = secLat / (5040 * nu7) * (61 + 662 * tan2lat + 1320 * tan4lat + 720 * tan6lat);

  const dE = easting - E0;
  const dE2 = dE * dE;
  const dE3 = dE2 * dE;
  const dE4 = dE2 * dE2;
  const dE5 = dE3 * dE2;
  const dE6 = dE4 * dE2;
  const dE7 = dE5 * dE2;

  lat = lat - VII * dE2 + VIII * dE4 - IX * dE6;
  let lon = lon0 + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7;

  // Convert to degrees (still in OSGB36 datum)
  lat = lat * 180 / Math.PI;
  lon = lon * 180 / Math.PI;

  // Apply Helmert transformation to convert from OSGB36 datum to WGS84 datum
  const [wgs84Lat, wgs84Lon] = osgb36ToWgs84(lat, lon);

  return [wgs84Lat, wgs84Lon];
}

// Helmert transformation from OSGB36 to WGS84
function osgb36ToWgs84(lat, lon) {
  // Convert lat/lon back to radians for transformation
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;

  // OSGB36 ellipsoid parameters
  const a_osgb = 6377563.396;
  const b_osgb = 6356256.909;
  const e2_osgb = 1 - (b_osgb * b_osgb) / (a_osgb * a_osgb);

  // Convert OSGB36 lat/lon to OSGB36 cartesian coordinates
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const nu = a_osgb / Math.sqrt(1 - e2_osgb * sinLat * sinLat);
  const h = 0; // Assume height above ellipsoid is 0

  const x1 = (nu + h) * cosLat * cosLon;
  const y1 = (nu + h) * cosLat * sinLon;
  const z1 = ((1 - e2_osgb) * nu + h) * sinLat;

  // Helmert transformation parameters (OSGB36 to WGS84)
  const tx = -446.448;  // Translation in meters
  const ty = 125.157;
  const tz = -542.060;
  const s = 20.4894;    // Scale factor in ppm
  const rx = -0.1502;   // Rotation in arcseconds
  const ry = -0.2470;
  const rz = -0.8421;

  // Convert rotations from arcseconds to radians
  const rxRad = rx * Math.PI / (180 * 3600);
  const ryRad = ry * Math.PI / (180 * 3600);
  const rzRad = rz * Math.PI / (180 * 3600);
  const sFactor = s * 1e-6; // Convert ppm to factor

  // Apply Helmert transformation
  const x2 = tx + (1 + sFactor) * (x1 + (-rxRad) * y1 + ryRad * z1);
  const y2 = ty + (1 + sFactor) * (rxRad * x1 + y1 + (-rzRad) * z1);
  const z2 = tz + (1 + sFactor) * ((-ryRad) * x1 + rzRad * y1 + z1);

  // WGS84 ellipsoid parameters
  const a_wgs84 = 6378137.0;
  const b_wgs84 = 6356752.314245;
  const e2_wgs84 = 1 - (b_wgs84 * b_wgs84) / (a_wgs84 * a_wgs84);

  // Convert WGS84 cartesian back to lat/lon
  const p = Math.sqrt(x2 * x2 + y2 * y2);
  let latWgs84 = Math.atan2(z2, p * (1 - e2_wgs84));

  // Iterate to refine latitude
  for (let i = 0; i < 10; i++) {
    const sinLatWgs84 = Math.sin(latWgs84);
    const nuWgs84 = a_wgs84 / Math.sqrt(1 - e2_wgs84 * sinLatWgs84 * sinLatWgs84);
    latWgs84 = Math.atan2(z2 + e2_wgs84 * nuWgs84 * sinLatWgs84, p);
  }

  const lonWgs84 = Math.atan2(y2, x2);

  // Convert back to degrees
  const latDeg = latWgs84 * 180 / Math.PI;
  const lonDeg = lonWgs84 * 180 / Math.PI;

  return [latDeg, lonDeg];
}

// Read the BNG coordinates and convert
const bngCoordinates = [
  [
    [
      [552869.5, 175530.800000001],
      [552838.4, 175550],
      [552888.15, 175565.300000001],
      [552869.5, 175530.800000001]
    ]
  ],
  // Main polygon (the large one)
  [
    [
      [552955.45, 177987.039999999],
      [552990.76, 177972.810000001],
      [553011.5, 177861],
      [552924.5509, 177814.772600001],
      [552868.8299, 177788.9016],
      [552780.1326, 177777.8541],
      [552780.1556, 177777.888],
      [552878.3, 177844.9],
      [552902.6, 177939.369999999],
      [552944.75, 177915.050000001],
      [552909.92, 177946.16],
      [552955.45, 177987.039999999]
    ]
  ]
];

// This is a simplified version - the full conversion would process all coordinates
// For demonstration, let me show the conversion of a few key points:

const testPoints = [
  [552869.5, 175530.8],
  [547104.0552, 174490.495100001],
  [554090.8, 178048.800000001],
  [551101.4, 173827.35]
];

console.log('BNG to Lat/Lng conversions:');
testPoints.forEach(point => {
  const [lat, lng] = bngToLatLng(point[0], point[1]);
  console.log(`BNG [${point[0]}, ${point[1]}] => Lat/Lng [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
});

export { bngToLatLng };
