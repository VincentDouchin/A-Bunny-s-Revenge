import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { Color, Mesh } from 'three'
import { LevelEditor } from './LevelEditor'
import { SaveEditor } from './saveEditor'
import { ToonEditor } from './toonEditor'
import { params } from '@/global/context'
import { ecs } from '@/global/init'
import { renderer } from '@/global/rendering'
import { resetSave, updateSave } from '@/global/save'
import { campState } from '@/global/states'
import { entries } from '@/utils/mapFunctions'
import { useLocalStorage } from '@/utils/useLocalStorage'

const groundQuery = ecs.with('ground', 'model')
export const updatePixelation = (e: Event) => {
	const target = e.target as HTMLInputElement
	const val = target.valueAsNumber
	const ratio = window.innerHeight / window.innerWidth
	renderer.setSize(val, val * ratio)
}
export const DebugUi = () => {
	const [showUi, setShowUi] = createSignal(false)
	const growCrops = () => {
		campState.enable({ previousState: 'dungeon' })
	}
	const destroyCrops = () => {
		updateSave((s) => {
			s.crops = {}
			campState.enable({ })
		})
	}
	const reset = async () => {
		campState.disable()
		await resetSave()
		window.location.reload()
	}
	const showUiListener = (e: KeyboardEvent) => {
		if (e.code === 'F1') {
			e.preventDefault()
			setShowUi(!showUi())
		}
	}
	const [groundColors, setGroundColor, resetGroundColors] = useLocalStorage('groundColor', {
		topColor: '#5AB552',
		pathColor: '#856342',
		pathColor2: '#A26D3F',
		grassColor: '#26854C',
	})
	const updateGroundColor = (key: string, value: string) => {
		setGroundColor({ ...groundColors, [key]: value })
		for (const ground of groundQuery) {
			if (ground.model instanceof Mesh && ground.model.material) {
				(ground.model.material as any).uniforms[key].value = new Color(value)
			}
		}
	}
	onMount(() => {
		document.addEventListener('keydown', showUiListener)
	})
	onCleanup(() => {
		document.removeEventListener('keydown', showUiListener)
	})
	return (
		<div style={{ position: 'absolute', color: 'white' }}>
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
				<div>
					<For each={entries(groundColors)}>
						{([name, color]) => {
							return (
								<div>
									{name}
									<input type="color" value={color} onChange={e => updateGroundColor(name, e.target.value)}></input>
									{color}
								</div>
							)
						}}
					</For>
					<div>
						<button onClick={() => {
							resetGroundColors()
							window.location.reload() }}
						>
							reset ground colors
						</button>
					</div>
				</div>
				<ToonEditor />
				<SaveEditor />
			</Show>
			<LevelEditor />
		</div>
	)
}
