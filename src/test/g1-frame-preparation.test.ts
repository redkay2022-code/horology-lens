import { it, expect, vi } from 'vitest';
import { prepareAutomaticFrames, selectAutomaticFrames } from '@/lib/automatic-frame-selection';
import type { ExtractedFrame, FrameSource } from '@/lib/video-frames';
const frame=(p:number,image=`data:image/jpeg;base64,${btoa(String(p))}`):ExtractedFrame=>({time:p*10,position:p,dataUrl:image,width:576,height:1024,quality:{score:1,sharpness:10,exposure:.5,highlights:0,shadows:0}});
it('selects no more than three temporally diverse frames, no fabricated view or watch evidence',async()=>{
  expect(selectAutomaticFrames([.1,.2,.3,.4,.5,.6,.7,.8,.9].map(p=>frame(p)))).toHaveLength(3);
  const close=vi.fn(),capture=vi.fn(async t=>frame(t/10)); const source:FrameSource={open:async()=>({duration:10,capture,close})};const r=await prepareAutomaticFrames(new Blob(),{source});expect(capture).toHaveBeenCalledTimes(5);expect(close).toHaveBeenCalledTimes(1);expect(r.detection).toEqual({watchPresence:'unknown',view:'unknown',modelEnabled:false});
});
it('reduces identical images, refuses unusable frames, bounds extra sampling to nine',async()=>{
  expect(selectAutomaticFrames([frame(.1,'same'),frame(.5,'same')])).toHaveLength(1);expect(selectAutomaticFrames([{...frame(.1),quality:{...frame(.1).quality,score:0}}])).toHaveLength(0);
  const capture=vi.fn(async t=>frame(t/10,'same')),close=vi.fn();const r=await prepareAutomaticFrames(new Blob(),{source:{open:async()=>({duration:10,capture,close})}});expect(capture).toHaveBeenCalledTimes(9);expect(r.selected).toHaveLength(1);expect(close).toHaveBeenCalledOnce();
});
it('cancels and closes its decoder without calling recognition',async()=>{
  const ac=new AbortController(),close=vi.fn();await expect(prepareAutomaticFrames(new Blob(),{signal:ac.signal,source:{open:async()=>({duration:10,close,capture:async t=>{ac.abort();return frame(t/10);}})}})).rejects.toThrow();expect(close).toHaveBeenCalledOnce();
});
