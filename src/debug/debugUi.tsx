import { Show, createSignal } from 'solid-js'
import { params } from '@/global/context'
import { composer, renderer } from '@/global/rendering'

export const DebugUi = () => {
	const updatePixelation = (e: Event) => {
		const target = e.target as HTMLInputElement
		const val = target.valueAsNumber
		params.pixelation = val
		renderer.setSize(window.innerWidth / val, window.innerHeight / val)
		composer.setSize(window.innerWidth / val, window.innerHeight / val)
	}
	const [showUi, setShowUi] = createSignal(false)
	return (
		<div style={{ position: 'absolute' }}>
			<button onClick={() => setShowUi(!showUi())}>{showUi() ? 'Hide debug Ui' : 'Show debug ui'}</button>
			<Show when={showUi()}>
				<div>
					Pixelation
					<input
						type="number"
						value={params.pixelation}
						onChange={updatePixelation}
					>
					</input>
				</div>
				<div>
					Camera Offset X
					<input
						type="number"
						value={params?.cameraOffsetX}
						onChange={e => params.cameraOffsetX = e.target.valueAsNumber}
					>
					</input>
				</div>
				<div>
					Camera Offset Y
					<input
						type="number"
						value={params?.cameraOffsetY}
						onChange={e => params.cameraOffsetY = e.target.valueAsNumber}
					>
					</input>
				</div>
				<div>
					Camera Offset Z
					<input
						type="number"
						value={params?.cameraOffsetZ}
						onChange={e => params.cameraOffsetZ = e.target.valueAsNumber}
					>
					</input>
				</div>
				<div>
					Zoom
					<input
						type="number"
						value={params?.zoom}
						onChange={e => params.zoom = e.target.valueAsNumber}
					>
					</input>
				</div>
				<div>
					Fov
					<input
						type="number"
						value={params?.fov}
						onChange={e => params.fov = e.target.valueAsNumber}
					>
					</input>
				</div>
			</Show>
		</div>
	)
}
