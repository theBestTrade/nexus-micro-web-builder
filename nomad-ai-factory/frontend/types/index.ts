export interface User {
  id: string;
  name: string;
  provider: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;   // 인증 상태 초기화 완료 여부 (로딩 전 오판 방지)
  login: (provider: string) => void;
  logout: () => void;
}

// Database Models
export interface VideoRecord {
  id: string;
  user_id: string;
  original_url: string | null;
  storage_path: string | null;
  result_url: string | null;
  metadata: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface AffiliateLinkRecord {
  id: string;
  video_id: string;
  product_name: string;
  coupang_link: string | null;
  naver_link: string | null;
  expected_profit: number;
  created_at: string;
}

export interface BlogPostRecord {
  id: string;
  video_id: string;
  title: string | null;
  content: string;
  platform: string | null;
  status: 'draft' | 'published';
  created_at: string;
}
