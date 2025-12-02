/**
 * Serviço de armazenamento de arquivos usando MinIO (S3 compatível)
 */
import { Client as MinioClient } from 'minio';
import { nanoid } from 'nanoid';
import path from 'path';

// Configuração do cliente MinIO
const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
};

const BUCKET_NAME = process.env.MINIO_BUCKET || 'onboarding-files';
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || '';

let minioClient: MinioClient | null = null;

/**
 * Inicializa o cliente MinIO
 */
export function getMinioClient(): MinioClient | null {
  if (!minioConfig.accessKey || !minioConfig.secretKey) {
    console.warn('[MINIO] Credenciais não configuradas. Defina MINIO_ACCESS_KEY e MINIO_SECRET_KEY.');
    return null;
  }

  if (!minioClient) {
    minioClient = new MinioClient(minioConfig);
  }

  return minioClient;
}

/**
 * Verifica se o serviço está configurado
 */
export function isStorageConfigured(): boolean {
  return !!(minioConfig.accessKey && minioConfig.secretKey);
}

/**
 * Garante que o bucket existe, criando-o se necessário
 */
export async function ensureBucketExists(): Promise<boolean> {
  const client = getMinioClient();
  if (!client) return false;

  try {
    const exists = await client.bucketExists(BUCKET_NAME);
    if (!exists) {
      await client.makeBucket(BUCKET_NAME);
      console.log(`[MINIO] Bucket '${BUCKET_NAME}' criado com sucesso.`);

      // Configurar política de acesso público para leitura (opcional)
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      await client.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
    }
    return true;
  } catch (error) {
    console.error('[MINIO] Erro ao verificar/criar bucket:', error);
    return false;
  }
}

/**
 * Gera um nome de arquivo único
 */
function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 50);
  const uniqueId = nanoid(10);
  return `${baseName}-${uniqueId}${ext}`;
}

/**
 * Determina o diretório baseado no tipo de entidade
 */
function getUploadDirectory(entityType?: string): string {
  switch (entityType) {
    case 'client':
      return 'clients';
    case 'visit':
      return 'visits';
    case 'user':
      return 'users';
    case 'document':
      return 'documents';
    default:
      return 'general';
  }
}

export interface UploadResult {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  bucket: string;
  key: string;
}

/**
 * Faz upload de um arquivo
 */
export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  options?: {
    entityType?: string;
    entityId?: string;
  }
): Promise<UploadResult | null> {
  const client = getMinioClient();
  if (!client) {
    console.error('[MINIO] Cliente não inicializado');
    return null;
  }

  try {
    await ensureBucketExists();

    const directory = getUploadDirectory(options?.entityType);
    const fileName = generateUniqueFileName(originalName);
    const key = `${directory}/${fileName}`;

    // Fazer upload
    await client.putObject(BUCKET_NAME, key, fileBuffer, fileBuffer.length, {
      'Content-Type': mimeType,
      'x-amz-meta-original-name': originalName,
      ...(options?.entityType && { 'x-amz-meta-entity-type': options.entityType }),
      ...(options?.entityId && { 'x-amz-meta-entity-id': options.entityId }),
    });

    // Gerar URL pública
    const url = PUBLIC_URL
      ? `${PUBLIC_URL}/${key}`
      : `${minioConfig.useSSL ? 'https' : 'http'}://${minioConfig.endPoint}:${minioConfig.port}/${BUCKET_NAME}/${key}`;

    console.log(`[MINIO] Arquivo '${originalName}' enviado com sucesso: ${key}`);

    return {
      fileName,
      originalName,
      mimeType,
      size: fileBuffer.length,
      url,
      bucket: BUCKET_NAME,
      key,
    };
  } catch (error) {
    console.error('[MINIO] Erro ao fazer upload:', error);
    return null;
  }
}

/**
 * Gera uma URL de download temporária (presigned)
 */
export async function getPresignedUrl(key: string, expirySeconds: number = 3600): Promise<string | null> {
  const client = getMinioClient();
  if (!client) return null;

  try {
    const url = await client.presignedGetObject(BUCKET_NAME, key, expirySeconds);
    return url;
  } catch (error) {
    console.error('[MINIO] Erro ao gerar URL presigned:', error);
    return null;
  }
}

/**
 * Deleta um arquivo
 */
export async function deleteFile(key: string): Promise<boolean> {
  const client = getMinioClient();
  if (!client) return false;

  try {
    await client.removeObject(BUCKET_NAME, key);
    console.log(`[MINIO] Arquivo '${key}' deletado com sucesso.`);
    return true;
  } catch (error) {
    console.error('[MINIO] Erro ao deletar arquivo:', error);
    return false;
  }
}

/**
 * Lista arquivos em um diretório
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const client = getMinioClient();
  if (!client) return [];

  try {
    const files: string[] = [];
    const stream = client.listObjects(BUCKET_NAME, prefix, true);

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        if (obj.name) files.push(obj.name);
      });
      stream.on('error', reject);
      stream.on('end', () => resolve(files));
    });
  } catch (error) {
    console.error('[MINIO] Erro ao listar arquivos:', error);
    return [];
  }
}

/**
 * Obtém informações de um arquivo
 */
export async function getFileInfo(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
} | null> {
  const client = getMinioClient();
  if (!client) return null;

  try {
    const stat = await client.statObject(BUCKET_NAME, key);
    return {
      size: stat.size,
      contentType: stat.metaData?.['content-type'] || 'application/octet-stream',
      lastModified: stat.lastModified,
      etag: stat.etag,
    };
  } catch (error) {
    console.error('[MINIO] Erro ao obter informações do arquivo:', error);
    return null;
  }
}
