import { createFileRoute } from '@tanstack/react-router';
import { G1PreviewWorkspace } from '@/components/horology/g1-preview-workspace';
export const Route = createFileRoute('/recognition-preview')({
  head: () => ({ meta: [
    { title: 'WRISTORY — G1 인식 개발 미리보기' },
    { name: 'description', content: 'WRISTORY 자동 장면 준비와 모의 시계 식별·이야기 검토 화면. 서버 게시와 실제 AI 호출 없음.' },
    { property: 'og:title', content: 'WRISTORY — G1 인식 개발 미리보기' },
    { property: 'og:description', content: '자동 준비·모의 식별·최종 확인의 개발 전용 검토 화면.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: G1PreviewWorkspace,
});
