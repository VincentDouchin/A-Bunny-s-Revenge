import type { Node, TextureNode } from 'three/webgpu'
import { abs, Fn, If, int, Loop, texture, vec2, vec3, vec4 } from 'three/tsl'

export const kuwahara = Fn<[TextureNode, Node<'vec2'>, Node<'vec2'>, Node<'int'>], Node<'vec4'>>(([tex, res, uvCoord, radius]) => {
	const n = radius.add(1).mul(radius.add(1)).toFloat()

	const m0 = vec3(0.0).toVar()
	const s0 = vec3(0.0).toVar()
	const m1 = vec3(0.0).toVar()
	const s1 = vec3(0.0).toVar()
	const m2 = vec3(0.0).toVar()
	const s2 = vec3(0.0).toVar()
	const m3 = vec3(0.0).toVar()
	const s3 = vec3(0.0).toVar()

	// Quadrant 0 – top-left     (i ∈ [−r, 0],  j ∈ [−r, 0])
	Loop({ start: int(0).sub(radius), end: int(1) }, ({ i: j }) => {
		Loop({ start: int(0).sub(radius), end: int(1) }, ({ i }) => {
			const c = tex.sample(uvCoord.add(vec2(i.toFloat(), j.toFloat()).div(res))).rgb.toVar()
			m0.addAssign(c)
			s0.addAssign(c.mul(c))
		})
	})

	// Quadrant 1 – top-right    (i ∈ [0,  r],  j ∈ [−r, 0])
	Loop({ start: int(0).sub(radius), end: int(1) }, ({ i: j }) => {
		Loop({ start: int(0), end: radius.add(1) }, ({ i }) => {
			const c = texture(tex, uvCoord.add(vec2(i.toFloat(), j.toFloat()).div(res))).rgb.toVar()
			m1.addAssign(c)
			s1.addAssign(c.mul(c))
		})
	})

	// Quadrant 2 – bottom-right (i ∈ [0,  r],  j ∈ [0,  r])
	Loop({ start: int(0), end: radius.add(1) }, ({ i: j }) => {
		Loop({ start: int(0), end: radius.add(1) }, ({ i }) => {
			const c = texture(tex, uvCoord.add(vec2(i.toFloat(), j.toFloat()).div(res))).rgb.toVar()
			m2.addAssign(c)
			s2.addAssign(c.mul(c))
		})
	})

	// Quadrant 3 – bottom-left  (i ∈ [−r, 0],  j ∈ [0,  r])
	Loop({ start: int(0), end: radius.add(1) }, ({ i: j }) => {
		Loop({ start: int(0).sub(radius), end: int(1) }, ({ i }) => {
			const c = texture(tex, uvCoord.add(vec2(i.toFloat(), j.toFloat()).div(res))).rgb.toVar()
			m3.addAssign(c)
			s3.addAssign(c.mul(c))
		})
	})

	// Normalise means, then compute per-quadrant variance
	m1.divAssign(n)
	s1.assign(abs(s1.div(n).sub(m1.mul(m1))))
	m0.divAssign(n)
	s0.assign(abs(s0.div(n).sub(m0.mul(m0))))
	m2.divAssign(n)
	s2.assign(abs(s2.div(n).sub(m2.mul(m2))))
	m3.divAssign(n)
	s3.assign(abs(s3.div(n).sub(m3.mul(m3))))

	const sig0 = s0.r.add(s0.g).add(s0.b)
	const sig1 = s1.r.add(s1.g).add(s1.b)
	const sig2 = s2.r.add(s2.g).add(s2.b)
	const sig3 = s3.r.add(s3.g).add(s3.b)

	// Return the quadrant mean with the smallest variance
	const result = vec4(m0, 1.0).toVar()
	const minSig = sig0.toVar()

	If(sig1.lessThan(minSig), () => {
		minSig.assign(sig1)
		result.assign(vec4(m1, 1.0))
	})
	If(sig2.lessThan(minSig), () => {
		minSig.assign(sig2)
		result.assign(vec4(m2, 1.0))
	})
	If(sig3.lessThan(minSig), () => {
		result.assign(vec4(m3, 1.0))
	})

	return result
})