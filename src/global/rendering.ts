import { BasicShadowMap, DepthTexture, LinearSRGBColorSpace, NearestFilter, PerspectiveCamera, RGBAFormat, Scene, ShaderMaterial, Vector3, WebGLRenderTarget, WebGLRenderer } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { camera } from './camera'
import { params } from './context'
import { ecs } from './init'
import { getDepthShader, getSobelShader } from '@/shaders/EdgePass'
import { throttle } from '@/lib/state'

export const scene = new Scene()
export const renderer = new WebGLRenderer({ alpha: false })
renderer.setPixelRatio(1)
export const cssRenderer = new CSS2DRenderer()
const ratio = window.innerHeight / window.innerWidth
export const width = params.renderWidth
// const width = window.innerWidth
// const height = window.innerHeight
export const height = Math.round(width * ratio)
const target = new WebGLRenderTarget(width, height)
const depthTarget = new WebGLRenderTarget(width, height)
depthTarget.texture.format = RGBAFormat
depthTarget.texture.magFilter = NearestFilter
depthTarget.texture.minFilter = NearestFilter
depthTarget.texture.generateMipmaps = false
target.texture.format = RGBAFormat
target.texture.minFilter = NearestFilter
target.texture.magFilter = NearestFilter
target.texture.generateMipmaps = false
target.stencilBuffer = false
target.depthBuffer = true
target.depthTexture = new DepthTexture(width, height)
const depthQuad = new FullScreenQuad(new ShaderMaterial(getDepthShader(target)))
const sobelQuad = new FullScreenQuad(new ShaderMaterial(getSobelShader(width, height, target, depthTarget)))

export const initThree = () => {
	renderer.clear()
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = BasicShadowMap
	renderer.domElement.classList.add('main')
	document.body.appendChild(renderer.domElement)
	renderer.outputColorSpace = LinearSRGBColorSpace
	renderer.setSize(width, width * ratio)
	cssRenderer.setSize(window.innerWidth, window.innerHeight)
	cssRenderer.domElement.style.position = 'fixed'
	cssRenderer.domElement.style.left = '0'
	cssRenderer.domElement.style.top = '0'
	cssRenderer.domElement.style.imageRendering = 'pixelated'
	cssRenderer.domElement.style.pointerEvents = 'none'
	cssRenderer.domElement.classList.add('main')
	cssRenderer.domElement.classList.add('no-events')
	document.body.appendChild(cssRenderer.domElement)
	ecs.add({ scene })
}
export const rendererQuery = ecs.with('renderer')
export const sceneQuery = ecs.with('scene')
export const cameraQuery = ecs.with('camera')

export const render = throttle(1 / 60, () => {
	renderer.render(scene, camera)
	if (params.pixelation) {
		renderer.setRenderTarget(depthTarget)
		depthQuad.render(renderer)
		renderer.setRenderTarget(null)
		sobelQuad.render(renderer)
		renderer.setRenderTarget(target)
	} else {
		renderer.setRenderTarget(null)
	}
	cssRenderer.render(scene, camera)
})

const controlsQuery = ecs.with('controls')
export const updateControls = () => {
	for (const { controls } of controlsQuery) {
		controls.update()
	}
}
export const preCompileShaders = () => ecs.with('model').onEntityAdded.subscribe((e) => {
	const compileCamera = new PerspectiveCamera()
	e.model.add(compileCamera)
	compileCamera.position.set(...new Vector3(0, 20, 0).add(e.model.position).toArray())
	compileCamera.lookAt(e.model.position)
	renderer.compileAsync(e.model, compileCamera, scene).then(() => {
		compileCamera.removeFromParent()
	})
})