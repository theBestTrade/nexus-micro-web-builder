-- NOMAD AI Factory Database Schema

-- 1. Videos Table (원본 및 결과물 영상 정보, 메타데이터 저장)
CREATE TABLE videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_url TEXT, -- 사용자가 입력한 원본 URL 또는 검색된 영상 URL
    storage_path TEXT, -- Supabase Storage 임시 버킷에 저장된 경로
    result_url TEXT, -- 최종 생성된 영상의 URL
    metadata JSONB, -- 폼에서 입력받은 설정값 (콘텐츠 타입, 해상도, 타겟 길이 등)
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Affiliate Links Table (시세차익용 쿠팡/네이버 상품 링크 매칭 정보)
CREATE TABLE affiliate_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    coupang_link TEXT,
    naver_link TEXT,
    expected_profit INTEGER DEFAULT 0, -- 예상 시세차익
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Blog Posts Table (GEO 최적화 블로그 원고)
CREATE TABLE blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL, -- 생성된 마크다운 또는 HTML 형태의 블로그 원고
    platform TEXT, -- 발행 타겟 플랫폼 (예: naver_blog, tistory, wordpress)
    status TEXT DEFAULT 'draft', -- draft, published
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS (Row Level Security) Policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own videos
CREATE POLICY "Users can view own videos" ON videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own videos" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON videos FOR UPDATE USING (auth.uid() = user_id);

-- Policies for related tables based on video ownership
CREATE POLICY "Users can view own affiliate links" ON affiliate_links FOR SELECT USING (
    EXISTS (SELECT 1 FROM videos WHERE videos.id = affiliate_links.video_id AND videos.user_id = auth.uid())
);
CREATE POLICY "Users can view own blog posts" ON blog_posts FOR SELECT USING (
    EXISTS (SELECT 1 FROM videos WHERE videos.id = blog_posts.video_id AND videos.user_id = auth.uid())
);
