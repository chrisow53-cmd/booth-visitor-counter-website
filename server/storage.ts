import fs from 'node:fs';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { getSupabaseClient, STORAGE_BUCKET as SUPABASE_BUCKET } from './supabase.js';

export type StorageProviderType = 'gcp' | 'local' | 'supabase';

export interface StorageUploadResult {
  url: string;
  storagePath: string;
  provider: StorageProviderType;
}

const GCS_BUCKET = process.env.GCS_BUCKET_NAME || process.env.GCP_STORAGE_BUCKET || 'cctv-snapshots';
const GCS_PROJECT_ID = process.env.GCP_PROJECT_ID;

// Directory for local fallback storage
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let _gcsClient: Storage | null = null;

/**
 * Returns an instance of Google Cloud Storage client.
 * In GCP environments (Cloud Run, GCE, App Engine), authentication is automatic via Application Default Credentials (ADC).
 * In local or external environments, GOOGLE_APPLICATION_CREDENTIALS or GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY can be used.
 */
export function getGcsClient(): Storage {
  if (_gcsClient) return _gcsClient;

  const options: ConstructorParameters<typeof Storage>[0] = {};

  if (GCS_PROJECT_ID) {
    options.projectId = GCS_PROJECT_ID;
  }

  // Support direct inline credentials from environment variables if provided
  if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
    options.credentials = {
      client_email: process.env.GCP_CLIENT_EMAIL,
      private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  _gcsClient = new Storage(options);
  return _gcsClient;
}

/**
 * Determines which storage provider to use.
 * 1. Explicit STORAGE_PROVIDER ('gcp', 'local', 'supabase')
 * 2. If running on GCP (Cloud Run, App Engine) or GCP credentials/bucket are configured -> 'gcp'
 * 3. If Supabase credentials are configured -> 'supabase'
 * 4. Otherwise -> 'local' (zero-config local disk storage so files are always saved)
 */
export function detectStorageProvider(): StorageProviderType {
  const explicit = (process.env.STORAGE_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'local') return 'local';
  if (explicit === 'gcp' || explicit === 'google') return 'gcp';
  if (explicit === 'supabase') return 'supabase';

  // Auto-detect GCP if running on GCP or GCP config present
  if (
    process.env.K_SERVICE || // GCP Cloud Run
    process.env.GAE_SERVICE || // GCP App Engine
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY)
  ) {
    return 'gcp';
  }

  // If Supabase is explicitly configured with real credentials
  if (
    process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('your-project-ref') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role-key')
  ) {
    return 'supabase';
  }

  // If GCS bucket is explicitly specified
  if (process.env.GCS_BUCKET_NAME || process.env.GCP_STORAGE_BUCKET) {
    return 'gcp';
  }

  // Default to local so it ALWAYS works with zero setup
  return 'local';
}

/**
 * Save file locally on disk in the uploads/ directory.
 */
async function saveLocally(
  buffer: Buffer,
  storagePath: string
): Promise<StorageUploadResult> {
  const targetPath = path.join(UPLOADS_DIR, storagePath);
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  await fs.promises.writeFile(targetPath, buffer);

  // If custom domain or BASE_URL is set (e.g. https://camera.carching.co), use it
  const baseUrl = (process.env.BASE_URL || process.env.APP_URL || '').trim().replace(/\/+$/, '');
  const cleanStoragePath = storagePath.replace(/^\/+/, '');
  const url = baseUrl
    ? `${baseUrl}/uploads/${cleanStoragePath}`
    : `/uploads/${cleanStoragePath}`;

  return {
    url,
    storagePath,
    provider: 'local',
  };
}

/**
 * Uploads a file buffer to Google Cloud Storage (GCP), Local Disk, or Supabase Storage.
 * If GCP upload fails due to missing credentials, it automatically falls back to local disk storage
 * so data is NEVER lost!
 */
export async function uploadToStorage(
  buffer: Buffer,
  storagePath: string,
  mimeType: string
): Promise<StorageUploadResult> {
  const provider = detectStorageProvider();

  // 1. Local disk storage (zero config)
  if (provider === 'local') {
    return saveLocally(buffer, storagePath);
  }

  // 2. Google Cloud Storage (GCP)
  if (provider === 'gcp') {
    try {
      const storage = getGcsClient();
      const bucket = storage.bucket(GCS_BUCKET);
      const file = bucket.file(storagePath);

      await file.save(buffer, {
        contentType: mimeType,
        resumable: false,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      // Public URL formatting:
      // If hosted with custom domain (e.g., https://camera.carching.co) or custom base URL:
      const customBase = process.env.GCS_PUBLIC_URL_BASE || process.env.BASE_URL;
      const cleanStoragePath = storagePath.replace(/^\/+/, '');
      const url = customBase
        ? `${customBase.replace(/\/+$/, '')}/${cleanStoragePath}`
        : `https://storage.googleapis.com/${GCS_BUCKET}/${cleanStoragePath}`;

      return {
        url,
        storagePath,
        provider: 'gcp',
      };
    } catch (gcpErr: any) {
      console.warn(
        `[Storage Warning] GCP Cloud Storage upload failed (${gcpErr.message}). Falling back to local disk storage.`
      );
      // Fallback to local storage so snapshots are never dropped!
      return saveLocally(buffer, storagePath);
    }
  }

  // 3. Supabase fallback
  try {
    const supabase = getSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`[Supabase Storage] Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);

    return {
      url: urlData.publicUrl,
      storagePath,
      provider: 'supabase',
    };
  } catch (supabaseErr: any) {
    console.warn(
      `[Storage Warning] Supabase upload failed (${supabaseErr.message}). Falling back to local disk storage.`
    );
    return saveLocally(buffer, storagePath);
  }
}

export function getActiveStorageInfo() {
  const provider = detectStorageProvider();
  return {
    provider,
    bucket: provider === 'gcp' ? GCS_BUCKET : (provider === 'supabase' ? SUPABASE_BUCKET : 'local-disk'),
    domain: process.env.BASE_URL || process.env.APP_URL || 'camera.carching.co',
  };
}
