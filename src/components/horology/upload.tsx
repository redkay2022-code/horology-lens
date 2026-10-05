import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Upload, Check, ArrowLeft, ArrowRight, Sparkles, Wand2, Scissors, SlidersHorizontal, Type, Music, Search, Pause, Play, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from './sheets';
import { useCommunity } from './store';
import { watches } from './data';

const ASPECTS = [{ id: '9/16', label: '9:16', name: 'Full Vertical' }, { id: '1/1', label: '1:1', name: 'Square' }, { id: '4/5', label: '4:5', name: 'Portrait' }];
const FILTERS = [
  { id: 'Original', css: '' },
  { id: 'Steel Crisp', css: 'contrast(1.18) saturate(0.75) brightness(1.04) hue-rotate(-8deg)' },
  { id: 'Vintage Warm', css: 'sepia(0.35) saturate(1.15) contrast(0.95) brightness(1.03)' },
  { id: 'Lume Glow', css: 'brightness(1.12) saturate(1.3) hue-rotate(40deg) contrast(1.05)' },
];
const FONTS = [{ id: 'Display', cls: 'text-style-display' }, { id: 'Serif', cls: 'text-style-serif' }, { id: 'Mono', cls: 'text-style-mono' }];
const CATEGORIES = ['Trending Beats', 'Watch Lo-Fi', 'Jazz', 'Mechanical ASMR'];
const TRACKS = [
  { title: 'Midnight Escapement', artist: 'Calibre Collective', cat: 'Trending Beats', length: 142 },
  { title: 'Golden Hour Bezel', artist: 'Nova Sweep', cat: 'Trending Beats', length: 118 },
  { title: 'Rotor Dreams', artist: 'lofi horologist', cat: 'Watch Lo-Fi', length: 165 },
  { title: 'Sapphire Rain', artist: 'Tick & Tape', cat: 'Watch Lo-Fi', length: 131 },
  { title: 'Blue Note Chronograph', artist: 'The Complication Trio', cat: 'Jazz', length: 204 },
  { title: 'Smoky Dial Ballad', artist: 'Ella Tourbillon', cat: 'Jazz', length: 176 },
  { title: '28,800 Beats', artist: 'Mechanical ASMR Lab', cat: 'Mechanical ASMR', length: 90 },
  { title: 'Crown Wind Whisper', artist: 'Mainspring Sounds', cat: 'Mechanical ASMR', length: 75 },
];
const TOOLS = [
  { id: 'filters', label: 'Filters', icon: Wand2 }, { id: 'trim', label: 'Trim', icon: Scissors },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal }, { id: 'text', label: 'Text', icon: Type }, { id: 'music', label: 'Music', icon: Music },
] as const;
type Tool = typeof TOOLS[number]['id'];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function Range({ label, value, onChange, min = 0, max = 100, suffix = '%' }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return <label className="editor-range"><span>{label}<strong>{value}{suffix}</strong></span><input type="range" aria-label={label} min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

export function UploadSheet() {
  const { uploadOpen, closeUpload, addUpload } = useCommunity();
  const input = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [aspect, setAspect] = useState('9/16');
  const [tool, setTool] = useState<Tool>('filters');
  const [filter, setFilter] = useState('Original');
  const [duration, setDuration] = useState(30);
  const [trim, setTrim] = useState<[number, number]>([0, 30]);
  const [adj, setAdj] = useState({ brightness: 100, contrast: 100, saturation: 100, vignette: 20 });
  const [text, setText] = useState('');
  const [font, setFont] = useState('Display');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Trending Beats');
  const [track, setTrack] = useState<typeof TRACKS[number] | null>(null);
  const [musicStart, setMusicStart] = useState(0);
  const [musicLen, setMusicLen] = useState(30);
  const [vol, setVol] = useState({ original: 80, bgm: 60 });
  const [previewing, setPreviewing] = useState(false);
  const [caption, setCaption] = useState('A closer look at my everyday companion. #Rolex #WOTD');
  const [wrist, setWrist] = useState('16.5');
  const [scan, setScan] = useState(-1);
  const [spec, setSpec] = useState({ brand: '', model: '', ref: '' });

  const isVideo = !!file?.type.startsWith('video/');
  const reset = () => { setStep(1); setFile(null); setUrl(''); setFilter('Original'); setText(''); setTrack(null); setScan(-1); setSpec({ brand: '', model: '', ref: '' }); setAdj({ brightness: 100, contrast: 100, saturation: 100, vignette: 20 }); };
  const close = () => { reset(); closeUpload(); };
  const choose = (next?: File) => {
    if (!next) return;
    if (!next.type.startsWith('video/') && !next.type.startsWith('image/')) { setError('Please select a video or photo.'); return; }
    if (next.size > 200 * 1024 * 1024) { setError('Please choose a file smaller than 200 MB.'); return; }
    setError(''); setFile(next); setUrl(URL.createObjectURL(next));
  };
  const cssFilter = useMemo(() => [FILTERS.find(f => f.id === filter)?.css, `brightness(${adj.brightness / 100}) contrast(${adj.contrast / 100}) saturate(${adj.saturation / 100})`].filter(Boolean).join(' '), [filter, adj]);
  const fontCls = FONTS.find(f => f.id === font)!.cls;

  useEffect(() => { const v = videoRef.current; if (v) v.volume = vol.original / 100; }, [vol.original, url, step]);
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => { if (v.currentTime >= trim[1] || v.currentTime < trim[0]) v.currentTime = trim[0]; };
    v.addEventListener('timeupdate', onTime); return () => v.removeEventListener('timeupdate', onTime);
  }, [trim, url, step]);
  useEffect(() => {
    if (scan < 0 || scan >= 100) return;
    const t = setTimeout(() => setScan(s => Math.min(100, s + 10)), 120);
    if (scan + 10 >= 100) { const b = watches[Math.floor(Math.random() * watches.length)]; setSpec({ brand: b.brand, model: b.model, ref: b.ref }); }
    return () => clearTimeout(t);
  }, [scan]);
  useEffect(() => { if (!previewing) return; const t = setTimeout(() => setPreviewing(false), 4000); return () => clearTimeout(t); }, [previewing]);

  const tracks = TRACKS.filter(t => query ? `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase()) : t.cat === cat);
  const bars = useMemo(() => Array.from({ length: 48 }, (_, i) => 25 + Math.abs(Math.sin(i * 1.7) * 55) + (i % 5) * 4), []);

  const canvas = (
    <div className="editor-canvas" style={{ aspectRatio: aspect }}>
      {isVideo ? <video ref={videoRef} src={url} autoPlay loop playsInline muted={vol.original === 0} style={{ filter: cssFilter }} onLoadedMetadata={e => { const d = Math.max(1, Math.round(e.currentTarget.duration || 30)); setDuration(d); setTrim([0, d]); }} />
        : <img src={url} alt="Your upload preview" style={{ filter: cssFilter }} />}
      <div className="editor-vignette" style={{ opacity: adj.vignette / 100 }} />
      {text && <div className={`editor-text ${fontCls}`}>{text}</div>}
      {track && <div className="editor-music-chip"><Music size={11} /> {track.title} · {track.artist}</div>}
    </div>
  );

  const publish = () => {
    const base = watches[0];
    addUpload({
      ...base, id: `upload-${Date.now()}`, brand: spec.brand || base.brand, model: spec.model || base.model, ref: spec.ref || base.ref,
      wrist: parseFloat(wrist) || 16.5, creator: 'alex.morgan', initials: 'AM', caption: caption.replace(/#\w+/g, '').trim(),
      tags: (caption.match(/#\w+/g) || ['#WOTD']).join(' '), likes: 0, comments: 0, saves: 0,
      video: isVideo ? url : '', image: isVideo ? base.image : url,
      music: track ? { title: track.title, artist: track.artist } : undefined,
      edit: { kind: isVideo ? 'video' : 'photo', aspect, cssFilter, vignette: adj.vignette, text: text || undefined, textStyle: fontCls, trim: isVideo ? trim : undefined, originalVolume: vol.original, bgmVolume: vol.bgm },
    });
    close();
  };

  return <BottomSheet open={uploadOpen} onClose={close} title={['Select & crop', 'Edit your film', 'Post details'][step - 1] ?? 'Upload'}>
    <div className="upload-content media-editor">
      <ol className="editor-steps" aria-label="Upload steps">{['Media', 'Edit', 'Post'].map((s, i) => <li key={s} className={step >= i + 1 ? 'is-done' : ''}><span>{i + 1}</span>{s}</li>)}</ol>

      {step === 1 && <>
        <input hidden ref={input} type="file" accept="video/*,image/*" onChange={e => choose(e.target.files?.[0])} />
        {!file ? <Button variant="dropzone" onClick={() => input.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}><Upload /><strong>Drop your watch video or photo</strong><span>or browse · MP4, MOV, JPG, PNG · up to 200 MB</span></Button>
          : <>{canvas}<Button variant="ghost" size="sm" onClick={() => input.current?.click()}><ImageIcon /> Choose a different file</Button></>}
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="editor-label">Aspect ratio</div>
        <div className="aspect-options">{ASPECTS.map(a => <Button key={a.id} variant="outline" aria-pressed={aspect === a.id} className={aspect === a.id ? 'is-active' : ''} onClick={() => setAspect(a.id)}><i style={{ aspectRatio: a.id }} /><strong>{a.label}</strong><span>{a.name}</span></Button>)}</div>
        <Button className="w-full" disabled={!file} onClick={() => setStep(2)}>Next: Edit <ArrowRight /></Button>
      </>}

      {step === 2 && <>
        {canvas}
        <div className="editor-panel">
          {tool === 'filters' && <div className="filter-row">{FILTERS.map(f => <Button key={f.id} variant="ghost" aria-pressed={filter === f.id} className={`filter-chip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}><span className="filter-thumb">{isVideo ? <video src={url} muted style={{ filter: f.css }} /> : <img src={url} alt="" style={{ filter: f.css }} />}</span>{f.id}</Button>)}</div>}
          {tool === 'trim' && (isVideo ? <div className="trim-tool">
            <div className="trim-track"><div className="trim-selection" style={{ left: `${trim[0] / duration * 100}%`, right: `${100 - trim[1] / duration * 100}%` }} /></div>
            <Range label="Start" value={trim[0]} max={duration} suffix="s" onChange={v => setTrim([Math.min(v, trim[1] - 1), trim[1]])} />
            <Range label="End" value={trim[1]} max={duration} suffix="s" onChange={v => setTrim([trim[0], Math.max(v, trim[0] + 1)])} />
            <p className="subtle">Clip length {fmt(trim[1] - trim[0])}</p>
          </div> : <p className="subtle">Trimming is available for videos. Photos display as a still frame.</p>)}
          {tool === 'adjust' && <div className="adjust-tool">
            <Range label="Brightness" value={adj.brightness} min={50} max={150} onChange={v => setAdj({ ...adj, brightness: v })} />
            <Range label="Contrast" value={adj.contrast} min={50} max={150} onChange={v => setAdj({ ...adj, contrast: v })} />
            <Range label="Saturation" value={adj.saturation} min={0} max={200} onChange={v => setAdj({ ...adj, saturation: v })} />
            <Range label="Vignette" value={adj.vignette} onChange={v => setAdj({ ...adj, vignette: v })} />
          </div>}
          {tool === 'text' && <div className="text-tool">
            <input aria-label="Overlay text" placeholder="Add text on your film…" value={text} maxLength={60} onChange={e => setText(e.target.value)} />
            <div className="font-row">{FONTS.map(f => <Button key={f.id} variant="outline" size="sm" aria-pressed={font === f.id} className={`${f.cls} ${font === f.id ? 'is-active' : ''}`} onClick={() => setFont(f.id)}>{f.id}</Button>)}</div>
          </div>}
          {tool === 'music' && <div className="music-tool">
            <label className="music-search"><Search size={14} /><input aria-label="Search music" placeholder="Search songs or artists" value={query} onChange={e => setQuery(e.target.value)} /></label>
            {!query && <div className="music-cats">{CATEGORIES.map(c => <Button key={c} variant="outline" size="sm" className={cat === c ? 'is-active' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</Button>)}</div>}
            <div className="track-list">{tracks.length ? tracks.map(t => <Button key={t.title} variant="ghost" className={`track-row ${track?.title === t.title ? 'is-active' : ''}`} onClick={() => { setTrack(t); setMusicStart(0); setMusicLen(Math.min(30, t.length)); }}><span className="track-art"><Music size={14} /></span><span className="track-copy"><strong>{t.title}</strong><small>{t.artist} · {fmt(t.length)}</small></span>{track?.title === t.title && <Check />}</Button>) : <p className="subtle">No songs match “{query}”.</p>}</div>
            {track && <>
              <div className="editor-label">Select section · {fmt(musicStart)} – {fmt(musicStart + musicLen)}</div>
              <div className="waveform">{bars.map((h, i) => { const pos = i / bars.length * track.length; const on = pos >= musicStart && pos <= musicStart + musicLen; return <i key={i} className={on ? 'is-on' : ''} style={{ height: `${h}%` }} />; })}</div>
              <Range label="Section start" value={musicStart} max={Math.max(0, track.length - musicLen)} suffix="s" onChange={setMusicStart} />
              <Range label="Section length" value={musicLen} min={15} max={Math.min(60, track.length)} suffix="s" onChange={v => { setMusicLen(v); setMusicStart(s => Math.min(s, track.length - v)); }} />
              <Button variant="outline" size="sm" onClick={() => setPreviewing(!previewing)}>{previewing ? <Pause /> : <Play />} {previewing ? 'Previewing…' : 'Preview section'}{previewing && <span className="mini-wave"><i /><i /><i /><i /></span>}</Button>
            </>}
            <div className="editor-label">Audio mixer</div>
            <Range label="Original Sound" value={vol.original} onChange={v => setVol({ ...vol, original: v })} />
            <Range label="BGM Volume" value={vol.bgm} onChange={v => setVol({ ...vol, bgm: v })} />
            <p className="market-note">Demo music library · track audio is simulated.</p>
          </div>}
        </div>
        <div className="editor-toolbar" role="tablist">{TOOLS.map(t => <Button key={t.id} role="tab" variant="ghost" aria-selected={tool === t.id} className={tool === t.id ? 'is-active' : ''} onClick={() => setTool(t.id)}><t.icon /><span>{t.label}</span></Button>)}</div>
        <div className="editor-nav"><Button variant="outline" onClick={() => setStep(1)}><ArrowLeft /> Back</Button><Button onClick={() => setStep(3)}>Next: Details <ArrowRight /></Button></div>
      </>}

      {step === 3 && <>
        <div className="post-preview">{canvas}<div><strong>{track ? `🎵 ${track.title} • ${track.artist}` : 'Original sound'}</strong><span>{filter} · {ASPECTS.find(a => a.id === aspect)?.label}</span></div></div>
        <label className="caption-input">Caption<textarea aria-label="Video caption" value={caption} onChange={e => setCaption(e.target.value)} /></label>
        <p className="video-hashtags">{(caption.match(/#\w+/g) || []).join(' ') || 'Add hashtags like #Rolex #WOTD'}</p>
        <label className="wrist-input">📏 Wrist size<span><input aria-label="Wrist size" inputMode="decimal" value={wrist} onChange={e => setWrist(e.target.value.replace(/[^\d.]/g, ''))} /> cm</span></label>
        <Button variant="recognition" className="auto-detect" onClick={() => setScan(0)} disabled={scan >= 0 && scan < 100}><Sparkles /> {scan < 0 ? 'AI Auto-Detect Watch Spec' : scan < 100 ? `Scanning frames… ${scan}%` : 'Spec detected · scan again'}</Button>
        {scan >= 0 && <progress max="100" value={scan} />}
        {scan === 100 && <div className="scan-results">{(['brand', 'model', 'ref'] as const).map(k => <label key={k}>{k === 'ref' ? 'Reference' : k.charAt(0).toUpperCase() + k.slice(1)}<input aria-label={k} value={spec[k]} onChange={e => setSpec({ ...spec, [k]: e.target.value })} /></label>)}</div>}
        <div className="editor-nav"><Button variant="outline" onClick={() => setStep(2)}><ArrowLeft /> Back</Button><Button onClick={publish}><Check /> Publish</Button></div>
        <p className="market-note">Simulated AI · this post stays in your current session.</p>
      </>}
    </div>
  </BottomSheet>;
}
export type EditStyle = CSSProperties;
