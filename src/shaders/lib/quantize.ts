import type { Node } from 'three/webgpu'
import rawPalette from '@assets/palette.txt?raw'
import { abs, color, dot, float, Fn, If, min, vec3, vec4 } from 'three/tsl'

const palette = rawPalette.split('\r\n').filter(Boolean).map(color => `#${color}`.toUpperCase())
export const createQuantizeFn = () => {
	const paletteColors = palette.map(hex => color(hex))

	// Returns a Fn that takes any color node and snaps it to the palette
	return Fn<[Node<'vec4'>], Node<'vec4'>>(([inputColor]) => {
		const bestColor = vec3(0.0).toVar()
		const bestDist = float(1e9).toVar()

		for (const palColor of paletteColors) {
			const diff = inputColor.rgb.sub(palColor.toVec4())
			const dist = dot(diff.mul(diff), vec3(0.299, 0.587, 0.114))

			If(dist.lessThan(bestDist), () => {
				bestDist.assign(dist)
				bestColor.assign(vec3(palColor))
			})
		}

		return vec4(bestColor, inputColor.a)
	})
}
// RGB ↔ HSL conversion helpers
const rgbToHsl = Fn<[Node<'vec3'>], Node<'vec3'>>(([rgb]) => {
	const r = rgb.r
	const g = rgb.g
	const b = rgb.b

	const cMax = r.max(g).max(b)
	const cMin = r.min(g).min(b)
	const delta = cMax.sub(cMin)

	// Lightness
	const l = cMax.add(cMin).div(2.0)

	// Saturation
	const s = delta.div(float(1.0).sub(abs(l.mul(2.0).sub(1.0)))).toVar()
	s.assign(delta.equal(0.0).select(0.0, s))

	// Hue
	const h = float(0.0).toVar()
	If(delta.greaterThan(0.0), () => {
		const isR = cMax.equal(r)
		const isG = cMax.equal(g)

		// if (cMax == r) h = mod((g - b) / delta, 6)
		// else if (cMax == g) h = (b - r) / delta + 2
		// else h = (r - g) / delta + 4
		const hR = g.sub(b).div(delta)
		const hG = b.sub(r).div(delta).add(2.0)
		const hB = r.sub(g).div(delta).add(4.0)

		h.assign(isR.select(hR, isG.select(hG, hB)))
		h.assign(h.div(6.0)) // normalize to [0,1]
		h.assign(h.add(1.0).fract()) // wrap negatives
	})

	return vec3(h, s, l)
}).setLayout({
	name: 'rgbToHsl',
	type: 'vec3',
	inputs: [{ name: 'rgb', type: 'vec3' }],
})

const hslToRgb = Fn<[Node<'vec3'>], Node<'vec3'>>(([hsl]) => {
	const h = hsl.x
	const s = hsl.y
	const l = hsl.z

	const c = float(1.0).sub(abs(l.mul(2.0).sub(1.0))).mul(s)
	const x = c.mul(float(1.0).sub(abs(h.mul(6.0).fract().mul(2.0).sub(1.0))))
	const m = l.sub(c.div(2.0))

	const h6 = h.mul(6.0).toVar()

	const r = float(0.0).toVar()
	const g = float(0.0).toVar()
	const b = float(0.0).toVar()

	// 0-1: r=c, g=x, b=0
	If(h6.lessThan(1.0), () => {
		r.assign(c)
		g.assign(x)
		b.assign(0.0)
	})
	// 1-2: r=x, g=c, b=0
		.ElseIf(h6.lessThan(2.0), () => {
			r.assign(x)
			g.assign(c)
			b.assign(0.0)
		})
	// 2-3: r=0, g=c, b=x
		.ElseIf(h6.lessThan(3.0), () => {
			r.assign(0.0)
			g.assign(c)
			b.assign(x)
		})
	// 3-4: r=0, g=x, b=c
		.ElseIf(h6.lessThan(4.0), () => {
			r.assign(0.0)
			g.assign(x)
			b.assign(c)
		})
	// 4-5: r=x, g=0, b=c
		.ElseIf(h6.lessThan(5.0), () => {
			r.assign(x)
			g.assign(0.0)
			b.assign(c)
		})
	// 5-6: r=c, g=0, b=x
		.Else(() => {
			r.assign(c)
			g.assign(0.0)
			b.assign(x)
		})

	return vec3(r.add(m), g.add(m), b.add(m))
}).setLayout({
	name: 'hslToRgb',
	type: 'vec3',
	inputs: [{ name: 'hsl', type: 'vec3' }],
})

// Hue distance accounting for circular wrapping [0,1]
const hueDist = Fn<[Node<'float'>, Node<'float'>], Node<'float'>>(([h1, h2]) => {
	const d = abs(h1.sub(h2))
	return min(d, float(1.0).sub(d))
}).setLayout({
	name: 'hueDist',
	type: 'float',
	inputs: [
		{ name: 'h1', type: 'float' },
		{ name: 'h2', type: 'float' },
	],
})

export const createHueQuantizeFn = () => {
	// Pre-compute palette hues at build time
	const paletteHues = palette.map((hex) => {
		const c = color(hex)
		return rgbToHsl(c).x // extract hue channel
	})

	return Fn<[Node<'vec4'>], Node<'vec4'>>(([inputColor]) => {
		const inputHsl = rgbToHsl(inputColor.rgb)
		const inputHue = inputHsl.x
		const inputSat = inputHsl.y
		const inputLight = inputHsl.z

		const bestHue = float(0.0).toVar()
		const bestDist = float(1e9).toVar()

		// Find nearest hue in palette
		for (const palHue of paletteHues) {
			const dist = hueDist(inputHue, palHue)

			If(dist.lessThan(bestDist), () => {
				bestDist.assign(dist)
				bestHue.assign(palHue)
			})
		}

		// Reconstruct with quantized hue + original saturation & lightness
		const quantizedHsl = vec3(bestHue, inputSat, inputLight)
		const quantizedRgb = hslToRgb(quantizedHsl)

		return vec4(quantizedRgb, inputColor.a)
	})
}
export const quantize = createQuantizeFn()