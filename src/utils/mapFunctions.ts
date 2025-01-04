export const entries = <T extends Record<string, any>>(obj: T) => Object.entries(obj) as [keyof T, T[keyof T]][]

export const objectKeys = <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[]

export const objectValues = <T extends Record<string, any>>(obj: T) => Object.values(obj) as (T[keyof T])[]

export const asyncMapValues = async< T extends Record<string, any>, F extends (arg: T[keyof T], key: keyof T) => any>(obj: T, fn: F) => {
	const res = {} as Record<keyof T, Awaited<ReturnType<F>>>
	await Promise.all(entries(obj).map(async ([key, val]) => {
		res[key] = await fn(val, key)
	}))
	return res
}
export const mapValues = < T extends Record<string, any>, F extends (arg: T[keyof T], key: keyof T) => any>(obj: T, fn: F) => {
	const res = {} as Record<keyof T, ReturnType<F>>
	for (const [key, val] of entries(obj)) {
		res[key] = fn(val, key)
	}
	return res
}

export const groupByObject = <T extends Record<string, any>, F extends (key: keyof T) => string>(obj: T, fn: F) => {
	const res = {} as Record<string, Record<keyof T, T[keyof T]> >
	for (const [key, val] of entries(obj)) {
		const newKey = fn(key)
		res[newKey] ??= {} as Record<keyof T, T [keyof T]>
		res[newKey][key] = val
	}
	return res as { [key in ReturnType<F>]: Record<keyof T, T[keyof T]> }
}

export const mapKeys = <K extends string, T extends Record<string, any>, F extends (key: keyof T) => K>(obj: T, fn: F) => {
	const res = {} as { [k in K]: T[keyof T] }
	for (const [key, val] of entries(obj)) {
		const newKey = fn(key)
		res[newKey] = val
	}
	return res
}
export const reduce = <T extends Record<string, any>, F extends (key: keyof T, val: T[keyof T]) => Record<string, any>>(obj: T, fn: F) => {
	return entries(obj).reduce((acc, v) => {
		return { ...acc, ...fn(...v) }
	}, {}) as ReturnType<F>
}

export const range = <R >(start: number, end: number, fn: (i: number) => R = (i: number) => i as R) => {
	const res: R[] = []
	for (let i = start; i < end; i++) {
		res.push(fn(i))
	}
	return res
}
export const addKeys = <K extends readonly string[], V>(keys: K, values: V[]) => {
	const res = {} as Record<K[number], V>
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i] as K[number]
		res[key] = values[i]
	}
	return res
}

export const asyncMap = async <V, F extends (value: V) => Promise<any>>(arr: V[], fn: F) => {
	const res: Array<Awaited<ReturnType<F>>> = []
	for (const value of arr) {
		res.push(await fn(value))
	}
	return res
}

export const filterKeys = <T>(obj: Record<string, T>, fn: (key: string) => boolean) => {
	const filtered: Record<string, T> = {}
	const notFiltered: Record<string, T> = {}
	for (const [key, val] of entries(obj)) {
		(fn(key) ? filtered : notFiltered)[key] = val
	}
	return [filtered, notFiltered]
}
export const getRandom = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

export const between = (min: number, max: number) => Math.random() * (max - min) + min

export const enumerate = <T>(arr: T[] | ReadonlyArray<T>): [T, number][] => arr.map((el, i) => ([el, i]))

export function memo<T extends any[], R>(func: (...args: T) => R): (...args: T) => R {
	const cache = new Map<string, R>()

	return (...args: T): R => {
		const key = JSON.stringify(args)

		if (cache.has(key)) {
			return cache.get(key)!
		}

		const result = func(...args)
		cache.set(key, result)
		return result
	}
}
export const shuffle = <T>(array: T[]) => {
	const arr = [...array]
	for (let i = arr.length - 1; i > 0; i--) {
		const rand = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[rand]] = [arr[rand], arr[i]]
	}
	return arr
}

export const once = (fn: (...args: any[]) => void) => {
	let called = false
	return () => {
		if (!called) {
			called = true
			fn()
		}
	}
}

type Func<T, R> = (input: T) => R
export function pipe<A, B>(fn1: (a: A) => B): (a: A) => B
export function pipe<A, B, C>(
	fn1: (a: A) => B,
	fn2: (b: B) => C
): (a: A) => C
export function pipe<A, B, C, D>(
	fn1: (a: A) => B,
	fn2: (b: B) => C,
	fn3: (c: C) => D
): (a: A) => D
export function pipe<A, B, C, D, E>(
	fn1: (a: A) => B,
	fn2: (b: B) => C,
	fn3: (c: C) => D,
	fn4: (d: D) => E
): (a: A) => E
export function pipe<A, B, C, D, E, F>(
	fn1: (a: A) => B,
	fn2: (b: B) => C,
	fn3: (c: C) => D,
	fn4: (d: D) => E,
	fn5: (e: E) => F
): (a: A) => F
export function pipe(...fns: Func<any, any>[]): (input: any) => any {
	return input => fns.reduce((result, fn) => fn(result), input)
}