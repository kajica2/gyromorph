import { createClient, User } from '@supabase/supabase-js';
import { Asset, AssetType, Model3D } from '../types';

// Fallback to provided keys if env vars are missing (for demo/dev purposes)
// In production, ensure these are set in the Vercel dashboard.
const FALLBACK_URL = 'https://lhgwnrwwhaalojdpkwuo.supabase.com';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoaGVkeWxyZXVseG9wdGl5cmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTY1MDcsImV4cCI6MjA3ODE3MjUwN30.lUsn5Y_-hwlq4JaLtdxhbsaVwlIOfCn1P8P6YAQbDyE';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/*
  REQUIRED STORAGE + SCHEMA (run in Supabase SQL editor):

  1. Storage Buckets:
     - 'assets' (public) for shared audio/video/3D/image files
     - 'user-content' (private) for per-user uploads (optional)

  2. Assets Table:
     create table public.assets (
       id uuid default gen_random_uuid() primary key,
       name text not null,
       url text not null,
       type text not null check (type in ('model','video','audio','image')),
       thumbnail_url text,
       category text,
       size bigint,
       created_at timestamptz default now()
     );

     alter table public.assets enable row level security;

     create policy "Public read assets"
       on public.assets for select using (true);

     -- replace with stricter policy in prod
     create policy "Allow insert assets"
       on public.assets for insert
       with check (true);
*/

// --- AUTH SERVICES ---

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// --- STORAGE SERVICES ---

/**
 * Uploads a file for a specific user following the structure:
 * users/{user-id}/{content-type}/{file-id}
 */
export const uploadUserFile = async (
  file: File,
  userId: string,
  contentType: 'images' | 'videos' | 'models' | 'audio'
): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  // Generate unique filename
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
  // Path: users/{user-id}/{content-type}/{file-name}
  const filePath = `users/${userId}/${contentType}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('user-content') // Ensure this bucket exists in Supabase
    .upload(filePath, file);

  if (uploadError) {
    console.error(`Error uploading to ${contentType}:`, uploadError);
    // Fallback for demo: try 'models' bucket if 'user-content' fails or doesn't exist
    if (contentType === 'models') {
       console.log('Falling back to public models bucket...');
       return uploadModel(file).then(m => m ? m.url : null);
    }
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('user-content')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const uploadAsset = async (file: File, type: AssetType): Promise<Asset | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}s/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Error uploading asset:', uploadError);
    alert(`Upload failed: ${uploadError.message}`);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(fileName);

  const { data, error: dbError } = await supabase
    .from('assets')
    .insert([{
      name: file.name,
      url: publicUrl,
      type,
      size: file.size,
      category: 'User Upload'
    }])
    .select()
    .single();

  if (dbError) {
    console.error('Error saving asset:', dbError);
    alert(`Database save failed: ${dbError.message}`);
    return null;
  }

  return data as Asset;
};

export const fetchAssets = async (type?: AssetType): Promise<Asset[]> => {
  let query = supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assets:', error);
    // Fallback to legacy models table for backwards compatibility
    if (!type || type === 'model') return fetchLegacyModels();
    return [];
  }

  return data as Asset[];
};

const fetchLegacyModels = async (): Promise<Model3D[]> => {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching legacy models:', error);
    return [];
  }

  return data.map((entry: any) => ({ ...entry, type: 'model' })) as Model3D[];
};

export const fetchModels = async (): Promise<Model3D[]> => {
  const assets = await fetchAssets('model');
  return assets as Model3D[];
};

export const uploadModel = async (file: File): Promise<Model3D | null> => {
  const uploaded = await uploadAsset(file, 'model');
  return uploaded as Model3D | null;
};
