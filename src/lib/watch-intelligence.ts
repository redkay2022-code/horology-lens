import { editorialSchema, type EditorialVersion } from './watch-knowledge';
export type IntelligenceRead = { status: 'unavailable'; data: null } | { status: 'mock-only'; data: EditorialVersion };
export async function readWatchIntelligence(preview: boolean): Promise<IntelligenceRead> {
  if (!preview) return { status: 'unavailable', data: null };
  return { status: 'mock-only', data: editorialSchema.parse({ contractVersion: 'watch-intelligence.v1', modelKey: 'preview-only', revision: 1, locale: 'ko', scope: 'model', status: 'mock-only', sources: [], claims: [
    ['history', '시계 역사', '검수된 브랜드 역사 자료를 위한 자리입니다.'],
    ['heritage', '컬렉션의 헤리티지', '컬렉션의 탄생 배경은 출처 검토 후 제공됩니다.'],
    ['evolution', '모델의 변화', '레퍼런스별 변화는 정확한 모델 자료 확인이 필요합니다.'],
    ['design', '디자인 특징', '관찰과 공식 디자인 설명을 구분해 담을 예정입니다.'],
    ['movement', '무브먼트', '공식 기술 사양이 검수되기 전에는 내용을 제공하지 않습니다.'],
    ['craftsmanship', '제작과 마감', '제작 기술의 설명은 승인된 자료가 필요합니다.'],
    ['collectors', '컬렉터의 관점', '컬렉터 문화와 별칭은 별도 출처 검토가 필요합니다.'],
    ['sources', '출처', '승인된 출처가 없습니다. 실제 역사나 사양이 아닙니다.'],
  ].map(([section, title, body]) => ({ claimId: section, section, text: `${title}\n${body}`, classification: 'placeholder', sourceIds: [], status: 'mock' })) }) };
}
