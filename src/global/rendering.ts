import type { Object3D } from 'three/webgpu'
import { CSS2DRenderer } from 'three/addons'

import {
	ACESFilmicToneMapping,
	BasicShadowMap,
	DepthTexture,
	Group,
	Material,
	MeshBasicNodeMaterial,
	NodeMaterial,
	OrthographicCamera,
	QuadMesh,
	RenderTarget,
	SRGBColorSpace,
	Texture,
	Vector2,
	Vector3,
	WebGPURenderer,
} from 'three/webgpu'

import { setupPostProcessing } from '@/shaders/EdgePass'
import { entries, objectValues } from '@/utils/mapFunctions'
import { params } from './context'
import { RenderGroup } from './entity'
import { assets, ecs, scene, settings } from './init'

export const renderer = new WebGPURenderer({ alpha: false })
await renderer.init()
renderer.debug.checkShaderErrors = false
renderer.setPixelRatio(1)

const cssRenderer = new CSS2DRenderer()

export const width = window.innerWidth
export const height = window.innerHeight
export const target = new RenderTarget(width, height, { depthBuffer: true })
target.depthTexture = new DepthTexture(width, height)
const outlineTarget = new RenderTarget(width, height, { depthBuffer: true })
outlineTarget.depthTexture = new DepthTexture(width, height)
const outlineTarget2 = new RenderTarget(width, height)
export const finalTarget = new RenderTarget(width, height)

const { postProcessing, uniforms, outlineNode } = setupPostProcessing(renderer, width, height, target, outlineTarget, outlineTarget2)

// Create a quad mesh for rendering the outline pass
const outlineMaterial = new NodeMaterial()
outlineMaterial.colorNode = outlineNode
const outlineQuad = new QuadMesh(outlineMaterial)
export const getTargetSize = (height = params.renderHeight) => {
	// return new Vector2(window.innerWidth, window.innerHeight)
	const ratio = window.innerWidth / window.innerHeight
	const width = height * ratio
	return new Vector2(width, height)
}
export const updateRenderSize = (newSize?: Vector2, force = true) => {
	newSize ??= getTargetSize()
	uniforms.resolution.value = newSize
	if (force) {
		const cssRendererSize = cssRenderer.getSize()
		if (cssRendererSize.width !== window.innerWidth || cssRendererSize.height !== window.innerHeight) {
			cssRenderer.setSize(window.innerWidth, window.innerHeight)
		}
	}
}
export const initThree = () => {
	renderer.clear()
	renderer.shadowMap.enabled = !settings.disableShadows
	renderer.shadowMap.type = BasicShadowMap
	renderer.domElement.classList.add('main')
	document.body.appendChild(renderer.domElement)
	renderer.outputColorSpace = SRGBColorSpace
	renderer.toneMapping = ACESFilmicToneMapping
	renderer.toneMappingExposure = 0.8
	renderer.setSize(width, height, false)
	cssRenderer.setSize(window.innerWidth, window.innerHeight)
	cssRenderer.domElement.classList.add('main', 'css-renderer')
	document.body.appendChild(cssRenderer.domElement)
	ecs.add({ scene, renderer, renderGroup: RenderGroup.Game, group: new Group() })
}
export const gameRenderGroupQuery = ecs.with('renderer', 'renderGroup', 'scene').where((e) => e.renderGroup === RenderGroup.Game)
export const cameraQuery = ecs.with('camera', 'renderGroup', 'cameraOffset').where((e) => e.renderGroup === RenderGroup.Game)

export const dialogRenderGroupQuery = ecs.with('renderGroup', 'scene').where((e) => e.renderGroup === RenderGroup.Dialog)
export const dialogCameraQuery = ecs.with('camera', 'renderGroup', 'cameraOffset').where((e) => e.renderGroup === RenderGroup.Dialog)

export const gameCameraQuery = cameraQuery.with('cameraOffset').where((e) => e.renderGroup === RenderGroup.Game)
const outlineQuery = ecs.with('outline')
const blankMaterial = new MeshBasicNodeMaterial()

const _right = new Vector3()
const _up = new Vector3()
const _tmp = new Vector3()

export function snapCameraPixel(camera: OrthographicCamera): void {
	const renderW = uniforms.resolution.value.x
	const renderH = uniforms.resolution.value.y

	const pixW = (camera.right - camera.left) / renderW
	const pixH = (camera.top - camera.bottom) / renderH

	camera.updateMatrixWorld()
	camera.matrixWorld.extractBasis(_right, _up, _tmp)

	const pos = camera.position
	const projR = pos.dot(_right)
	const projU = pos.dot(_up)

	const snappedR = Math.round(projR / pixW) * pixW
	const snappedU = Math.round(projU / pixH) * pixH

	pos.addScaledVector(_right, snappedR - projR)
	pos.addScaledVector(_up, snappedU - projU)
	camera.updateMatrixWorld()

	const errR = projR - snappedR // world units
	const errU = projU - snappedU

	uniforms.subPixelOffset.value.set(
		errR / (camera.right - camera.left),
		-errU / (camera.top - camera.bottom), // flip Y: UV vs screen space
	)
}

export const renderGame = () => {
	const camera = cameraQuery.first?.camera
	if (!camera) return
	const truePosition = camera.position.clone()
	if (camera instanceof OrthographicCamera) {
		snapCameraPixel(camera)
	}

	// Base scene
	renderer.setRenderTarget(target)
	renderer.render(scene, camera)

	if (outlineQuery.size > 0) {
		// Outline entities
		camera.layers.set(1)
		scene.overrideMaterial = blankMaterial
		renderer.setRenderTarget(outlineTarget)
		renderer.render(scene, camera)
		scene.overrideMaterial = null
		camera.layers.set(0)

		// Render outline depth comparison to outlineTarget2
		renderer.setRenderTarget(outlineTarget2)
		outlineQuad.render(renderer)
	} else {
		renderer.setRenderTarget(outlineTarget2)
		renderer.clear()
	}

	// Apply final sobel post processing (renders to screen)
	renderer.setRenderTarget(null)
	postProcessing.render()

	cssRenderer.render(scene, camera)
	camera.position.copy(truePosition)
}
const initTextures = (obj: Object3D) => {
	obj.traverse((node) => {
		if ('material' in node && node.material instanceof Material) {
			if ('map' in node.material && node.material.map instanceof Texture) {
				renderer.initTexture(node.material.map)
			}
		}
	})
}

export const initTexturesItemsAndEnemies = () => {
	for (const [name, enemy] of entries(assets.characters)) {
		if (name !== 'BunnyClothed') {
			initTextures(enemy.scene)
		}
	}
	initTextures(assets.models.Chest.scene)
	for (const item of objectValues(assets.items)) {
		initTextures(item.model)
	}
}

export const compileShaders = async () => {
	initTextures(scene)
	const invisible: Object3D[] = []
	scene.traverse((node) => {
		if (!node.visible) {
			node.visible = true
			invisible.push(node)
		}
	})
	for (const { camera } of gameCameraQuery) {
		await renderer.compileAsync(scene, camera)
	}
	for (const node of invisible) {
		node.visible = false
	}
}
