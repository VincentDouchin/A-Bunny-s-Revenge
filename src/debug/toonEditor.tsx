import { For } from 'solid-js'
import { entries } from '@/utils/mapFunctions'

interface ToonValues {
	colors: [number, number, number, number]
	stops: [number, number, number, number]
}

export const ToonEditor = () => {
	const existingData = localStorage.getItem('toonGradient')
	const defaultData: ToonValues = { colors: [0.5, 1.5, 1.7, 2.5], stops: [0.1, 0.5, 1.0, 2.0] }
	const data: ToonValues = existingData
		? JSON.parse(existingData) as ToonValues
		: defaultData
	const save = () => {
		localStorage.setItem('toonGradient', JSON.stringify(data))
		window.location.reload()
	}
	const reset = () => {
		localStorage.setItem('toonGradient', JSON.stringify(defaultData))
		window.location.reload()
	}
	return (
		<div style={{ 'display': 'grid', 'grid-template-columns': 'auto auto' }}>
			<For each={entries(data)}>
				{([name, values]) => {
					return (
						<div>
							<div>{name}</div>
							<For each={values}>
								{(val, i) => {
									return (
										<div>
											<input step="0.1" type="number" onChange={e => data[name][i()] = e.target.valueAsNumber} value={val}></input>
										</div>
									)
								}}
							</For>
						</div>
					)
				}}
			</For>
			<button onClick={save}>save shader</button>
			<button onClick={reset}>reset shader</button>
		</div>
	)
}