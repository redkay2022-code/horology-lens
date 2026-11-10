import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronRight, Film, LoaderCircle, Search, Watch, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CatalogRecord } from '@/lib/catalog.functions';
import type { CreationWatch } from '@/lib/creation-watch';

export type CreationLanguage = 'KO' | 'EN';
export const creationText = (lang: CreationLanguage, ko: string, en: string) => lang === 'KO' ? ko : en;

export function CreationSheet({ open, onClose, title, lang, onLanguage, busy = false, children }: { open: boolean; onClose: () => void; title: string; lang: CreationLanguage; onLanguage: () => void; busy?: boolean; children: ReactNode }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const resize = () => { node.current?.style.setProperty('--creation-height', `${viewport?.height ?? window.innerHeight}px`); node.current?.style.setProperty('--creation-bottom', `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`); };
    resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
    return () => { viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); };
  }, [open]);
  return <Dialog.Root open={open} onOpenChange={v => { if (!v && !busy) onClose(); }}><Dialog.Portal><Dialog.Overlay className="sheet-backdrop"/><Dialog.Content ref={node} className="creation-sheet" aria-describedby={undefined} onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }}><header className="creation-header"><div><span className="wordmark">WRISTORY</span><Dialog.Title>{title}</Dialog.Title></div><Button variant="ghost" onClick={onLanguage} className="creation-language" aria-label="Creation language">{lang}</Button><Dialog.Close asChild><Button variant="ghost" size="icon" disabled={busy} className="creation-close" aria-label="Close creation"><X/></Button></Dialog.Close></header>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export function CreationFooter({ busy, disabled = false, lang, text }: { busy: boolean; disabled?: boolean; lang: CreationLanguage; text: string }) {
  return <footer className="creation-footer"><Button type="submit" disabled={busy || disabled} aria-busy={busy} className="creation-submit">{busy ? <LoaderCircle className="creation-spinner"/> : <Check/>}{busy ? creationText(lang, '저장 중…', 'Saving…') : text}</Button></footer>;
}

export function WatchIdentification({ catalog, value, onChange, lang, collection }: { catalog: CatalogRecord[]; value: CreationWatch; onChange: (v: CreationWatch) => void; lang: CreationLanguage; collection?: ReactNode }) {
  const [query, setQuery] = useState('');
  const id = useId();
  const selected = catalog.find(c => c.id === value.catalogId);
  const filtered = catalog.filter(c => `${c.brand} ${c.model} ${c.reference}`.toLowerCase().includes(query.toLowerCase()));
  const t = (ko: string, en: string) => creationText(lang, ko, en);
  return <section className="creation-section"><h3><Watch/>{t('시계 정보', 'Watch identification')}</h3>{collection}<label className="creation-label">{t('확인된 모델 검색', 'Search confirmed models')}<span className="creation-search"><Search/><input aria-label="Search confirmed models" placeholder={t('브랜드 · 모델 · 레퍼런스', 'Brand · model · reference')} value={query} onChange={e => setQuery(e.target.value)}/></span></label><label className="creation-label" htmlFor={`${id}-catalog`}>{t('모델 선택', 'Select model')}<select id={`${id}-catalog`} aria-label="Confirmed model" value={value.catalogId} onChange={e => onChange({ ...value, catalogId: e.target.value })}><option value="">{t('직접 입력 / 목록에 없음', 'Manual entry / not listed')}</option>{(selected && !filtered.includes(selected) ? [selected, ...filtered] : filtered).map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} · {c.reference}</option>)}</select></label>{!value.catalogId && <div className="creation-manual">{(['brand', 'model', 'reference'] as const).map((key, i) => <label className="creation-label" key={key}>{[t('브랜드', 'Brand'), t('모델', 'Model'), t('레퍼런스 (선택)', 'Reference (optional)')][i]}<input aria-label={key === 'brand' ? 'Brand' : key === 'model' ? 'Model' : 'Reference'} maxLength={[60,80,40][i]} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })}/></label>)}</div>}<div className="creation-summary"><Watch/><div><small>{selected ? t('카탈로그 모델', 'Catalog model') : t('직접 입력 · 모델 미확인', 'Manual entry · unconfirmed')}</small><strong>{selected ? `${selected.brand} ${selected.model}` : [value.brand, value.model].filter(Boolean).join(' ') || t('시계를 선택해 주세요', 'Select your watch')}</strong><span>{selected?.reference || value.reference || '—'}</span></div></div></section>;
}

export function CreationChooser({ open, onClose, onVideo, onCollection }: { open: boolean; onClose: () => void; onVideo: () => void; onCollection: () => void }) {
  const [lang, setLang] = useState<CreationLanguage>('KO');
  return <CreationSheet open={open} onClose={onClose} title={creationText(lang, '새로운 시계 이야기', 'Create a wrist story')} lang={lang} onLanguage={() => setLang(lang === 'KO' ? 'EN' : 'KO')}><div className="creation-choices">{[{ Icon: Film, ko: '시계 영상 게시', en: 'Post a Watch Video', subKo: '손목 위의 순간을 공유하세요', subEn: 'Share a moment on your wrist', action: onVideo }, { Icon: Watch, ko: '내 컬렉션에 시계 추가', en: 'Add a Watch to My Collection', subKo: '나만의 시계 기록', subEn: 'Your personal watch record', action: onCollection }].map(item => <Button key={item.en} variant="ghost" className="creation-choice" onClick={item.action}><item.Icon/><span><strong>{creationText(lang,item.ko,item.en)}</strong><small>{creationText(lang,item.subKo,item.subEn)}</small></span><ChevronRight/></Button>)}</div></CreationSheet>;
}