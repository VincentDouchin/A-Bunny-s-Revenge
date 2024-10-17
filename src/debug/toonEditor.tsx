import { sobelMat } from '@/global/rendering'
import { entries } from '@/utils/mapFunctions'
import { createEffect, For } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Color } from 'three'

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
export const ColorCorrection = () => {
	const brightness = atom(sobelMat.uniforms.brightness.value)
	const contrast = atom(sobelMat.uniforms.contrast.value)
	const saturation = atom(sobelMat.uniforms.saturation.value)
	const powRGB = atom(sobelMat.uniforms.powRGB.value.getHex())
	const addRGB = atom(sobelMat.uniforms.addRGB.value.getHex())
	const mulRGB = atom(sobelMat.uniforms.mulRGB.value.getHex())
	createEffect(() => {
		sobelMat.uniforms.brightness.value = brightness()
		sobelMat.uniforms.contrast.value = contrast()
		sobelMat.uniforms.saturation.value = saturation()
		sobelMat.uniforms.addRGB.value = new Color(addRGB())
		sobelMat.uniforms.mulRGB.value = new Color(mulRGB())
		sobelMat.uniforms.powRGB.value = new Color(powRGB())
	})
	css/* css */`
	.color-correction{
		display: grid;
		grid-template-columns: auto auto;
	}
	`
	return (
		<div class="color-correction">
			<div>brightness</div>
			<input type="number" step={0.05} value={brightness()} onChange={e => brightness(e.target.valueAsNumber)} />
			<div>contrast</div>
			<input type="number" step={0.05} value={contrast()} onChange={e => contrast(e.target.valueAsNumber)} />
			<div>saturation</div>
			<input type="number" step={0.05} value={saturation()} onChange={e => saturation(e.target.valueAsNumber)} />
			<div>add RGB</div>
			<input type="color" value={addRGB()} onChange={e => addRGB(e.target.value)}></input>
			<div>pow RGB</div>
			<input type="color" value={powRGB()} onChange={e => powRGB(e.target.value)}></input>
			<div>mul RGB</div>
			<input type="color" value={mulRGB()} onChange={e => mulRGB(e.target.value)}></input>
		</div>
	)
}