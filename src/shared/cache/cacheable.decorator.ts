import { CacheService } from './cache.service';

export interface CacheableOptions<TArgs extends unknown[]> {
  namespace: string;
  key: (...args: TArgs) => string;
  ttlMs: number;
}

type AsyncFn<TArgs extends unknown[]> = (
  this: unknown,
  ...args: TArgs
) => Promise<unknown>;

export function Cacheable<TArgs extends unknown[]>(
  options: CacheableOptions<TArgs>,
): MethodDecorator {
  return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as AsyncFn<TArgs>;
    const invoke = (self: unknown, args: TArgs): Promise<unknown> =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      original.apply(self, args);
    descriptor.value = async function (
      this: unknown,
      ...args: TArgs
    ): Promise<unknown> {
      const svc = CacheService.instance;
      if (!svc) return invoke(this, args);
      const finalKey = await svc.buildKey(
        options.namespace,
        options.key(...args),
      );
      return svc.wrap(finalKey, () => invoke(this, args), options.ttlMs);
    };
    return descriptor;
  };
}
