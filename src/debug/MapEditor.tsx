import type { Accessor } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import type { Vector3 } from 'three'
import { CanvasTexture, CircleGeometry, DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, Raycaster, Vector2 } from 'three'
import type { Level, LevelImage } from './LevelEditor'
import { ecs } from '@/global/init'
import { cameraQuery, renderer, scene } from '@/global/rendering'
import { throttle } from '@/lib/state'
import { GroundMaterial } from '@/shaders/GroundShader'
import { spawnGrass, spawnTrees } from '@/states/game/spawnLevel'
import { getScreenBuffer } from '@/utils/buffer'

type drawingColors = 'path' | 'trees' | 'trees_transparent' | 'grass' | 'heightMap'
const colors: Record<drawingColors, string> = {
	path: 'rgb(255,0,0)',
	trees: 'rgb(0,255,0)',
	trees_transparent: 'rgb(255,0,0)',
	grass: 'rgb(255,0,0)',
	heightMap: 'rgba(255,255,255,1)',
}
const canvases: Record<drawingColors, LevelImage> = {
	path: 'path',
	trees: 'trees',
	trees_transparent: 'trees',
	grass: 'grass',
	heightMap: 'heightMap',
}
const grassQuery = ecs.with('grass')
const treeQuery = ecs.with('tree')
export const MapEditor = ({ updateLevel, activeLevel }: { updateLevel: (l: Partial<Level>) => void, activeLevel: Accessor<Level> }) => {
	const [brush, setBrush] = createSignal(10)
	const [intensity, setIntensity] = createSignal(0.5)
	const [up, setUp] = createSignal(true)
	const [gradual, setGradual] = createSignal(true)
	const [selectedColor, setSelectedColor] = createSignal<drawingColors>('path')
	const ground = ecs.with('ground', 'model').first!
	const selectedCanvas = createMemo(() => activeLevel()[canvases[selectedColor()]])

	const buffer = createMemo(() => selectedCanvas().getContext('2d', { willReadFrequently: true })!)
	const groundMat = () => ((ground.model as Mesh).material as any)
	createEffect(() => {
		if (selectedColor() === 'path') {
			if (!(ground && ground.model instanceof Mesh)) return
			const levelText = new CanvasTexture(activeLevel().path)
			levelText.flipY = false
			groundMat().uniforms.level.value = levelText
			groundMat().uniforms.size.value = new Vector2(activeLevel().size.x, activeLevel().size.y)
		}
	})
	const mesh = new Mesh(
		new CircleGeometry(brush()),
		new MeshBasicMaterial({ transparent: true, opacity: 0.5, color: 0xFFFFFF, side: DoubleSide }),
	)
	createEffect(() => {
		mesh.geometry = new CircleGeometry(brush())
	})
	mesh.renderOrder = 1000
	mesh.material.depthTest = false
	mesh.position.y = 1
	mesh.rotateX(Math.PI / 2)
	const drawCircle = (position: Vector3, color: string) => {
		const img = selectedCanvas()
		buffer().fillStyle = color
		buffer().beginPath()
		buffer().arc(
			position.x + img.width / 2,
			img.height / 2 - position.z,
			brush(),
			0,
			2 * Math.PI,
		)
		buffer().fill()
	}

	const longClickListener = throttle(100, (event: MouseEvent) => {
		const camera = cameraQuery.first?.camera
		if (!camera) return

		const pointer = new Vector2()
		pointer.x = (event.clientX / window.innerWidth) * 2 - 1
		pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

		const raycaster = new Raycaster()
		raycaster.setFromCamera(pointer, camera)

		const intersects = raycaster.intersectObjects(scene.children)
		const position = intersects.find(x => x.object === ground.model)?.point
		if (!position) return
		mesh.position.x = position.x
		mesh.position.z = position.z
		if (!event.buttons) return
		if (event.buttons !== 1) {
			drawCircle(position, 'black')
		} else if (selectedColor() === 'heightMap') {
			if (gradual()) {
				const color = up() ? 255 : 0
				drawCircle(position, `rgba(${color},${color},${color},${intensity()})`)
			} else {
				const color = intensity() * 255
				drawCircle(position, `rgba(${color},${color},${color},1)`)
			}
		} else {
			drawCircle(position, colors[selectedColor()])
		}

		updateLevel({ [canvases[selectedColor()]]: selectedCanvas() })
		if (canvases[selectedColor()] === 'path') {
			groundMat().uniforms.level.value.needsUpdate = true
		}
		if (canvases[selectedColor()] === 'trees') {
			for (const tree of treeQuery) {
				ecs.remove(tree)
			}
			spawnTrees(activeLevel())
		}
		if (canvases[selectedColor()] === 'grass') {
			for (const grass of grassQuery) {
				ecs.remove(grass)
			}
			spawnGrass(activeLevel())
		}
		if (canvases[selectedColor()] === 'heightMap') {
			groundMat().displacementMap.needsUpdate = true
			groundMat().map.needsUpdate = true
		}
	})
	const respawnEnvListener = () => {
		for (const tree of treeQuery) {
			ecs.remove(tree)
		}
		spawnTrees(activeLevel())
		for (const grass of grassQuery) {
			ecs.remove(grass)
		}
		spawnGrass(activeLevel())
	}
	onMount(async () => {
		scene.add(mesh)
		renderer.domElement.addEventListener('mousemove', longClickListener)
		renderer.domElement.addEventListener('mouseup', respawnEnvListener)
	})
	onCleanup(() => {
		mesh.removeFromParent()
		renderer.domElement.removeEventListener('mousemove', longClickListener)
		renderer.domElement.removeEventListener('mouseup', respawnEnvListener)
	})

	const flipCanvas = (horizontal = false, vertical = false) => {
		const image = buffer().canvas
		const newBuffer = getScreenBuffer(image.width, image.height)
		newBuffer.fillStyle = 'black'
		newBuffer.fillRect(0, 0, image.width, image.height)
		buffer().save() // save the current canvas state
		buffer().setTransform(
			horizontal ? -1 : 1,
			0, // set the direction of x axis
			0,
			vertical ? -1 : 1, // set the direction of y axis
			(horizontal ? image.width : 0), // set the x origin
			(vertical ? image.height : 0), // set the y origin
		)
		newBuffer.drawImage(image, 0, 0)
		buffer().drawImage(newBuffer.canvas, 0, 0)
		buffer().restore() // restore the state as it was when this function was called
		groundMat().uniforms.level.value.needsUpdate = true
		updateLevel({ [canvases[selectedColor()]]: selectedCanvas() })
	}
	const resetGroundMat = () => {
		const displacementMap = new CanvasTexture(activeLevel().heightMap)
		displacementMap.flipY = false;
		(ground.model as Mesh).material = new (GroundMaterial(activeLevel().path, activeLevel().size.x, activeLevel().size.y))({ displacementMap, displacementScale: 30, displacementBias: 0.5 })
	}
	onCleanup(resetGroundMat)
	createEffect(() => {
		if (selectedColor() === 'heightMap') {
			const displacementMap = new CanvasTexture(activeLevel().heightMap)
			displacementMap.flipY = false;
			(ground.model as Mesh).material = new MeshStandardMaterial({ map: displacementMap, displacementMap, displacementScale: 30, displacementBias: 0 })
		} else {
			resetGroundMat()
		}
	})

	return (
		<div>
			<div>

				<div>
					<div style={{ background: 'black', scale: '-1 1', width: '150px' }}>{selectedCanvas()}</div>
					<button onClick={() => flipCanvas(true, false)}>flip X</button>
					<button onClick={() => flipCanvas(false, true)}>flip Y</button>
					<For each={['path', 'trees', 'trees_transparent', 'grass', 'heightMap'] as drawingColors[]}>
						{color => <div><button style={{ width: '100%' }} onClick={() => setSelectedColor(color)} classList={{ selected: selectedColor() === color }}>{color}</button></div>}
					</For>
				</div>

				<div>Brush size</div>
				<div>
					{Math.round(brush())}
					<input type="range" name="brush size" min="1" max="100" value={brush()} onChange={e => setBrush(e.target.valueAsNumber)}></input>
				</div>
				<Show when={selectedColor() === 'heightMap'}>
					<div>Brush intensity</div>
					<div>
						{Math.round(intensity() * 100)}
						<input type="range" name="brush size" min="0" max="1" step="0.01" value={intensity()} onChange={e => setIntensity(e.target.valueAsNumber)}></input>
					</div>
					<div>
						<button onClick={() => setUp(x => !x)}>
							push terrain
							{up() ? ' up' : ' down'}
						</button>

					</div>
					<div>
						<button classList={{ selected: gradual() }} onClick={() => setGradual(true)}>gradual</button>
						<button classList={{ selected: !gradual() }} onClick={() => setGradual(false)}>fixed height</button>
					</div>
				</Show>

			</div>
		</div>
	)
}