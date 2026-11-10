import { describe, expect, it } from 'vitest';
import { resolveIdentity, UNCONFIRMED } from '@/components/horology/watch-identity';

describe('DEMO watch identification', () => {
  it('resolves an unambiguous watch without questions', () => {
    const r = resolveIdentity('rolex');
    expect(r.status === 'resolved' && r.identity.ref).toBe('126610LN');
  });
  it('asks for size only from valid options, then resolves the matching reference', () => {
    expect(resolveIdentity('ap')).toEqual({ status: 'size', sizes: [37, 41] });
    const r = resolveIdentity('ap', 37);
    expect(r.status === 'resolved' && r.identity.ref).toBe('15450ST');
  });
  it('requires reference confirmation and never invents one', () => {
    expect(resolveIdentity('omega').status).toBe('ref');
    const r = resolveIdentity('omega', undefined, UNCONFIRMED);
    expect(r.status === 'resolved' && r.identity.ref).toBeUndefined();
    expect(r.status === 'resolved' && r.unconfirmed).toEqual(['ref']);
  });
});
