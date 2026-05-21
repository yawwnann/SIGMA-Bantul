import {
  PrismaClient,
  EvacuationLocationCategory,
  EvacuationLocationCondition,
} from '@prisma/client';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { basename, extname, join, resolve } from 'path';

const prisma = new PrismaClient();

type GeoJsonGeometry = {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
};

type GeoJsonFeature = {
  type: 'Feature';
  properties?: Record<string, unknown> | null;
  geometry?: GeoJsonGeometry | null;
};

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

type EvacuationLocationImportRow = {
  name: string;
  category: EvacuationLocationCategory;
  geometry: GeoJsonGeometry;
  capacity: number;
  address?: string;
};

const DEFAULT_GEOJSON_PATH = resolve(
  process.cwd(),
  'Data',
  'GeoJSon',
  'lokasi_evakuasi_enriched.geojson',
);

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function mapCategory(value: unknown): EvacuationLocationCategory | null {
  const normalized = normalizeText(value);

  if (['sekolah', 'school'].includes(normalized)) {
    return EvacuationLocationCategory.SCHOOL;
  }

  if (['lapangan', 'field'].includes(normalized)) {
    return EvacuationLocationCategory.FIELD;
  }

  if (
    [
      'kantor_pemerintah',
      'kantor_pemerintahan',
      'government',
      'government_office',
      'pemerintah',
    ].includes(normalized)
  ) {
    return EvacuationLocationCategory.GOVERNMENT;
  }

  return null;
}

function mapCapacity(
  category: EvacuationLocationCategory,
  properties: Record<string, unknown> | null | undefined,
): number {
  if (category === EvacuationLocationCategory.SCHOOL) {
    const name = String(
      getProperty(properties, ['namobj', 'name', 'nama']) ?? '',
    ).toLowerCase();
    if (name.startsWith('smp') || name.startsWith('mts')) return 150;
    return 250;
  }

  if (category === EvacuationLocationCategory.GOVERNMENT) {
    const name = String(
      getProperty(properties, ['namobj', 'name', 'nama']) ?? '',
    ).toLowerCase();
    if (name.includes('kantor_lurah') || name.includes('kantor lurah')) return 80;
    return 150;
  }

  const unsur = String(
    getProperty(properties, ['nama_unsur']) ?? '',
  ).toLowerCase();
  if (
    unsur.includes('stadion') ||
    unsur.includes('tribun') ||
    unsur.includes('bangunan_olah_raga')
  ) {
    return 1000;
  }

  return 300;
}

function getProperty(
  properties: Record<string, unknown> | null | undefined,
  keys: string[],
): unknown {
  if (!properties) return undefined;

  for (const key of keys) {
    if (properties[key] !== undefined && properties[key] !== null) {
      return properties[key];
    }
  }

  const entries = Object.entries(properties);
  for (const key of keys) {
    const normalizedKey = normalizeText(key);
    const found = entries.find(([propertyKey]) => {
      return normalizeText(propertyKey) === normalizedKey;
    });
    if (found) return found[1];
  }

  return undefined;
}

function getGeoJsonFiles(inputPath: string): string[] {
  const resolvedPath = resolve(inputPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`GeoJSON path not found: ${resolvedPath}`);
  }

  if (extname(resolvedPath).toLowerCase() === '.geojson') {
    return [resolvedPath];
  }

  return readdirSync(resolvedPath)
    .filter((file) =>
      ['.geojson', '.json'].includes(extname(file).toLowerCase()),
    )
    .map((file) => join(resolvedPath, file));
}

function hasSupportedCategory(collection: GeoJsonFeatureCollection): boolean {
  return collection.features.some((feature) => {
    const properties = feature.properties ?? {};
    const categoryValue = getProperty(properties, [
      'category',
      'kategori',
      'jenis',
      'tipe',
    ]);

    return mapCategory(categoryValue) !== null;
  });
}

function parseFeatureCollection(filePath: string): GeoJsonFeatureCollection {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as GeoJsonFeatureCollection;

  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error(`Invalid GeoJSON FeatureCollection: ${filePath}`);
  }

  return parsed;
}

