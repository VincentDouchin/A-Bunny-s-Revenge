import { createSignal } from 'solid-js'

export const listeners: Array<() => void> = []
export const rerender = () => {
	for (const l of listeners) {
		l()
	}
}
export const sync = <T>(data: T) => {
	const [reactiveData, setData] = createSignal(data, { equals: false })
	// @ts-expect-error error
	listeners.push(() => setData(data))
	return reactiveData
}