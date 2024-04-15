import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { ShaderMaterial } from 'three'
import { Color, Mesh, OrthographicCamera, PerspectiveCamera } from 'three'
import { LevelEditor } from './LevelEditor'
import { debugOptions } from './debugState'
import { SaveEditor } from './saveEditor'
import { ToonEditor } from './toonEditor'
import { params } from '@/global/context'
import { dayTime, ecs, ui } from '@/global/init'
import { cameraQuery, depthQuad, getTargetSize, height, updateRenderSize, width } from '@/global/rendering'
import { resetSave, updateSave } from '@/global/save'
import { campState } from '@/global/states'
import { ModStage, ModType, createModifier } from '@/lib/stats'
import { weaponBundle } from '@/states/game/weapon'
import { entries } from '@/utils/mapFunctions'
import { useLocalStorage } from '@/utils/useLocalStorage'
import { RenderGroup } from '@/global/entity'

const rendererQuery = ecs.with('renderer', 'scene', 'renderGroup').where(e => e.renderGroup === RenderGroup.Game)

const [localParams, setParams] = useLocalStorage('params', params)
Object.assign(params, localParams)
export const getGameRenderGroup = () => {
	const gameRenderGroup = rendererQuery.first
	if (gameRenderGroup) {
		return gameRenderGroup
	} else {
		throw new Error('can\'t find game renderGroup')
	}
}

const groundQuery = ecs.with('ground', 'model')
export const updatePixelation = (e: Event) => {
	const target = e.target as HTMLInputElement
	const val = target.valueAsNumber
	updateRenderSize(getTargetSize(val))
}
const changePixelation = (pixelation: boolean) => {
	if (pixelation) {
		updateRenderSize(getTargetSize())
	} else {
		const { renderer } = getGameRenderGroup()
		renderer.setSize(window.innerWidth, window.innerHeight)
	}
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
		setGroundColor(d => ({ ...d, [key]: value }))
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
	const attackInFarm = ui.sync(() => debugOptions.attackInFarm)
	const enableAttackAnimations = () => {
		debugOptions.attackInFarm = !debugOptions.attackInFarm
		for (const player of ecs.with('model', 'player')) {
			if (debugOptions.attackInFarm) {
				ecs.update(player, { weapon: weaponBundle('SwordWeapon') })
			} else {
				ecs.removeComponent(player, 'weapon')
			}
		}
	}
	const godMode = ui.sync(() => debugOptions.godMode)
	const modifier = createModifier('debug', 'strength', 999, ModStage.Base, ModType.Add, false)
	const toggleGodMode = () => {
		debugOptions.godMode = !debugOptions.godMode
		if (debugOptions.godMode) {
			for (const player of ecs.with('player', 'strength')) {
				player.strength.addModifier(modifier)
			}
		} else {
			for (const player of ecs.with('player', 'strength')) {
				player.strength.removeModifier(modifier)
			}
		}
	}
	const dayToNight = ui.sync(() => dayTime.dayToNight)
	const currentTime = ui.sync(() => dayTime.current)
	return (
		<div style={{ position: 'absolute', color: 'white' }}>
			<Show when={showUi()}>
				<div style={{ 'background': 'darkgray', 'display': 'grid', 'grid-template-columns': 'auto auto', 'color': 'black', 'font-size': '2rem', 'padding': '1rem', 'margin': '1rem', 'gap': '0.5rem' }}>
					<div>Perspective</div>
					<div>
						<button onClick={changeCameraNormal}>Normal</button>
						<button onClick={changeCameraOrtho}>Ortho</button>
					</div>
					Render height
					<input
						type="number"
						value={params.renderHeight}
						onChange={updatePixelation}
					>
					</input>
					Camera Offset X
					<input
						type="number"
						value={params?.cameraOffsetX}
						onChange={e => params.cameraOffsetX = e.target.valueAsNumber}
					>
					</input>
					Camera Offset Y
					<input
						type="number"
						value={params?.cameraOffsetY}
						onChange={e => params.cameraOffsetY = e.target.valueAsNumber}
					>
					</input>
					Camera Offset Z
					<input
						type="number"
						value={params?.cameraOffsetZ}
						onChange={e => params.cameraOffsetZ = e.target.valueAsNumber}
					>
					</input>
					Zoom
					<input
						type="number"
						value={params?.zoom}
						onChange={e => changeZoom(e.target.valueAsNumber)}
					>
					</input>
					Fov
					<input
						type="number"
						value={params?.fov}
						onChange={e => params.fov = e.target.valueAsNumber}
					>
					</input>
					SpeedUp
					<input
						type="number"
						value={params?.speedUp}
						onChange={e => params.speedUp = e.target.valueAsNumber}
					>
					</input>
					Dialog speed
					<input
						type="number"
						value={params?.dialogSpeed}
						onChange={e => params.dialogSpeed = e.target.valueAsNumber}
					>
					</input>
					Pixelation
					<input type="checkbox" checked={params.pixelation} onChange={e => changePixelation(e.target.checked)}></input>
					Skip main menu
					<input type="checkbox" checked={params.skipMainMenu} onChange={e => setParams(d => ({ ...d, skipMainMenu: e.target.checked }))}></input>
					Debug Boss
					<input type="checkbox" checked={params.debugBoss} onChange={e => setParams(d => ({ ...d, debugBoss: e.target.checked }))}></input>
					Time of day
					<input type="range" min="0" max="1" step="0.01" value={currentTime()} onChange={e => dayTime.current = e.target.valueAsNumber}></input>
					<button classList={{ selected: dayToNight() }} onClick={() => dayTime.dayToNight = true}>Day to night</button>
					<button classList={{ selected: !dayToNight() }} onClick={() => dayTime.dayToNight = false}>Night to day</button>
				</div>
				<div style={{ display: 'flex', gap: '1rem', margin: '1rem', width: '20rem' }}>
					<button onClick={growCrops}>Grow crops</button>
					<button onClick={destroyCrops}>Destroy crops</button>
					<button onClick={reset}>Reset Save</button>
					<button classList={{ selected: attackInFarm() }} onClick={enableAttackAnimations}>
						{attackInFarm() ? 'Disable attack animations' : 'Enable attack animations'}
					</button>
					<button classList={{ selected: godMode() }} onClick={toggleGodMode}>{godMode() ? 'Disable god mode' : 'Enable god mode'}</button>
				</div>

				<div style={{ position: 'fixed', right: 0, top: 0 }}>
					<div style={{ 'background': 'darkgray', 'margin': '1rem', 'padding': '1rem', 'color': 'black', 'font-size': '2rem' }}>
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
					<div style={{ 'background': 'darkgray', 'margin': '1rem', 'padding': '1rem', 'color': 'black', 'font-size': '2rem' }}>
						<ToonEditor />

					</div>
				</div>
			</Show>
			<LevelEditor />
			<SaveEditor />
		</div>
	)
}