function featureToEvacuationLocationRow(
  feature: GeoJsonFeature,
  filePath: string,
  index: number,
): EvacuationLocationImportRow {
  const properties = feature.properties ?? {};
  const name = getProperty(properties, [
    'name',
    'nama',
    'Nama',
    'NAMOBJ',
    'nama_objek',
    'nama_lokasi',
  ]);

  if (!name || String(name).trim().length === 0) {
    throw new Error(`Feature ${index + 1} in ${filePath} is missing name/nama`);
  }

  if (!feature.geometry) {
    throw new Error(`Feature ${index + 1} in ${filePath} is missing geometry`);
  }

  const categoryValue = getProperty(properties, [
    'category',
    'kategori',
    'jenis',
    'tipe',
  ]);
  const category =
    mapCategory(categoryValue) ??
    mapCategory(basename(filePath, extname(filePath)));

  if (!category) {
    throw new Error(
      `Feature ${index + 1} in ${filePath} has unsupported category: ${String(
        categoryValue,
      )}`,
    );
  }

  const address = getProperty(properties, [
    'address',
    'alamat',
    'Alamat',
    'ALAMAT',
  ]);

  const capacity = mapCapacity(category, properties);

  return {
    name: String(name).trim(),
    category,
    geometry: feature.geometry,
    capacity,
    address: address ? String(address).trim() : undefined,
  };
}

function loadEvacuationLocationRows(inputPath: string): EvacuationLocationImportRow[] {
  const files = getGeoJsonFiles(inputPath);
  const inputIsSingleFile = ['.geojson', '.json'].includes(
    extname(resolve(inputPath)).toLowerCase(),
  );

  if (files.length === 0) {
    throw new Error(`No .geojson/.json files found in ${resolve(inputPath)}`);
  }

  const rows = files.flatMap((filePath) => {
    const collection = parseFeatureCollection(filePath);
    const fileCategory = mapCategory(basename(filePath, extname(filePath)));

    if (!fileCategory && !hasSupportedCategory(collection)) {
      if (!inputIsSingleFile) {
        console.warn(`Skipping non-EvacuationLocation GeoJSON: ${filePath}`);
        return [];
      }
    }

    return collection.features.map((feature, index) =>
      featureToEvacuationLocationRow(feature, filePath, index),
    );
  });

  if (rows.length === 0) {
    throw new Error(`No EvacuationLocation features found in ${resolve(inputPath)}`);
  }

  return rows;
}

export async function seedPotentialEvacuationLocations(inputPath = DEFAULT_GEOJSON_PATH) {
  const rows = loadEvacuationLocationRows(inputPath);

  // Clear existing EvacuationLocations
  const deleted = await prisma.evacuationLocation.deleteMany();
  console.log(`Cleared ${deleted.count} existing EvacuationLocation rows`);

  // Insert EvacuationLocations one by one (more reliable than transaction with raw SQL)
  let successCount = 0;
  for (const row of rows) {
    try {
      await prisma.$executeRaw`
        INSERT INTO "EvacuationLocation" (
          name,
          category,
          capacity,
          "currentOccupancy",
          geometry,
          geom,
          address,
          condition,
          status,
          facilities,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${row.name},
          ${row.category}::"EvacuationLocationCategory",
          ${row.capacity},
          0,
          ST_AsGeoJSON(
            ST_PointOnSurface(
              ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(row.geometry)}), 4326)
            )
          )::jsonb,
          ST_PointOnSurface(
            ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(row.geometry)}), 4326)
          ),
          ${row.address ?? null},
          ${EvacuationLocationCondition.GOOD}::"EvacuationLocationCondition",
          'ACTIVE'::"EvacuationLocationStatus",
          NULL,
          NOW(),
          NOW()
        )
      `;
      successCount++;
    } catch (error) {
      console.error(`Failed to insert EvacuationLocation: ${row.name}`, error.message);
    }
  }

  console.log(
    `Imported ${successCount}/${rows.length} potential evacuation locations`,
  );
}

async function main() {
  const inputPath = process.env.EvacuationLocation_GEOJSON_PATH || process.argv[2];
  await seedPotentialEvacuationLocations(inputPath || DEFAULT_GEOJSON_PATH);
}

main()
  .catch((error) => {
    console.error('Failed to seed potential EvacuationLocations');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
