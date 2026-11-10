import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { auctionPosts, canOffer } from '@/components/horology/auction';
import { HorologyProvider, useCommunity } from '@/components/horology/store';

describe('Buyer / Seller demo offer flow',()=>{
 it('buyer offers, seller accepts once, chat opens only for both parties',()=>{
  const {result}=renderHook(()=>useCommunity(),{wrapper:HorologyProvider});
  const rolex=auctionPosts[0]!;const gallery=auctionPosts[2]!;
  act(()=>{expect(result.current.submitOffer(gallery,100000)).toBe(false)});
  act(()=>{expect(result.current.acceptOffer(rolex)).toBe(false)}); // buyer cannot accept
  act(()=>{expect(result.current.submitOffer(rolex,15700)).toBe(true)});
  act(()=>result.current.sendMessage(rolex.id,'locked'));
  expect(result.current.auctions[rolex.id]?.messages).toHaveLength(0);
  act(()=>result.current.setRole('seller'));
  act(()=>{expect(result.current.submitOffer(rolex,16500)).toBe(false)}); // own post
  expect(canOffer(rolex,result.current.auctions[rolex.id],Date.now(),result.current.me)).toBe(false);
  const mine=result.current.auctions[rolex.id]!.offers.find(o=>o.buyer==='alex.morgan')!;
  act(()=>{expect(result.current.acceptOffer(rolex,mine.id)).toBe(true)});
  act(()=>{expect(result.current.acceptOffer(rolex,mine.id)).toBe(false)});
  const a=result.current.auctions[rolex.id]!;
  expect(a.chatId).toBe(rolex.id);expect(a.buyer).toBe('alex.morgan');
  expect(a.offers.find(o=>o.id===mine.id)?.status).toBe('accepted');
  expect(a.offers.filter(o=>o.id!==mine.id).every(o=>o.status==='declined')).toBe(true);
  expect(a.messages).toHaveLength(1);
  act(()=>result.current.setRole('buyer'));
  expect(canOffer(rolex,result.current.auctions[rolex.id],Date.now(),'alex.morgan')).toBe(false);
  act(()=>result.current.sendMessage(rolex.id,'Hi'));
  expect(result.current.auctions[rolex.id]?.messages.at(-1)?.from).toBe('alex.morgan');
 });
});
