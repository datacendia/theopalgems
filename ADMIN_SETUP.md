# Admin Panel Setup Guide

## 🚨 Critical Dependencies Setup

### 1. Supabase Configuration
Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Required Tables:**
- `watches` (id, brand, name, price, description, image, url)
- `products` (id, name, image, sku, location, price, price_num, ctw, gold, diamond, cert, qty, category)
- `locations` (key, name, city, address, description, long_description, hours, phone, hotel_image, map_url, map_embed, status)
- `sections` (key, value)
- `photos` (id, src, alt, section)

**Required Storage Bucket:**
- `GALLERY` (public bucket for photo uploads)

### 2. Database Setup Script
Run this SQL in your Supabase SQL Editor:

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS watches (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL,
  description TEXT,
  image TEXT,
  url TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  sku TEXT,
  location TEXT,
  price TEXT,
  price_num DECIMAL,
  ctw TEXT,
  gold TEXT,
  diamond TEXT,
  cert TEXT,
  qty INTEGER,
  category TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  description TEXT,
  long_description TEXT,
  hours TEXT,
  phone TEXT,
  hotel_image TEXT,
  map_url TEXT,
  map_embed TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS sections (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  src TEXT NOT NULL,
  alt TEXT NOT NULL,
  section TEXT NOT NULL
);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('GALLERY', 'GALLERY', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'GALLERY');
CREATE POLICY "Anyone can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'GALLERY');
CREATE POLICY "Anyone can update photos" ON storage.objects FOR UPDATE USING (bucket_id = 'GALLERY');
CREATE POLICY "Anyone can delete photos" ON storage.objects FOR DELETE USING (bucket_id = 'GALLERY');

-- Enable RLS
ALTER TABLE watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations" ON watches FOR ALL USING (true);
CREATE POLICY "Enable all operations" ON products FOR ALL USING (true);
CREATE POLICY "Enable all operations" ON locations FOR ALL USING (true);
CREATE POLICY "Enable all operations" ON sections FOR ALL USING (true);
CREATE POLICY "Enable all operations" ON photos FOR ALL USING (true);
```

### 3. Environment Variables
Ensure your `.env` file contains:
- Supabase URL and anon key
- Default admin password: `opalgems2024`

### 4. Verification Checklist
- [ ] Supabase project created
- [ ] Environment variables set
- [ ] Database tables created
- [ ] Storage bucket created
- [ ] RLS policies enabled
- [ ] Admin login works with default password
- [ ] Photo upload functionality works
- [ ] All admin pages load without errors

### 5. Testing
1. Navigate to `/admin`
2. Login with password: `opalgems2024`
3. Test each admin section:
   - Dashboard loads stats
   - Watches CRUD operations
   - Products management
   - Photo upload/download
   - Locations management
   - Sections editing

### 6. Troubleshooting
**Common Issues:**
- **CORS errors**: Check Supabase settings
- **Upload failures**: Verify storage bucket exists
- **Login issues**: Check environment variables
- **Database errors**: Run SQL setup script

**Error Messages:**
- "Storage configuration error": Create GALLERY bucket
- "Unable to load photos": Check database connection
- "Invalid file type": Check file upload validation
