import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const m=vi.hoisted(()=>({prepare:vi.fn(),recognize:vi.fn(),identify:vi.fn(),upload:vi.fn()}));
vi.mock('@/lib/automatic-frame-selection',()=>({prepareAutomaticFrames:m.prepare}));
vi.mock('@/lib/recognition-adapters',async o=>({...await o<object>(),mockMultiImageAdapter:m.recognize}));
vi.mock('@/lib/g1-preview',()=>({useG1Preview:()=>true}));
vi.mock('@tanstack/react-start',()=>({useServerFn:(fn:unknown)=>fn}));
vi.mock('@/lib/identify.functions',()=>({identifyWatch:m.identify}));
vi.mock('@/lib/catalog.functions',()=>({listConfirmedCatalog:async()=>({data:[]})}));
vi.mock('@/lib/collection.functions',()=>({listMyWatches:async()=>[]}));
vi.mock('@/hooks/use-auth',()=>({useSession:()=>({user:{id:'a'},ready:true}),useProfile:()=>({data:null})}));
vi.mock('@/components/horology/store',()=>({useCommunity:()=>({uploadOpen:true,closeUpload:vi.fn()})}));
vi.mock('@tanstack/react-router',async o=>({...await o<object>(),useNavigate:()=>vi.fn(),Link:({children}:{children:React.ReactNode})=>children}));
vi.mock('@/lib/server-data',()=>({useInvalidate:()=>vi.fn(),usePosts:()=>({data:[]}),useMyRows:()=>({data:[]}),useFollowCounts:()=>({data:{}}),uploadPost:m.upload,validateVideoSignature:async()=>null}));
import { G1RecognitionPreview } from '@/components/horology/g1-recognition-preview';
import { ServerUploadSheet } from '@/components/horology/server-views';
import { WatchIntelligencePanel } from '@/components/horology/watch-intelligence-panel';
const frame={time:1,position:.1,dataUrl:'data:image/jpeg;base64,YWJj',width:576,height:1024,quality:{score:1,sharpness:10,exposure:.5,highlights:0,shadows:0}};
const file=new File(['v'],'clip.mp4',{type:'video/mp4'});
beforeEach(async()=>{vi.clearAllMocks();URL.createObjectURL=vi.fn(()=>'blob:preview');URL.revokeObjectURL=vi.fn();m.prepare.mockResolvedValue({frames:[frame],selected:[frame]});const actual=await vi.importActual<typeof import('@/lib/recognition-adapters')>('@/lib/recognition-adapters');m.recognize.mockImplementation(actual.mockMultiImageAdapter);m.upload.mockResolvedValue({});});
afterEach(cleanup);
it('automatically prepares then fills the separate mock draft without calling real identification',async()=>{
 render(<G1RecognitionPreview file={file} session="a" enabled/>);expect(await screen.findByLabelText('Preview brand')).toHaveValue('PREVIEW');expect(m.prepare).toHaveBeenCalledTimes(1);expect(m.recognize).toHaveBeenCalledTimes(1);expect(m.identify).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Preview brand'),{target:{value:'My correction'}});fireEvent.click(screen.getByRole('button',{name:'최종 정보 확인'}));fireEvent.click(screen.getByRole('button',{name:'맞아요'}));expect(await screen.findByText('미리보기 정보 확인 완료')).toBeTruthy();expect(screen.getByLabelText('Preview brand')).toHaveValue('My correction');
});
it('unknown clarification never arbitrarily attaches either mock reference',async()=>{
 render(<G1RecognitionPreview file={file} session="a" enabled scenario="ambiguous"/>);fireEvent.click(await screen.findByRole('button',{name:'잘 모르겠어요'}));expect(screen.getByLabelText('Preview rawReference')).toHaveValue('');
});
it('late session and replaced-video results cannot overwrite corrections',async()=>{
 let resolve:(v:unknown)=>void=()=>{};m.recognize.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const ui=render(<G1RecognitionPreview file={file} session="a" enabled/>);await waitFor(()=>expect(m.recognize).toHaveBeenCalledTimes(1));const oldRequest=m.recognize.mock.calls[0]?.[0];ui.rerender(<G1RecognitionPreview file={new File(['v'],'b.mp4',{type:'video/mp4'})} session="b" enabled/>);await screen.findByLabelText('Preview brand');fireEvent.change(screen.getByLabelText('Preview brand'),{target:{value:'Preserved'}});const actual=await vi.importActual<typeof import('@/lib/recognition-adapters')>('@/lib/recognition-adapters');await act(async()=>resolve(await actual.mockMultiImageAdapter(oldRequest)));expect(screen.getByLabelText('Preview brand')).toHaveValue('Preserved');
});
it('cancel and publication disable reject late results',async()=>{
 let resolve:(v:unknown)=>void=()=>{};m.recognize.mockImplementation(()=>new Promise(r=>{resolve=r;}));const ui=render(<G1RecognitionPreview file={file} session="a" enabled/>);await waitFor(()=>expect(m.recognize).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'건너뛰기'}));ui.rerender(<G1RecognitionPreview file={file} session="a" enabled={false}/>);await act(async()=>resolve({}));expect(screen.queryByLabelText('Preview brand')).toBeNull();
});
it('existing publish receives only real manual inputs, never mock identity or story',async()=>{
 render(<QueryClientProvider client={new QueryClient()}><ServerUploadSheet/></QueryClientProvider>);fireEvent.change(screen.getByLabelText('Video file'),{target:{files:[file]}});await screen.findByLabelText('Preview brand');fireEvent.change(screen.getByLabelText('Brand',{exact:true}),{target:{value:'Tudor'}});fireEvent.change(screen.getByLabelText('Preview brand'),{target:{value:'Mock edited'}});fireEvent.submit(screen.getByRole('button',{name:/^Publish$/}).closest('form') as HTMLFormElement);await waitFor(()=>expect(m.upload).toHaveBeenCalledExactlyOnceWith('a',file,{caption:'',brand:'Tudor',model:'',reference:null,case_size_mm:null,catalog_id:null}));expect(m.identify).not.toHaveBeenCalled();
});
it('opening and closing story keeps the same video DOM node and src',async()=>{
 const ui=render(<><video data-testid="video" src="blob:unchanged"/><WatchIntelligencePanel preview/></>);const video=screen.getByTestId('video');fireEvent.click(screen.getByRole('button',{name:'이 시계의 이야기'}));await screen.findByText('컬렉션의 헤리티지');expect(screen.getByTestId('video')).toBe(video);expect(video).toHaveAttribute('src','blob:unchanged');fireEvent.click(screen.getByRole('button',{name:'이야기 닫기'}));expect(screen.getByTestId('video')).toBe(video);ui.unmount();
});
