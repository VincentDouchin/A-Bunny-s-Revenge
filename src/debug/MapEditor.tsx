import type { Accessor } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import type { MeshPhongMaterial, PlaneGeometry, Vector3 } from 'three'
import { CanvasTexture, CircleGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector2 } from 'three'
import type { Level, LevelImage } from './LevelEditor'
import { getGameRenderGroup } from './debugUi'
import { loadImage } from '@/global/assetLoaders'
import { ecs } from '@/global/init'
import { cameraQuery } from '@/global/rendering'
import { throttle } from '@/lib/state'
import { getdisplacementMap, setDisplacement, spawnGrass, spawnGroundAndTrees, spawnTrees } from '@/states/game/spawnLevel'
import { getScreenBuffer } from '@/utils/buffer'

type drawingColors = 'path' | 'trees' | 'trees_transparent' | 'grass' | 'heightMap' | 'water' | 'bridge'
const colors: Record<drawingColors, string> = {
	path: 'rgb(255,0,0)',
	trees: 'rgb(0,255,0)',
	trees_transparent: 'rgb(255,0,0)',
	grass: 'rgb(255,0,0)',
	heightMap: 'rgba(255,255,255,1)',
	water: 'rgba(255,255,255,1)',
	bridge: 'rgba(255,0,0,1)',
}
const canvases: Record<drawingColors, LevelImage> = {
	path: 'path',
	trees: 'trees',
	trees_transparent: 'trees',
	grass: 'grass',
	heightMap: 'heightMap',
	water: 'water',
	bridge: 'water',
}
const grassQuery = ecs.with('grass')
const groundQuery = ecs.with('ground', 'model')
const treeQuery = ecs.with('tree')
export const MapEditor = ({
	updateLevel,
	activeLevel,
	switchLevel,
	fakeGround,
}: {
	updateLevel: (l: Partial<Level>) => void
	activeLevel: Accessor<Level>
	switchLevel: () => void
	fakeGround: null | Mesh<PlaneGeometry>
}) => {
	const [brush, setBrush] = createSignal(10)
	const [hardness, setHardness] = createSignal(50)
	const [intensity, setIntensity] = createSignal(0.5)
	const [up, setUp] = createSignal(true)
	const [gradual, setGradual] = createSignal(true)
	const [selectedColor, setSelectedColor] = createSignal<drawingColors>('path')
	const selectedCanvas = createMemo(() => activeLevel()[canvases[selectedColor()]])

	const buffer = createMemo(() => selectedCanvas().getContext('2d', { willReadFrequently: true })!)
	const ground = () => groundQuery.first!
	const groundMat = () => ((groundQuery.first!.model as Mesh).material as any)
	const waterMat = () => ([...ground().children?.values() ?? []].find(x => x.withTimeUniform)?.model as Mesh).material as MeshPhongMaterial
	createEffect(() => {
		if (selectedColor() === 'path') {
			const levelText = new CanvasTexture(activeLevel().path)
			levelText.flipY = false
			if (!groundMat().uniforms?.level) return
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
		const x = position.x + img.width / 2
		const y = img.height / 2 - position.z
		if (hardness() < 100) {
			const gradient = buffer().createRadialGradient(x, y, brush() * hardness() / 100, x, y, brush())
			gradient.addColorStop(0, color)
			gradient.addColorStop(1, 'transparent')
			buffer().fillStyle = gradient
		} else {
			buffer().fillStyle = color
		}

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
	const respawnTrees = throttle(100, () => spawnTrees(activeLevel(), ground(), undefined, false))
	const longClickListener = throttle(10, (event: MouseEvent) => {
		event.preventDefault()
		const camera = cameraQuery.first?.camera
		if (!camera || !fakeGround) return

		const pointer = new Vector2()
		pointer.x = (event.clientX / window.innerWidth) * 2 - 1
		pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

		const raycaster = new Raycaster()
		raycaster.setFromCamera(pointer, camera)
		const intersect = raycaster.intersectObject(fakeGround)
		const position = intersect[0]?.point
		if (!position) return
		mesh.position.x = position.x
		mesh.position.z = position.z
		mesh.position.y = position.y
		if (!event.buttons) return
		if (event.buttons !== 1) {
			buffer().save()
			buffer().globalCompositeOperation = 'destination-out'
			drawCircle(position, 'black')
			buffer().restore()
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
			respawnTrees({})
		}
		if (canvases[selectedColor()] === 'grass') {
			for (const grass of grassQuery) {
				ecs.remove(grass)
			}
			spawnGrass(activeLevel(), ground())
		}
		if (canvases[selectedColor()] === 'heightMap') {
			const displacementMap = getdisplacementMap(activeLevel())
			const displacementTexture = new CanvasTexture(displacementMap)
			displacementTexture.flipY = false
			setDisplacement(fakeGround.geometry, displacementMap);
			((ground().model as Mesh).material as MeshPhongMaterial).displacementMap = displacementTexture
		}
		if (canvases[selectedColor()] === 'water') {
			const mat = waterMat()
			mat.map?.needsUpdate && (mat.map.needsUpdate = true)
		}
	})

	const displayWater = () => {
		const waterMap = new CanvasTexture(activeLevel().water)
		waterMap.flipY = false
		waterMat().map = waterMap
	}
	createEffect(() => {
		if (selectedColor() === 'water') {
			displayWater()
		}
	})
	const respawnEnvListener = () => {
		if (selectedColor() === 'heightMap' || canvases[selectedColor()] === 'water') {
			ecs.remove(ground())
			spawnGroundAndTrees(activeLevel())
			// selectedColor() === 'heightMap' && displayHeights()
			selectedColor() === 'water' && displayWater()
		}
	}
	const { scene, renderer } = getGameRenderGroup()
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
	const download = () => {
		const a = document.createElement('a')
		document.body.appendChild(a)
		a.setAttribute('download', `${activeLevel().name} ${canvases[selectedColor()]}`)
		a.href = selectedCanvas().toDataURL()
		a.click()
		a.remove()
	}
	const upload = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.png'
		input.addEventListener('change', async (e) => {
			const file = (e.target as HTMLInputElement)?.files?.[0]
			if (!file) return
			const reader = new FileReader()
			reader.onload = async (e: ProgressEvent<FileReader>) => {
				if (e.target?.result) {
					const img = await loadImage(e.target.result as string)
					buffer().drawImage(img, 0, 0, selectedCanvas().width, selectedCanvas().height)
					updateLevel({ [canvases[selectedColor()]]: selectedCanvas() })
					if (selectedColor() === 'heightMap') {
						switchLevel()
					}
					groundMat().uniforms.level.value.needsUpdate = true
					updateLevel({ [canvases[selectedColor()]]: selectedCanvas() })
				}
			}
			reader.readAsDataURL(file)
		})
		input.click()
	}
	const clearCanvas = () => {
		buffer().save()
		buffer().globalCompositeOperation = 'destination-out'
		buffer().fillStyle = 'black'
		buffer().fillRect(0, 0, buffer().canvas.width, buffer().canvas.height)
		buffer().restore()
		groundMat().uniforms.level.value.needsUpdate = true
		updateLevel({ [canvases[selectedColor()]]: selectedCanvas() })
	}
	return (
		<div>
			<div>

				<div>
					<div style={{ background: 'black', scale: '-1 1' }} class="debug-canvas-container">{selectedCanvas()}</div>
					<button onClick={() => flipCanvas(true, false)}>flip X</button>
					<button onClick={() => flipCanvas(false, true)}>flip Y</button>
					<button onClick={clearCanvas}>clear</button>
					<div>
						<button onClick={download}>download</button>
						<button onClick={upload}>upload</button>
					</div>
					<For each={['path', 'trees', 'trees_transparent', 'grass', 'heightMap', 'water', 'bridge'] as drawingColors[]}>
						{color => <div><button style={{ width: '100%' }} onClick={() => setSelectedColor(color)} classList={{ selected: selectedColor() === color }}>{color}</button></div>}
					</For>
				</div>

				<div>Brush size</div>
				<div>
					{Math.round(brush())}
					<input type="range" name="brush size" min="1" max="100" value={brush()} onChange={e => setBrush(e.target.valueAsNumber)}></input>
				</div>
				<div>Brush hardness (%)</div>
				<div>
					{Math.round(hardness())}
					<input type="range" name="brush size" min="1" max="100" value={hardness()} onChange={e => setHardness(e.target.valueAsNumber)}></input>
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