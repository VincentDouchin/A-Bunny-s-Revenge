export const entries = <T extends Record<string, any>>(obj: T) => Object.entries(obj) as [keyof T, T[keyof T]][]

export const objectKeys = <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[]

export const objectValues = <T extends Record<string, any>>(obj: T) => Object.values(obj) as (T[keyof T])[]

export const asyncMapValues = async< T extends Record<string, any>, F extends (arg: T[keyof T], key: keyof T) => any>(obj: T, fn: F) => {
	const res = {} as Record<keyof T, Awaited<ReturnType<F>>>
	for (const [key, val] of entries(obj)) {
		res[key] = await fn(val, key)
	}
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

export const range = <R >(start: number, end: number, fn: (i: number) => R) => {
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