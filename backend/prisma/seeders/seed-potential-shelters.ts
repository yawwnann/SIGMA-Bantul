import {
  PrismaClient,
  ShelterCategory,
  ShelterCondition,
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

type ShelterImportRow = {
  name: string;
  category: ShelterCategory;
  geometry: GeoJsonGeometry;
  address?: string;
};

const DEFAULT_GEOJSON_PATH = resolve(
  process.cwd(),
  'Data',
  'GeoJSon',
  'lokasi_potensial_evakuasi.geojson',
);

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function mapCategory(value: unknown): ShelterCategory | null {
  const normalized = normalizeText(value);

  if (['sekolah', 'school'].includes(normalized)) {
    return ShelterCategory.SCHOOL;
  }

  if (['lapangan', 'field'].includes(normalized)) {
    return ShelterCategory.FIELD;
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
    return ShelterCategory.GOVERNMENT;
  }

  return null;
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

function featureToShelterRow(
  feature: GeoJsonFeature,
  filePath: string,
  index: number,
): ShelterImportRow {
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

  return {
    name: String(name).trim(),
    category,
    geometry: feature.geometry,
    address: address ? String(address).trim() : undefined,
  };
}

function loadShelterRows(inputPath: string): ShelterImportRow[] {
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
        console.warn(`Skipping non-shelter GeoJSON: ${filePath}`);
        return [];
      }
    }

    return collection.features.map((feature, index) =>
      featureToShelterRow(feature, filePath, index),
    );
  });

  if (rows.length === 0) {
    throw new Error(`No shelter features found in ${resolve(inputPath)}`);
  }

  return rows;
}

export async function seedPotentialShelters(inputPath = DEFAULT_GEOJSON_PATH) {
  const rows = loadShelterRows(inputPath);

  // Clear existing shelters
  const deleted = await prisma.shelter.deleteMany();
  console.log(`Cleared ${deleted.count} existing Shelter rows`);

  // Insert shelters one by one (more reliable than transaction with raw SQL)
  let successCount = 0;
  for (const row of rows) {
    try {
      await prisma.$executeRaw`
        INSERT INTO "Shelter" (
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
          ${row.category}::"ShelterCategory",
          0,
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
          ${ShelterCondition.GOOD}::"ShelterCondition",
          'ACTIVE'::"ShelterStatus",
          NULL,
          NOW(),
          NOW()
        )
      `;
      successCount++;
    } catch (error) {
      console.error(`Failed to insert shelter: ${row.name}`, error.message);
    }
  }

  console.log(
    `Imported ${successCount}/${rows.length} potential evacuation locations`,
  );
}

async function main() {
  const inputPath = process.env.SHELTER_GEOJSON_PATH || process.argv[2];
  await seedPotentialShelters(inputPath || DEFAULT_GEOJSON_PATH);
}

main()
  .catch((error) => {
    console.error('Failed to seed potential shelters');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
