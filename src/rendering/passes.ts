import { MeshBasicNodeMaterial, OrthographicCamera, Vector3 } from 'three/webgpu'
import { RenderGroup } from '@/global/entity'
import { ecs, renderer } from '@/global/init'
import { SobelUniforms } from '@/shaders/EdgePass'
import { app } from '@/global/states'
export const gameRenderGroupQuery = ecs.with('renderGroup', 'scene', 'renderPipeline', 'cssRenderer').where((e) => e.renderGroup === RenderGroup.Game)
export const cameraQuery = ecs.with('camera', 'renderGroup', 'cameraOffset').where((e) => e.renderGroup === RenderGroup.Game)

const outlineQuery = ecs.with('outline')
const blankMaterial = new MeshBasicNodeMaterial()

const _right = new Vector3()
const _up = new Vector3()
const _tmp = new Vector3()

export function snapCameraPixel(camera: OrthographicCamera, uniforms: SobelUniforms): void {
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
	const gameRenderGroup = gameRenderGroupQuery.first
	const camera = cameraQuery.first?.camera
	if (!camera || !gameRenderGroup) return
	const truePosition = camera.position.clone()
	const {
		renderPipeline: { uniforms, targets, outlineQuad, postProcessing },
		scene,
		cssRenderer,
	} = gameRenderGroup
	if (camera instanceof OrthographicCamera) {
		snapCameraPixel(camera, uniforms)
	}

	// Base scene
	renderer.setRenderTarget(targets.scene)
	renderer.render(scene, camera)

	if (outlineQuery.size > 0) {
		// Outline entities
		camera.layers.set(1)
		scene.overrideMaterial = blankMaterial
		renderer.setRenderTarget(targets.outline)
		renderer.render(scene, camera)
		scene.overrideMaterial = null
		camera.layers.set(0)

		// Render outline depth comparison to outlineTarget2
		renderer.setRenderTarget(targets.outlineComposite)
		outlineQuad.render(renderer)
	} else {
		renderer.setRenderTarget(targets.outlineComposite)
		renderer.clear()
	}
	if (app.isEnabled('mainMenu')) {
		renderer.setRenderTarget(targets.final)
	} else {
		renderer.setRenderTarget(null)
	}
	postProcessing.render()

	cssRenderer.render(scene, camera)
	camera.position.copy(truePosition)
}
