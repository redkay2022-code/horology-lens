import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,render,screen,fireEvent } from '@testing-library/react';
const m=vi.hoisted(()=>({prepare:vi.fn(),allowed:true}));
vi.mock('@/lib/automatic-frame-selection',()=>({prepareAutomaticFrames:m.prepare}));
vi.mock('@/lib/g3-preview',()=>({useG3Preview:()=>m.allowed}));
import { G3RecognitionWorkspace } from '@/components/horology/g3-recognition-workspace';
import { jpeg } from './g3-fixture';
afterEach(()=>{cleanup();vi.clearAllMocks();m.allowed=true;});
it('local flow selects, corrects and confirms without server or external image transmission',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Forbidden'));
 m.prepare.mockResolvedValue({selected:[{time:1,width:160,height:160,dataUrl:jpeg}]});
 try{render(<G3RecognitionWorkspace/>);fireEvent.change(screen.getByLabelText('G3 video file'),{target:{files:[new File(['x'],'v.mp4')]}});fireEvent.click(await screen.findByRole('button',{name:'PREVIEW · Sample 1'}));fireEvent.change(screen.getByLabelText('G3 brand'),{target:{value:'Manual'}});fireEvent.click(screen.getByRole('button',{name:'모의 정보 확인'}));expect(await screen.findByText('모의 정보 확인 완료')).toBeTruthy();expect(screen.getByLabelText('G3 brand')).toHaveValue('Manual');expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
});
it('no opt-in exposes no workspace or provider call',()=>{m.allowed=false;render(<G3RecognitionWorkspace/>);expect(screen.queryByLabelText('G3 video file')).toBeNull();expect(m.prepare).not.toHaveBeenCalled();});
it('rejects files over local 100MiB review budget before decoding',async()=>{
 render(<G3RecognitionWorkspace/>);const f=new File(['x'],'big.mp4');Object.defineProperty(f,'size',{value:104857601});fireEvent.change(screen.getByLabelText('G3 video file'),{target:{files:[f]}});expect(await screen.findByRole('alert')).toHaveTextContent('100MiB');expect(m.prepare).not.toHaveBeenCalled();
});