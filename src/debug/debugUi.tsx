import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { ShaderMaterial } from 'three'
import { Color, Mesh, OrthographicCamera, PerspectiveCamera } from 'three'
import { LevelEditor } from './LevelEditor'
import { SaveEditor } from './saveEditor'
import { ToonEditor } from './toonEditor'
import { params } from '@/global/context'
import { ecs } from '@/global/init'
import { cameraQuery, depthQuad, height, renderer, width } from '@/global/rendering'
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
	const changePixelation = (pixelation: boolean) => {
		params.pixelation = pixelation
		if (pixelation) {
			const val = params.renderWidth
			const ratio = window.innerHeight / window.innerWidth
			renderer.setSize(val, val * ratio)
		} else {
			renderer.setSize(window.innerWidth, window.innerHeight)
		}
	}
	const removeCamera = () => {
		const camera = cameraQuery.first
		if (!camera) return
		ecs.removeComponent(camera, 'camera')
		return camera
	}
	const changeCameraNormal = () => {
		const camera = removeCamera()
		if (!camera) return
		(depthQuad.material as ShaderMaterial).uniforms.orthographic.value = false
		ecs.addComponent(camera, 'camera', new PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 1000))
	}
	const changeCameraOrtho = () => {
		const camera = removeCamera()
		if (!camera) return
		(depthQuad.material as ShaderMaterial).uniforms.orthographic.value = true
		ecs.addComponent(camera, 'camera', new OrthographicCamera(
			-width / 2 / params.zoom,
			width / 2 / params.zoom,
			height / 2 / params.zoom,
			-height / 2 / params.zoom,
			0.1,
			1000,
		))
	}
	const changeZoom = (zoom: number) => {
		params.zoom = zoom
		const camera = cameraQuery.first
		if (!camera) return
		if (camera.camera instanceof PerspectiveCamera) {
			camera.camera.zoom = window.innerWidth / window.innerHeight / zoom
			camera.camera.updateProjectionMatrix()
		}
		if (camera.camera instanceof OrthographicCamera) {
			camera.camera.left = -width / 2 / params.zoom
			camera.camera.right = width / 2 / params.zoom
			camera.camera.top = height / 2 / params.zoom
			camera.camera.bottom = -height / 2 / params.zoom
			camera.camera.updateProjectionMatrix()
		}
	}
	return (
		<div style={{ position: 'absolute', color: 'white' }}>
			<Show when={showUi()}>
				<div>
					<div>Perspective</div>
					<div>
						<button onClick={changeCameraNormal}>Normal</button>
						<button onClick={changeCameraOrtho}>Ortho</button>
					</div>
				</div>
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
						onChange={e => changeZoom(e.target.valueAsNumber)}
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
					Pixelation
					<input type="checkbox" checked={params.pixelation} onChange={e => changePixelation(e.target.checked)}></input>
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
