// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Original author: Stefan Gustavson (stefan.gustavson@liu.se)
// TSL port: converted from GLSL to Three.js Shading Language (TSL)
//
// Original: https://github.com/stegu/webgl-noise
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license.

import type { Node } from 'three/webgpu'
import { abs, dot, float, floor, Fn, fract, mix, mod, step, vec3, vec4 } from 'three/tsl'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Works for both vec3 and vec4 inputs — TSL Fn is polymorphic.
const mod289vec4 = Fn<[Node<'vec4'>], Node<'vec4'>>(([x]) => {
	return x.sub(floor(x.mul(1.0 / 289.0)).mul(289.0))
})
const mod289vec3 = Fn<[Node<'vec3'>], Node<'vec3'>>(([x]) => {
	return x.sub(floor(x.mul(1.0 / 289.0)).mul(289.0))
})

const permute = Fn<[Node<'vec4'>], Node<'vec4'>>(([x]) => {
	return mod289vec4(x.mul(34.0).add(10.0).mul(x)) as Node<'vec4'>
})

const taylorInvSqrt = Fn<[Node<'vec4'>], Node<'vec4'>>(([r]) => {
	return float(1.79284291400159).sub(r.mul(0.85373472095314)) as Node<'vec4'>
})

const fade = Fn<[Node<'vec3'>], Node<'vec3'>>(([t]) => {
	// t^3 * ( t * (t*6 - 15) + 10 )
	return t
		.mul(t)
		.mul(t)
		.mul(t.mul(t.mul(6.0).sub(15.0)).add(10.0))
})

// ---------------------------------------------------------------------------
// Shared gradient computation — plain TS helper (not a TSL Fn node), since
// both cnoise and pnoise share the identical body after computing Pi0/Pi1.
// ---------------------------------------------------------------------------

function _gradients(Pi0_: Node<'vec3'>, Pi1_: Node<'vec3'>, Pf0: Node<'vec3'>, Pf1: Node<'vec3'>): Node<'float'> {
	const ix = vec4(Pi0_.x, Pi1_.x, Pi0_.x, Pi1_.x)
	const iy = vec4(Pi0_.y, Pi0_.y, Pi1_.y, Pi1_.y)
	const iz0 = Pi0_.zzzz
	const iz1 = Pi1_.zzzz

	const ixy = permute(permute(ix).add(iy))
	const ixy0 = permute(ixy.add(iz0))
	const ixy1 = permute(ixy.add(iz1))

	// --- z-slice 0 gradients ---
	const gx0_raw = ixy0.mul(1.0 / 7.0)
	const gy0_raw = fract(floor(gx0_raw).mul(1.0 / 7.0)).sub(0.5)
	const gx0 = fract(gx0_raw)
	const gz0 = vec4(0.5).sub(abs(gx0)).sub(abs(gy0_raw))
	// @ts-expect-error wrong type for step
	const sz0 = step(gz0, vec4(0.0))
	// @ts-expect-error wrong type for step
	const gx0f = gx0.sub(sz0.mul(step(float(0.0), gx0).sub(0.5)))
	// @ts-expect-error wrong type for step
	const gy0f = gy0_raw.sub(sz0.mul(step(float(0.0), gy0_raw).sub(0.5)))

	// --- z-slice 1 gradients ---
	const gx1_raw = ixy1.mul(1.0 / 7.0)
	const gy1_raw = fract(floor(gx1_raw).mul(1.0 / 7.0)).sub(0.5)
	const gx1 = fract(gx1_raw)
	const gz1 = vec4(0.5).sub(abs(gx1)).sub(abs(gy1_raw))
	// @ts-expect-error wrong type for step
	const sz1 = step(gz1, vec4(0.0))
	// @ts-expect-error wrong type for step
	const gx1f = gx1.sub(sz1.mul(step(float(0.0), gx1).sub(0.5)))
	// @ts-expect-error wrong type for step
	const gy1f = gy1_raw.sub(sz1.mul(step(float(0.0), gy1_raw).sub(0.5)))

	// --- Assemble gradient vectors ---
	const g000 = vec3(gx0f.x, gy0f.x, gz0.x)
	const g100 = vec3(gx0f.y, gy0f.y, gz0.y)
	const g010 = vec3(gx0f.z, gy0f.z, gz0.z)
	const g110 = vec3(gx0f.w, gy0f.w, gz0.w)
	const g001 = vec3(gx1f.x, gy1f.x, gz1.x)
	const g101 = vec3(gx1f.y, gy1f.y, gz1.y)
	const g011 = vec3(gx1f.z, gy1f.z, gz1.z)
	const g111 = vec3(gx1f.w, gy1f.w, gz1.w)

	// --- Normalise ---
	const norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)))
	const g000n = g000.mul(norm0.x)
	const g010n = g010.mul(norm0.y)
	const g100n = g100.mul(norm0.z)
	const g110n = g110.mul(norm0.w)

	const norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)))
	const g001n = g001.mul(norm1.x)
	const g011n = g011.mul(norm1.y)
	const g101n = g101.mul(norm1.z)
	const g111n = g111.mul(norm1.w)

	// --- Dot products with fractional offsets ---
	const n000 = dot(g000n, Pf0)
	const n100 = dot(g100n, vec3(Pf1.x, Pf0.y, Pf0.z))
	const n010 = dot(g010n, vec3(Pf0.x, Pf1.y, Pf0.z))
	const n110 = dot(g110n, vec3(Pf1.x, Pf1.y, Pf0.z))
	const n001 = dot(g001n, vec3(Pf0.x, Pf0.y, Pf1.z))
	const n101 = dot(g101n, vec3(Pf1.x, Pf0.y, Pf1.z))
	const n011 = dot(g011n, vec3(Pf0.x, Pf1.y, Pf1.z))
	const n111 = dot(g111n, Pf1)

	// --- Trilinear interpolation ---
	const fade_xyz = fade(Pf0)
	const n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z)
	const n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y)
	const n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x)

	return n_xyz.mul(2.2) as Node<'float'>
}

// ---------------------------------------------------------------------------
// Classic Perlin noise  cnoise( P: vec3 ) → float
// ---------------------------------------------------------------------------

export const cnoise = Fn<[Node<'vec3'>], Node<'float'>>(([P]) => {
	const Pi0 = floor(P)
	const Pi1 = Pi0.add(1.0)
	const Pi0_ = mod289vec3(Pi0)
	const Pi1_ = mod289vec3(Pi1)
	const Pf0 = fract(P)
	const Pf1 = Pf0.sub(1.0)

	return _gradients(Pi0_, Pi1_, Pf0, Pf1)
})

// ---------------------------------------------------------------------------
// Periodic Perlin noise  pnoise( P: vec3, rep: vec3 ) → float
// ---------------------------------------------------------------------------

export const pnoise = Fn<[Node<'vec3'>, Node<'vec3'>], Node<'float'>>(([P, rep]) => {
	const Pi0 = mod(floor(P), rep)
	const Pi1 = mod(Pi0.add(1.0), rep)
	const Pi0_ = mod289vec3(Pi0)
	const Pi1_ = mod289vec3(Pi1)
	const Pf0 = fract(P)
	const Pf1 = Pf0.sub(1.0)

	return _gradients(Pi0_, Pi1_, Pf0, Pf1)
})
