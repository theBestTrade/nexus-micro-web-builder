
import { createClient } from '@supabase/supabase-js';

/**
 * [Supabase 데이터베이스 구조 기획]
 * 
 * 테이블명: guestbook_messages
 * 
 * 컬럼 구성:
 * 1. id (uuid, primary key): 메시지 고유 식별자 (기본값: uuid_generate_v4())
 * 2. name (text): 작성자 이름 (필수)
 * 3. content (text): 축하 메시지 내용 (필수)
 * 4. relation (text): 신랑/신부와의 관계 (선택)
 * 5. timestamp (bigint): 작성 시간 (기본값: now()의 unix timestamp 또는 timestamptz)
 * 
 * 보안 설정 (RLS):
 * - SELECT: 모든 사용자 허용 (누구나 읽기 가능)
 * - INSERT: 모든 사용자 허용 (누구나 작성 가능)
 * - UPDATE/DELETE: 관리자 권한 또는 특정 인증된 사용자만 허용
 */

// 실제 프로젝트의 URL과 Anon Key를 입력해야 작동합니다.
const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseKey = 'your-anon-key';

// 환경 변수가 설정되지 않은 경우 null을 반환하여 로컬 스토리지 모드로 동작하게 함
export const supabase = (supabaseUrl !== 'https://your-project-id.supabase.co') 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const GUESTBOOK_TABLE = 'guestbook_messages';
