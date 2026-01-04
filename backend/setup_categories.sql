-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📦',
    color VARCHAR(20) DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view default and own categories" ON categories;
DROP POLICY IF EXISTS "Users can create own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

-- Create policies
CREATE POLICY "Users can view default and own categories" ON categories
    FOR SELECT USING (is_default = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- Insert default categories (only if they don't exist)
INSERT INTO categories (name, icon, color, is_default) VALUES
    ('Makanan & Minuman', '🍔', '#F59E0B', true),
    ('Transportasi', '🚗', '#3B82F6', true),
    ('Belanja', '🛍️', '#EC4899', true),
    ('Tagihan', '📄', '#EF4444', true),
    ('Hiburan', '🎬', '#8B5CF6', true),
    ('Kesehatan', '💊', '#10B981', true),
    ('Pendidikan', '📚', '#06B6D4', true),
    ('Gaji', '💰', '#22C55E', true),
    ('Investasi', '📈', '#6366F1', true),
    ('Lainnya', '📦', '#6B7280', true)
ON CONFLICT DO NOTHING;
