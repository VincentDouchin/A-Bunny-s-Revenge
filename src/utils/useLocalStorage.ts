export const useLocalStorage = <T extends Record<string, unknown>>(key: string, init: T): [T, (fn: (data: T) => T) => void, () => void] => {
	const dataString = localStorage.getItem(key)
	const data = dataString ? JSON.parse(dataString) as T : init
	const set = (fn: (data: T) => T) => {
		const newData = fn(data)
		Object.assign(data, newData)
		localStorage.setItem(key, JSON.stringify(newData))
	}
	const reset = () => {
		set(() => init)
	}
	return [data, set, reset]
}