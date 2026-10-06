import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { auctionPosts, canOffer, countdown } from '@/components/horology/auction';
import { HorologyProvider, useCommunity } from '@/components/horology/store';

describe('Session-only auction flow',()=>{
 it('blocks gallery bidding, keeps bid escalation consistent and unlocks chat after acceptance',()=>{
  const {result}=renderHook(()=>useCommunity(),{wrapper:HorologyProvider});
  const rolex=auctionPosts[0];const gallery=auctionPosts[2];
  if(!rolex||!gallery)throw new Error('Missing demo fixtures');
  expect(result.current.posts).toHaveLength(3);
  expect(result.current.auctions[rolex.id]?.highest).toBe(15200);
  expect(canOffer(gallery,result.current.auctions[gallery.id],Date.now())).toBe(false);
  act(()=>{expect(result.current.submitOffer(gallery,100000)).toBe(false);expect(result.current.submitOffer(rolex,15201)).toBe(false);result.current.sendMessage(rolex.id,'locked');result.current.acceptOffer(rolex)});
  expect(result.current.auctions[rolex.id]?.messages).toHaveLength(0);
  act(()=>{expect(result.current.submitOffer(rolex,15700)).toBe(true)});
  expect(result.current.auctions[rolex.id]?.count).toBe(6);
  act(()=>result.current.simulateOutbid(rolex,true));
  expect(result.current.auctions[rolex.id]?.highest).toBe(15900);
  act(()=>result.current.acceptOffer(rolex));
  expect(result.current.auctions[rolex.id]?.accepted).toBeNull();
  act(()=>result.current.submitOffer(rolex,16000));
  act(()=>result.current.acceptOffer(rolex));
  expect(result.current.auctions[rolex.id]?.accepted).toBe(16000);
  expect(canOffer(rolex,result.current.auctions[rolex.id],Date.now())).toBe(false);
  act(()=>result.current.sendMessage(rolex.id,'Hello collector'));
  expect(result.current.auctions[rolex.id]?.messages.at(-1)?.text).toBe('Hello collector');
 });
 it('uses the higher minimum for Nautilus and formats countdowns',()=>{
  const {result}=renderHook(()=>useCommunity(),{wrapper:HorologyProvider});const patek=auctionPosts[1];if(!patek)throw new Error('Missing fixture');
  act(()=>expect(result.current.submitOffer(patek,98600)).toBe(false));
  act(()=>expect(result.current.submitOffer(patek,99000)).toBe(true));
  expect(countdown(15155)).toBe('04:12:35');expect(countdown(-5)).toBe('00:00:00');
  expect(canOffer(patek,result.current.auctions[patek.id],Date.now()+86400000)).toBe(false);
 });
});