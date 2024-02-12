import type { Accessor } from 'solid-js'
import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { CanvasTexture, CircleGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector2 } from 'three'
import type { Level, LevelImage } from './LevelEditor'
import { ecs } from '@/global/init'
import { cameraQuery, renderer, scene } from '@/global/rendering'
import { throttle } from '@/lib/state'
import { spawnGrass, spawnTrees } from '@/states/game/spawnLevel'

type drawingColors = 'path' | 'trees' | 'trees_transparent' | 'grass' | 'heightMap'
const colors: Record<drawingColors, string> = {
	path: 'rgb(255,0,0)',
	trees: 'rgb(0,255,0)',
	trees_transparent: 'rgb(255,0,0)',
	grass: 'rgb(255,0,0)',
	heightMap: 'rgba(255,255,255,0.1)',
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
	const [color, setColor] = createSignal<drawingColors>('path')
	const ground = ecs.with('ground', 'model').first
	const selectedCanvas = createMemo(() => activeLevel()[canvases[color()]])
	if (ground && ground.model instanceof Mesh) {
		const groundMat = ground.model.material
		const img: HTMLImageElement | HTMLCanvasElement = groundMat.uniforms.level.value.source.data
		const buffer = createMemo(() => selectedCanvas().getContext('2d', { willReadFrequently: true })!)
		createEffect(() => {
			groundMat.uniforms.level.value = new CanvasTexture(activeLevel().path)
			groundMat.uniforms.size.value = new Vector2(activeLevel().size.x, activeLevel().size.y)
		})
		const mesh = new Mesh(
			new CircleGeometry(brush()),
			new MeshBasicMaterial({ transparent: true, opacity: 0.5, color: 0xFFFFFF, side: DoubleSide }),
		)
		createEffect(() => {
			mesh.geometry = new CircleGeometry(brush())
		})
		mesh.position.y = 1
		mesh.rotateX(Math.PI / 2)

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

			buffer().fillStyle = event.buttons === 1 ? colors[color()] : 'black'
			buffer().beginPath()

			buffer().arc(
				img.width / 2 - position.x,
				img.height / 2 - position.z,
				brush(),
				0,
				2 * Math.PI,
			)
			buffer().fill()
			groundMat.uniforms.level.value.needsUpdate = true
			updateLevel({ [canvases[color()]]: selectedCanvas() })
			if (canvases[color()] === 'trees') {
				for (const tree of treeQuery) {
					ecs.remove(tree)
				}
				spawnTrees(activeLevel())
			}
			if (canvases[color()] === 'grass') {
				for (const grass of grassQuery) {
					ecs.remove(grass)
				}
				spawnGrass(activeLevel())
			}
			if (canvases[color()] === 'heightMap') {
				groundMat.displacementMap.needsUpdate = true
			}
		})

		onMount(async () => {
			scene.add(mesh)
			renderer.domElement.addEventListener('mousemove', longClickListener)
		})
		onCleanup(() => {
			mesh.removeFromParent()
			renderer.domElement.removeEventListener('mousemove', longClickListener)
		})
	}

	return (
		<div>
			<div>
				<div style={{ position: 'fixed', width: '150px', bottom: 0, left: 0, background: 'black' }}>
					{selectedCanvas()}
				</div>
				<select value={color()} onChange={e => setColor(e.target.value as drawingColors)}>
					<option value="path">path</option>
					<option value="trees">trees</option>
					<option value="trees_transparent">transparent trees</option>
					<option value="grass">grass</option>
					<option value="heightMap">heightMap</option>
				</select>
				<div>Brush size</div>
				<div><input type="range" name="brush size" min="1" max="100" value={brush()} onChange={e => setBrush(e.target.valueAsNumber)}></input></div>

			</div>
		</div>
	)
}