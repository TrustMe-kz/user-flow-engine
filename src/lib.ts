import * as types from '@/types';


// Checking Functions

export function inarr<T extends any, A extends any[]>(val: T, ...arr: A): types.Inarr<T, A> {
    return arr.includes(val) as types.Inarr<T, A>;
}

export function has<T extends types.Obj, K extends keyof T>(obj: T, key: K): types.Has<T, K> {
    return obj.hasOwnProperty(key) as types.Has<T, K>;
}

export function isset<T extends any>(val: T): types.Isset<T> {
    return !inarr(val, null, undefined) as types.Isset<T>;
}

export function isNumber<T extends any>(val: T): types.IsNumber<T> {
    return (isset(val) && !isNaN(Number(val))) as types.IsNumber<T>;
}

export function isObject<T extends any>(val: T): types.IsObject<T> {
    return (typeof val === 'object' && val !== null) as types.IsObject<T>;
}


// System Functions

export function audit(val: any): string {
    if (isObject(val))
        return JSON.stringify(val);

    else if (typeof val === 'string')
        return `'${val}'`;

    else
        return String(val);
}


// Framework Functions

export function unique<T = any>(arr: T[]): T[] {
    return [ ...new Set(arr) ];
}

export function compare(val: number|null|undefined, valRef: number|null|undefined): number {
    if (!isset(val) && !isset(valRef))
        return 0;
    else if (!isset(val))
        return 1;
    else if (!isset(valRef))
        return -1;
    else
        return val - valRef;
}

export function ensurePromise<T extends any = any>(val: types.MaybePromise): Promise<T> {
    return new Promise((resolve, reject) => {
        const isAsync = val instanceof Promise;

        if (isAsync)
            val.then(resolve).catch(reject);
        else
            resolve(val);
    }) as any;
}

export function ensureAsync<T extends any = any>(val: any): (..._args: any[]) => Promise<T> {
    return async (...args: any[]) => await ensurePromise(val(...args));
}
