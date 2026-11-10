import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readWatchIntelligence, type IntelligenceRead } from '@/lib/watch-intelligence';

/** Metadata-only sibling overlay: never owns or changes a video element. */
export function WatchIntelligencePanel({ preview }: { preview: boolean }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<IntelligenceRead | null>(null);
  useEffect(() => {
    if (!open) return;
    let current = true;
    void readWatchIntelligence(preview).then(data => { if (current) setRead(data); });
    return () => { current = false; };
  }, [open, preview]);
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button type="button" variant="outline" className="g1-story-trigger"><BookOpen size={15}/>이 시계의 이야기</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="sheet-backdrop"/><Dialog.Content className="g1-story-sheet" aria-describedby="g1-story-description" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}><header className="g1-sheet-header"><Dialog.Title>이 시계의 이야기</Dialog.Title><Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="이야기 닫기"><X/></Button></Dialog.Close></header><Dialog.Description id="g1-story-description" className="g1-disclaimer">개발 미리보기 · 실제 역사나 제조사 검증 정보가 아닙니다.</Dialog.Description><div className="g1-story-body">{!read ? <p role="status">불러오는 중…</p> : read.status === 'unavailable' ? <p>검토된 시계 이야기가 아직 없습니다.</p> : read.data.claims.map(claim => <section key={claim.claimId}><h3>{claim.text.split('\n')[0]}</h3><p>{claim.text.split('\n')[1]}</p></section>)}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
