import { CacheService } from './cache.service';

type AsyncFn = (this: unknown, ...args: unknown[]) => Promise<unknown>;

export function InvalidateCache(...namespaces: string[]): MethodDecorator {
  return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as AsyncFn;
    descriptor.value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await original.apply(this, args);
      const svc = CacheService.instance;
      if (svc) {
        await Promise.all(namespaces.map((ns) => svc.bumpNamespace(ns)));
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    };
    return descriptor;
  };
}
