import {
  AdminImageSigner,
  parseStorageImageUrl
} from './maintenance-admin-images.service';

describe('parseStorageImageUrl', () => {
  const base = 'https://db.example.test';

  it('parses proxy and direct public urls', () => {
    expect(parseStorageImageUrl('https://images.patcher.xyz/racks/a%20b/c.png', base)).toEqual({bucket: 'racks', path: 'a b/c.png'});
    expect(parseStorageImageUrl(`${ base }/storage/v1/object/public/module-panels/x.webp?t=1`, base))
      .toEqual({bucket: 'module-panels', path: 'x.webp'});
  });

  it('ignores other urls', () => {
    expect(parseStorageImageUrl('blob:abc', base)).toBeNull();
    expect(parseStorageImageUrl(`${ base }/storage/v1/object/sign/racks/a.png?token=1`, base)).toBeNull();
    expect(parseStorageImageUrl('https://images.patcher.xyz/racks', base)).toBeNull();
  });
});

describe('AdminImageSigner', () => {
  it('batches one request per bucket and caches results', async () => {
    const calls: Array<[string, string[]]> = [];
    const signer = new AdminImageSigner(async (bucket, paths) => {
      calls.push([bucket, paths]);
      return Object.fromEntries(paths.map(p => [p, `signed:${ bucket }/${ p }`]));
    });
    const [a, b] = await Promise.all([
      signer.resolve({bucket: 'racks', path: 'a.png'}),
      signer.resolve({bucket: 'racks', path: 'b.png'})
    ]);
    expect(a).toBe('signed:racks/a.png');
    expect(b).toBe('signed:racks/b.png');
    expect(calls).toEqual([['racks', ['a.png', 'b.png']]]);
    await signer.resolve({bucket: 'racks', path: 'a.png'});
    expect(calls.length).toBe(1);
  });

  it('resolves null when signing fails', async () => {
    const signer = new AdminImageSigner(async () => { throw new Error('x'); });
    expect(await signer.resolve({bucket: 'racks', path: 'a.png'})).toBeNull();
  });
});
