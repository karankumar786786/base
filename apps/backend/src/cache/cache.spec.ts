import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from './cacheProvider';

describe('Cache', () => {
  let provider: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Cache],
    }).compile();

    provider = module.get<Cache>(Cache);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
