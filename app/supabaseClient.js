import { createClient } from '@supabase/supabase-js';

// Supabase 대시보드에서 복사한 값을 여기에 넣어주세요!
const SUPABASE_URL = 'https://refvqeoqjziatcgtldkk.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZnZxZW9xanppYXRjZ3RsZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5Nzg3MTgsImV4cCI6MjEwNTU1NDcxOH0.EgMrkePnphToYbzxNu0kgfKBh4EK8BUlBccwJPioGcY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
