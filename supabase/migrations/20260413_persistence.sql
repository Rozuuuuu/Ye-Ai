-- 1. Create the 'captures' table to store fashion analysis results
CREATE TABLE IF NOT EXISTS public.captures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    image_url TEXT NOT NULL,
    vibe_score INT NOT NULL,
    verdict_quote TEXT NOT NULL,
    vibe_label TEXT NOT NULL,
    vibe_color TEXT NOT NULL,
    suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    palette JSONB NOT NULL DEFAULT '[]'::jsonb,
    lykdat_data JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;

-- 3. Create Public Policies (allows anyone to view/add to the archive for this demo)
CREATE POLICY "Allow public select" ON public.captures FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.captures FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.captures FOR DELETE USING (true);

-- 4. Create the storage bucket for outfit images
-- Note: Using the Supabase storage extension API via SQL
-- We check if the bucket exists first to avoid errors
INSERT INTO storage.buckets (id, name, public) 
VALUES ('outfits', 'outfits', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up storage policies for the 'outfits' bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'outfits');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'outfits');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'outfits');
