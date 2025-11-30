import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase-admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'uploads';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Allowed buckets for security
const ALLOWED_BUCKETS = ['uploads', 'documents', 'load-photos', 'receipts'];

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const bucketParam = formData.get('bucket') as string | null;
  const folderParam = formData.get('folder') as string | null;

  // Validate and select bucket
  const BUCKET = bucketParam && ALLOWED_BUCKETS.includes(bucketParam) ? bucketParam : DEFAULT_BUCKET;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop() || 'jpg';
    const baseFileName = `${randomUUID()}.${ext}`;
    // Support folder paths for organizing files
    const fileName = folderParam ? `${folderParam}/${baseFileName}` : baseFileName;

    // Prefer service role for bucket create; fall back to anon for existing buckets
    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabase = hasServiceKey
      ? createServiceRoleClient()
      : createSupabaseClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    const uploadOnce = () =>
      supabase.storage.from(BUCKET).upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    let { error } = await uploadOnce();

    if (error && hasServiceKey) {
      const statusCode = (error as any)?.statusCode;
      const isNotFound =
        statusCode === 404 ||
        statusCode === '404' ||
        /bucket.*not.*found/i.test(error.message);
      if (isNotFound) {
        // Attempt to create the bucket on the fly (public) then retry
        const { error: bucketError } = await supabase.storage.createBucket(BUCKET, { public: true });
        if (bucketError && !/exists/i.test(bucketError.message)) {
          console.error('Error creating bucket:', bucketError);
          return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 });
        }
        // Retry the upload once after creating bucket
        const retryResult = await uploadOnce();
        if (retryResult.error) {
          console.error('Error during retry upload:', retryResult.error);
          return NextResponse.json({ error: 'Failed to upload file after creating bucket' }, { status: 500 });
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
        return NextResponse.json(
          { publicUrl: publicUrl, path: fileName },
          { status: 200 }
        );
      }
    } else if (error && !hasServiceKey) {
      const statusCode = (error as any)?.statusCode;
      const isNotFound =
        statusCode === 404 ||
        statusCode === '404' ||
        /bucket.*not.*found/i.test(error.message);
      if (isNotFound) {
        return NextResponse.json(
          {
            error:
              'Storage bucket not found. Provide SUPABASE_SERVICE_ROLE_KEY or create the bucket ' +
              `"${BUCKET}" in Supabase Storage.`,
          },
          { status: 500 }
        );
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('[upload] Failed to upload file', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
