import { createFileRoute } from '@tanstack/react-router';
import { G3RecognitionWorkspace } from '@/components/horology/g3-recognition-workspace';
export const Route=createFileRoute('/multi-image-preview')({
  head:()=>({meta:[{title:'WRISTORY — G3 다중 이미지 개발 검토'},{name:'description',content:'실제 AI 전송 없이 다중 이미지 계약을 검토하는 WRISTORY 개발 화면.'},{property:'og:title',content:'WRISTORY — G3 다중 이미지 개발 검토'},{property:'og:description',content:'독립 모의 검토. 실제 AI·게시·저장 없음.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex, nofollow'}]}),
  component:G3RecognitionWorkspace,
});