import type { Color, DepthTexture, Node, RenderTarget, Texture, TextureNode, UniformNode, WebGPURenderer } from 'three/webgpu'

import { clamp, color, dot, float, Fn, If, mix, sqrt, step, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { RenderPipeline, Vector2 } from 'three/webgpu'

// Helper function - Sobel edge detection
const sobelFn = Fn<[TextureNode, Node<'vec2'>, Node<'vec2'>], Node<'float'>>(([depthTexture, uvCoord, resolution]) => {
	const texel = vec2(1.0).div(resolution)

	// 2x2 kernel definition
	// Gx = [1, 0; 0, -1]
	// Gy = [0, 1; -1, 0]

	// Fetch the 2x2 neighbourhood
	const tx0y0 = depthTexture.sample(uvCoord).r
	const tx1y0 = depthTexture.sample(uvCoord.add(texel.mul(vec2(1, 0)))).r
	const tx0y1 = depthTexture.sample(uvCoord.add(texel.mul(vec2(0, 1)))).r
	const tx1y1 = depthTexture.sample(uvCoord.add(texel.mul(vec2(1, 1)))).r

	// Gradient value in x direction: Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1
	// = 1 * tx0y0 + 0 * tx1y0 + 0 * tx0y1 + (-1) * tx1y1
	const valueGx = tx0y0.sub(tx1y1)

	// Gradient value in y direction: Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1
	// = 0 * tx0y0 + 1 * tx1y0 + (-1) * tx0y1 + 0 * tx1y1
	const valueGy = tx1y0.sub(tx0y1)

	// Magnitude of the total gradient
	const G = sqrt(valueGx.mul(valueGx).add(valueGy.mul(valueGy)))

	return G
})

export const createQuantizeNode = (
	inputNode: Node<'vec4'>,
	palette: string[], // hex strings, e.g. ['#0f380f', '#306230']
) => {
	// Parse once at node-build time — these become shader constants
	const paletteColors = palette.map((hex) => color(hex))

	return Fn(() => {
		const inputColor = inputNode.rgb
		const bestColor = vec3(0.0).toVar()
		const bestDist = float(1e9).toVar()

		// Fully unrolled — no uniform lookup, no loop overhead
		for (const palColor of paletteColors) {
			const diff = inputColor.sub(palColor.rgb)
			const dist = dot(diff.mul(diff), vec3(0.299, 0.587, 0.114))

			If(dist.lessThan(bestDist), () => {
				bestDist.assign(dist)
				bestColor.assign(vec3(palColor))
			})
		}

		return vec4(bestColor, inputNode.a)
	})()
}

// Outline shader node (depth comparison)
const createOutlineNode = (targetDepthTexture: DepthTexture, outlineDepthTexture: DepthTexture, outlineTextureSource: Texture) => {
	const targetDepth = texture(targetDepthTexture)
	const outlineDepth = texture(outlineDepthTexture)
	const outlineTexture = texture(outlineTextureSource)

	return Fn(() => {
		const uvCoord = uv()

		const textD = targetDepth.sample(uvCoord).r
		const outlineD = outlineDepth.sample(uvCoord).r

		// Discard if outline is behind scene
		outlineD.greaterThan(textD).discard()

		return outlineTexture.sample(uvCoord)
	})()
}

// Adjustable parameters (only these need to be uniforms)
export interface SobelUniforms {
	edgeColor: UniformNode<'color', Color>
	resolution: UniformNode<'vec2', Vector2>
	subPixelOffset: UniformNode<'vec2', Vector2>
}

// Sobel shader node (edge detection + color grading)
const createSobelNode = (
	diffuseTexture: Texture,
	depthTexture: DepthTexture,
	outlineTexture: Texture,

	uniforms: SobelUniforms,
) => {
	const tDiffuse = texture(diffuseTexture)
	const tDepth = texture(depthTexture)
	const outline = texture(outlineTexture)

	return Fn(() => {
		const pixelSize = vec2(1.0).div(uniforms.resolution)
		const uvCoord = uv().add(uniforms.subPixelOffset).div(pixelSize).floor().mul(pixelSize)

		// Edge detection
		const G = sobelFn(tDepth, uvCoord, uniforms.resolution)
		const Gfactor = clamp(step(G.mul(5.0), 0.01).add(0.8), 0.0, 1.0)

		// Get base color
		const texColor = tDiffuse.sample(uvCoord).rgb

		// Mix edge color with texture
		const finalColor = vec4(mix(uniforms.edgeColor, texColor, Gfactor), 1.0)

		// Outline overlay
		const outlineEdge = sobelFn(outline, uvCoord, uniforms.resolution)
		const isOutline = outlineEdge.greaterThan(0.0).toFloat()
		finalColor.assign(mix(finalColor, vec4(1.0), isOutline))

		return finalColor
	})()
}

// Setup post processing
export const setupPostProcessing = (renderer: WebGPURenderer, width: number, height: number, target: RenderTarget, outlineTarget: RenderTarget, outlineTarget2: RenderTarget) => {
	const postProcessing = new RenderPipeline(renderer)

	// Only parameters that change need to be uniforms
	const uniforms: SobelUniforms = {
		edgeColor: uniform<'color', Color>(color('#4d3533')),
		resolution: uniform(new Vector2(width, height)),
		subPixelOffset: uniform(new Vector2(0, 0)),
	}

	// Create the outline processing node
	const outlineNode = createOutlineNode(target.depthTexture as DepthTexture, outlineTarget.depthTexture as DepthTexture, outlineTarget.texture)

	// Create the final sobel node
	const sobelNode = createSobelNode(target.texture, target.depthTexture as DepthTexture, outlineTarget2.texture, uniforms)

	// const quantizeNode = createQuantizeNode(sobelNode, palette)

	postProcessing.outputNode = sobelNode

	return { postProcessing, uniforms, outlineNode }
}
