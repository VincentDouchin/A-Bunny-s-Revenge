import type { Boss } from '@/constants/enemies'
import type { Conversation } from '@/conversation/setupConversation'
import type { QueryEntity } from '@/global/entity'
import { parse } from '@ltd/j-toml'
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import atom from 'solid-use/atom'
import { MapControls } from 'three/addons'
import { OrthographicCamera, PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu'
import { bosses } from '@/constants/enemies'
import { recipes } from '@/constants/recipes'
import { validateConversation } from '@/conversation/setupConversation'
import { params } from '@/global/context'
import { RenderGroup } from '@/global/entity'
import { assets, dayTime, ecs, renderer, save, scene, ui, world } from '@/global/init'
import { cameraQuery, gameCameraQuery, getTargetSize, updateRenderSize } from '@/global/rendering'
import { app } from '@/global/states'
import { RapierDebugRenderer } from '@/lib/debugRenderer'
import { encounters } from '@/states/dungeon/encounters'
import { playerBundle } from '@/states/game/spawnPlayer'
import { weaponBundle } from '@/states/game/weapon'
import { entries, objectKeys } from '@/utils/mapFunctions'
import { useLocalStorage } from '@/utils/useLocalStorage'
import { debugOptions } from './debugState'
import { SaveEditor } from './saveEditor'
import { SoundUi } from './SoundUi'

export const [selectedBoss, setSelectedBoss] = useLocalStorage<{ boss: Boss }>('selectedBoss', { boss: 'Armabee_Evolved' })
const rendererQuery = ecs.with('scene', 'renderGroup').where((e) => e.renderGroup === RenderGroup.Game)

const [localParams, setParams] = useLocalStorage('params', params as any)
Object.assign(params, { ...localParams, zoom: params.zoom, cameraOffsetX: 0, cameraOffsetY: 150, cameraOffsetZ: -200 })
export const getGameRenderGroup = () => {
	const gameRenderGroup = rendererQuery.first
	if (gameRenderGroup) {
		return gameRenderGroup
	} else {
		throw new Error("can't find game renderGroup")
	}
}

export const updatePixelation = (e: Event) => {
	const target = e.target as HTMLInputElement
	const val = target.valueAsNumber
	updateRenderSize(getTargetSize(val))
}
const changePixelation = (pixelation: boolean) => {
	if (pixelation) {
		updateRenderSize(getTargetSize())
	} else {
		renderer.setSize(window.innerWidth, window.innerHeight)
	}
}
export const DebugUi = () => {
	const [showUi, setShowUi] = createSignal(false)
	const centerPlayer = async () => {
		for (const player of ecs.with('player')) {
			ecs.remove(player)
		}
		ecs.add({
			...(await playerBundle(10, null)),
			position: new Vector3(),
			rotation: new Quaternion(),
			targetRotation: new Quaternion(),
		})
	}
	const destroyCrops = () => {
		save.crops = {}
		app.enable('farm', { direction: null })
	}
	const reset = async () => {
		app.disable('farm')
		await reset()
		window.location.reload()
	}
	const showUiListener = (e: KeyboardEvent) => {
		if (e.code === 'F1') {
			e.preventDefault()
			setShowUi(!showUi())
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
		ecs.addComponent(camera, 'camera', new PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 1000))
	}
	const changeCameraOrtho = () => {
		const camera = removeCamera()
		if (!camera) return
		const width = window.innerWidth
		const height = window.innerHeight
		ecs.addComponent(camera, 'camera', new OrthographicCamera(-width / 2 / params.zoom, width / 2 / params.zoom, height / 2 / params.zoom, -height / 2 / params.zoom, 0.1, 1000))
	}
	const enableAttackAnimations = () => {
		debugOptions.attackInFarm(!debugOptions.attackInFarm())
		for (const player of ecs.with('model', 'player')) {
			if (debugOptions.attackInFarm()) {
				ecs.update(player, { weapon: weaponBundle('SwordWeapon') })
			} else {
				ecs.removeComponent(player, 'weapon')
			}
		}
	}
	const toggleGodMode = () => {
		debugOptions.godMode(!debugOptions.godMode())
		for (const player of ecs.with('player', 'modifiers')) {
			if (debugOptions.godMode()) {
				player.modifiers.addModifier('godMode')
			} else {
				player.modifiers.removeModifiers('godMode')
			}
		}
	}
	const dayToNight = ui.sync(() => dayTime.dayToNight)
	const [currentTime, setCurrentTime] = createSignal(dayTime.current)

	let debugRenderer: RapierDebugRenderer | null = null
	const toggleDebugRenderer = (enable: boolean) => {
		if (enable) {
			debugRenderer = new RapierDebugRenderer(world)
			scene.add(debugRenderer)
		} else {
			if (debugRenderer) {
				debugRenderer.removeFromParent()
				debugRenderer = null
			}
		}
	}
	ui.updateSync(() => {
		if (debugRenderer) {
			debugRenderer.update()
		}
	})

	const debug = () => {
		// oxlint-disable-next-line no-unused-expressions
		save
		// oxlint-disable-next-line no-debugger
		debugger
	}

	let gameCamera: QueryEntity<typeof gameCameraQuery> | null = null
	let controls: MapControls | null = null
	let controlsUpdate: number | null = null
	const unlockCamera = () => {
		if (gameCamera && controls && controlsUpdate !== null) {
			controls.dispose()
			controls = null
			cancelAnimationFrame(controlsUpdate)
			ecs.addComponent(gameCamera, 'mainCamera', true)
			gameCamera = null
			controlsUpdate = null
		} else {
			const camera = gameCameraQuery.first
			if (camera) {
				ecs.removeComponent(camera, 'mainCamera')
				gameCamera = camera
				controls = new MapControls(camera.camera, document.body)
				function update() {
					controls?.update()
					requestAnimationFrame(update)
				}
				controlsUpdate = requestAnimationFrame(update)
			}
		}
	}
	const conversationError = atom<string | null>(null)
	const displayCharacterList = atom(false)
	const testConversation = (e: Event) => {
		conversationError(null)
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = async (e: ProgressEvent<FileReader>) => {
			const result = e.target?.result
			if (typeof result == 'string') {
				const conversation = parse(result) as unknown as Conversation
				try {
					validateConversation(conversation)
					// oxlint-disable-next-line no-console
					console.log(conversation)
					ecs.add({ conversation })
				} catch (e) {
					conversationError(String(e))
				}
			}
		}
		reader.readAsText(file)
	}
	return (
		<div style={{ position: 'absolute', color: 'white', 'z-index': 1000 }}>
			<Show when={showUi()}>
				<div
					style={{
						background: 'darkgray',
						display: 'grid',
						'grid-template-columns': 'auto auto',
						color: 'black',
						'font-size': '20px',
						padding: '10px',
						margin: '10px',
						gap: '10px',
						'max-height': '80vh',
						'overflow-y': 'auto',
					}}
				>
					<div>test dialog</div>
					<input
						type="file"
						accept=".toml"
						onInput={testConversation}
					></input>
					<Show when={conversationError()}>{(error) => <div style={{ color: 'red', 'grid-column': 'span 2' }}>{error()}</div>}</Show>
					<button onClick={() => displayCharacterList(!displayCharacterList())}>Display character list</button>
					<div></div>
					<Show when={displayCharacterList()}>
						<div style="position: fixed; inset:2rem; left: 400px; right: 400px;padding: 2rem;background: white;height: 80dvh;overflow-y: scroll;">
							{entries(assets.characters).map(([name, model]) => {
								const showAnimations = atom(false)
								return (
									<>
										<button onClick={() => showAnimations(!showAnimations())}>{name}</button>
										<div>{showAnimations() && model.animations?.map((animation) => animation.name).join(' / ')}</div>
									</>
								)
							})}
						</div>
					</Show>
					<div>debug</div>
					<button onClick={debug}>debug</button>
					<div>Perspective</div>
					<div>
						<button onClick={changeCameraNormal}>Normal</button>
						<button onClick={changeCameraOrtho}>Ortho</button>
					</div>
					Camera
					<div>
						<button onClick={unlockCamera}>Unlock camera</button>
					</div>
					Render height
					<input
						type="number"
						value={params.renderHeight}
						onChange={updatePixelation}
					></input>
					SpeedUp
					<input
						type="number"
						value={params?.speedUp}
						onChange={(e) => (params.speedUp = e.target.valueAsNumber)}
					></input>
					Dialog speed
					<input
						type="number"
						value={params?.dialogSpeed}
						onChange={(e) => (params.dialogSpeed = e.target.valueAsNumber)}
					></input>
					Pixelation
					<input
						type="checkbox"
						checked={params.pixelation}
						onChange={(e) => changePixelation(e.target.checked)}
					></input>
					Skip main menu
					<input
						type="checkbox"
						checked={params.skipMainMenu}
						onChange={(e) => setParams((d) => ({ ...d, skipMainMenu: e.target.checked }))}
					></input>
					Debug Boss
					<div>
						<input
							type="checkbox"
							checked={params.debugBoss}
							onChange={(e) => setParams((d) => ({ ...d, debugBoss: e.target.checked }))}
						></input>
						<select onChange={(e) => setSelectedBoss((_) => ({ boss: e.target.value as Boss }))}>
							{Object.keys(bosses).map((name) => {
								return (
									<option
										selected={name === selectedBoss.boss}
										value={name}
									>
										{name}
									</option>
								)
							})}
						</select>
					</div>
					Debug Enemies
					<input
						type="checkbox"
						checked={params.debugEnemies}
						onChange={(e) => setParams((d) => ({ ...d, debugEnemies: e.target.checked }))}
					></input>
					Debug Intro
					<input
						type="checkbox"
						checked={params.debugIntro}
						onChange={(e) => setParams((d) => ({ ...d, debugIntro: e.target.checked }))}
					></input>
					Debug Renderer
					<input
						type="checkbox"
						onChange={(e) => toggleDebugRenderer(e.target.checked)}
					></input>
					Time of day
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={currentTime()}
						onChange={(e) => {
							setCurrentTime(e.target.valueAsNumber)
							dayTime.current = e.target.valueAsNumber
						}}
					></input>
					<button
						classList={{ selected: dayToNight() }}
						onClick={() => (dayTime.dayToNight = true)}
					>
						Day to night
					</button>
					<button
						classList={{ selected: !dayToNight() }}
						onClick={() => (dayTime.dayToNight = false)}
					>
						Night to day
					</button>
				</div>
				<div style={{ display: 'flex', gap: '1rem', margin: '1rem', width: '20rem' }}>
					<button onClick={centerPlayer}>center player</button>
					<button onClick={destroyCrops}>Destroy crops</button>
					<button onClick={reset}>Reset Save</button>
					<button
						classList={{ selected: debugOptions.attackInFarm() }}
						onClick={enableAttackAnimations}
					>
						{debugOptions.attackInFarm() ? 'Disable attack animations' : 'Enable attack animations'}
					</button>
					<button
						classList={{ selected: debugOptions.godMode() }}
						onClick={toggleGodMode}
					>
						{debugOptions.godMode() ? 'Disable god mode' : 'Enable god mode'}
					</button>
				</div>

				<div style={{ position: 'fixed', right: 0, top: 0 }}>
					<div style={{ background: 'darkgray', margin: '1rem', padding: '1rem', color: 'black', 'font-size': '20px' }}>
						<div>Debug NPC encounters</div>
						<For each={objectKeys(encounters)}>
							{(encounter) => (
								<div>
									{encounter}
									<button onClick={() => encounters[encounter]()}>enable</button>
								</div>
							)}
						</For>
					</div>
					<div style={{ background: 'darkgray', margin: '1rem', padding: '1rem', color: 'black', 'font-size': '20px', height: '20rem', 'overflow-y': 'scroll' }}>
						<div>Unlock recipes</div>
						<For each={recipes.map((r) => r.output.name)}>
							{(recipe) => (
								<div>
									{recipe}
									<button onClick={() => save.unlockedRecipes.push(recipe)}>enable</button>
								</div>
							)}
						</For>
					</div>
				</div>
			</Show>
			<SaveEditor />
			<SoundUi />
		</div>
	)
}
