import { createClient, User } from '@supabase/supabase-js';
import { Model3D } from '../types';

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
  REQUIRED SQL SCHEMA & STORAGE:

  1. Storage Buckets:
     - 'models' (public): For shared 3D models
     - 'user-content' (public/private): For user-specific uploads
       Policy: users can insert/select own objects; public read if shared.

  2. Tables:
     create table public.models (
       id uuid default gen_random_uuid() primary key,
       name text not null,
       url text not null,
       thumbnail_url text,
       category text,
       created_at timestamptz default now(),
       user_id uuid references auth.users(id)
     );
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
  contentType: 'images' | 'videos' | 'models'
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

export const uploadModel = async (file: File): Promise<Model3D | null> => {
  // 1. Upload file to Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('models')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    alert(`Upload failed: ${uploadError.message}`);
    return null;
  }

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('models')
    .getPublicUrl(filePath);

  // 3. Save record to Database
  const { data, error: dbError } = await supabase
    .from('models')
    .insert([
      {
        name: file.name,
        url: publicUrl,
        category: 'User Upload',
        // No thumbnail for now, maybe add a default one or generate later
      }
    ])
    .select()
    .single();

  if (dbError) {
    console.error('Error saving model to database:', dbError);
    alert(`Database save failed: ${dbError.message}`);
    return null;
  }

  return data as Model3D;
};

export const fetchModels = async (): Promise<Model3D[]> => {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching models:', error);
    return [];
  }

  return data as Model3D[];
};
