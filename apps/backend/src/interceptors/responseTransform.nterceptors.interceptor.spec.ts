import { ResponseTransformInterceptor } from './responseTransform.interceptor';

describe('InterceptorsInterceptor', () => {
  it('should be defined', () => {
    expect(new ResponseTransformInterceptor()).toBeDefined();
  });
});
