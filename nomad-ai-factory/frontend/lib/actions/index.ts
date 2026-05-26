import { VideoRecord } from '../../types/index.ts';
import { generateScript, generateBlogPost } from '../ai/index.ts';
import { generateTTS, processVideo } from '../media/index.ts';
import { getCommerceLinks, CommerceProduct } from '../commerce/index.ts';

// DB 저장, 업데이트 등 백엔드 로직 (Server Actions 시뮬레이션)

export interface PipelineResult {
  success: boolean;
  data?: VideoRecord;
  script?: string;
  blogPost?: string;
  affiliateLinks?: CommerceProduct[];
  error?: string;
}

/**
 * 폼 데이터를 받아 영상을 다운로드하고, 스토리지에 업로드한 뒤 DB에 기록하고 
 * AI 대본 생성 -> TTS 생성 -> 영상 렌더링 -> 커머스 매칭 -> 블로그 생성까지 수행하는 전체 파이프라인
 */
export const saveProject = async (payload: any): Promise<PipelineResult> => {
  try {
    console.log("🚀 [Server Action] 파이프라인 시작");
    console.log("전달받은 페이로드(폼+설정):", payload);
    
    // 로컬 스토리지에서 API 키 가져오기 (실제 환경에서는 서버 환경변수 또는 DB에서 안전하게 조회)
    const settingsStr = localStorage.getItem('nomad-ai-settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const apiKeys = settings.api || {};

    // 1. 영상 다운로드 시뮬레이션
    console.log("⏳ 1/8: 원본 영상 다운로드 중...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Supabase Storage 업로드 시뮬레이션
    console.log("⏳ 2/8: Supabase Storage 임시 버킷에 업로드 중...");
    const mockStoragePath = `temp_bucket/${Date.now()}_source_video.mp4`;
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Supabase DB (videos 테이블) 초기 INSERT
    console.log("⏳ 3/8: DB에 프로젝트 초기 레코드 생성 중...");
    let originalUrl = payload.videoUrl;
    if (payload.mainTab === 'video' && payload.sourceType === 'search') {
      originalUrl = `https://${payload.platform}.com/video/${payload.selectedItemId}`;
    } else if (payload.mainTab === 'product') {
      originalUrl = `https://${payload.productPlatform}.com/product/${payload.selectedItemId}`;
    }

    const mockDbRecord: VideoRecord = {
      id: crypto.randomUUID(),
      user_id: 'mock-user-id-1234',
      original_url: originalUrl,
      storage_path: mockStoragePath,
      result_url: null,
      metadata: {
        mainTab: payload.mainTab,
        sourceType: payload.sourceType,
        platform: payload.platform,
        contentType: payload.contentType,
        shoppingMethod: payload.shoppingMethod,
        targetFormat: payload.targetFormat,
        targetLength: payload.targetLength,
        resolution: payload.resolution,
        translationTone: payload.translationTone,
        ttsActor: payload.ttsActor,
        bgmOption: payload.bgmOption,
      },
      status: 'processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. AI 대본 생성 (Gemini API)
    console.log("⏳ 4/8: Gemini API를 활용한 페르소나 대본 생성 중...");
    let generatedScript = "";
    try {
      generatedScript = await generateScript(payload.translationTone || '한국어');
      console.log("✅ AI 대본 생성 완료");
    } catch (aiError) {
      console.error("⚠️ AI 대본 생성 실패:", aiError);
      generatedScript = "대본 생성 실패: API 키를 확인해주세요.";
    }

    // 5. TTS 오디오 생성 (ElevenLabs / Typecast)
    console.log(`⏳ 5/8: AI 보이스(TTS) 생성 중... (성우: ${payload.ttsActor || 'random'})`);
    const ttsResult = await generateTTS(generatedScript, payload.translationTone || '한국어', apiKeys);
    
    // 6. 영상 렌더링 (FFmpeg)
    console.log(`⏳ 6/8: FFmpeg 기반 최종 영상 렌더링 중... (BGM: ${payload.bgmOption || 'random_suno'})`);
    const finalVideoUrl = await processVideo(
      mockStoragePath, 
      ttsResult.audioUrl, 
      payload.targetFormat || '9:16', 
      payload.resolution || '1080p'
    );

    // 7. 커머스 시세차익 매칭 (쇼핑쇼츠인 경우)
    let affiliateLinks: CommerceProduct[] = [];
    if (payload.contentType === '쇼핑쇼츠-시세차익용' || payload.mainTab === 'product') {
      console.log("⏳ 7/8: 커머스 시세차익 상품 매칭 중...");
      affiliateLinks = await getCommerceLinks(generatedScript);
      console.log("✅ 커머스 매칭 완료");
    } else {
      console.log("⏭️ 7/8: 쇼핑쇼츠가 아니므로 커머스 매칭 건너뜀.");
    }

    // 8. GEO 최적화 블로그 원고 생성
    console.log("⏳ 8/8: GEO 최적화 블로그 원고 생성 중...");
    const blogPost = await generateBlogPost(generatedScript, payload.translationTone || '한국어');
    console.log("✅ 블로그 원고 생성 완료");

    // 9. DB 레코드 업데이트 (완료 상태 및 결과 URL 저장)
    mockDbRecord.status = 'completed';
    mockDbRecord.result_url = finalVideoUrl;
    mockDbRecord.updated_at = new Date().toISOString();

    console.log("🎉 [Server Action] 모든 파이프라인 완료!");
    
    return { 
      success: true, 
      data: mockDbRecord, 
      script: generatedScript,
      blogPost,
      affiliateLinks
    };
  } catch (error) {
    console.error("❌ [Server Action] 파이프라인 실행 중 오류 발생:", error);
    return { success: false, error: "프로젝트 처리 중 오류가 발생했습니다." };
  }
};