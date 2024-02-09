export const useLocalStorage = <T extends Record<string, unknown>>(key: string, init: T): [T, (data: T) => void, () => void] => {
	const dataString = localStorage.getItem(key)
	const data = dataString ? JSON.parse(dataString) as T : init
	const set = (newData: T) => {
		Object.assign(data, newData)
		localStorage.setItem(key, JSON.stringify(newData))
	}
	const reset = () => {
		set(init)
	}
	return [data, set, reset]
}