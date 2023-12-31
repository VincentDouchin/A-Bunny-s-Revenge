import { Show, createSignal } from 'solid-js'
import { params } from '@/global/context'
import { composer, renderer } from '@/global/rendering'
import { campState } from '@/global/states'
import { resetSave, updateSave } from '@/global/save'

export const DebugUi = () => {
	const updatePixelation = (e: Event) => {
		const target = e.target as HTMLInputElement
		const val = target.valueAsNumber
		const ratio = window.innerHeight / window.innerWidth
		renderer.setSize(val, val * ratio)
		composer.setSize(val, val * ratio)
	}
	const [showUi, setShowUi] = createSignal(false)
	const growCrops = () => {
		campState.enable({ previousState: 'dungeon' })
	}
	const destroyCrops = () => {
		updateSave((s) => {
			s.crops = []
			campState.enable({ })
		})
	}
	const reset = async () => {
		campState.disable()
		await resetSave()
		window.location.reload()
	}
	return (
		<div style={{ position: 'absolute', color: 'white' }}>
			<button onClick={() => setShowUi(!showUi())}>{showUi() ? 'Hide debug Ui' : 'Show debug ui'}</button>
			<Show when={showUi()}>
				<div>
					Render width
					<input
						type="number"
						value={params.renderWidth}
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
				<div>
					SpeedUp
					<input
						type="number"
						value={params?.speedUp}
						onChange={e => params.speedUp = e.target.valueAsNumber}
					>
					</input>
				</div>
				<div>
					Dialog speed
					<input
						type="number"
						value={params?.dialogSpeed}
						onChange={e => params.dialogSpeed = e.target.valueAsNumber}
					>
					</input>
				</div>
				<div>
					<button onClick={growCrops}>Grow crops</button>
				</div>
				<div>
					<button onClick={destroyCrops}>Destroy crops</button>
				</div>
				<div>
					<button onClick={reset}>Reset Save</button>
				</div>
			</Show>
		</div>
	)
}
