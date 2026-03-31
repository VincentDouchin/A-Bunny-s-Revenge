import type { MeshStandardNodeMaterialParameters, Node, UniformNode, Vector2 } from 'three/webgpu'
import { abs, color, cos, dot, float, Fn, max, min, mix, mod, mul, sin, smoothstep, sqrt, sub, uniform, uv, vec2, vec3 } from 'three/tsl'

import { ToonMaterial } from './toonMaterial'

export const circ = Fn<[Node<'vec2'>, Node<'vec2'>, Node<'float'>], Node<'float'>>(([pos, c, s]) => {
	const ca = min(abs(pos.sub(c)), sub(1.0, abs(pos.sub(c))))
	return smoothstep(0.0, 0.002, sqrt(s).sub(sqrt(dot(ca, ca)))).mul(-1.0)
})

// Foam pattern for the water constructed out of a series of circles
export const waterlayer = Fn<[Node<'vec2'>], Node<'float'>>(([uv_immutable]) => {
	const uv = mod(uv_immutable, 1.0)

	const ret = float(1.0)
		.add(circ(uv, vec2(0.37378, 0.277169), 0.0268181))
		.add(circ(uv, vec2(0.0317477, 0.540372), 0.0193742))
		.add(circ(uv, vec2(0.430044, 0.882218), 0.0232337))
		.add(circ(uv, vec2(0.641033, 0.695106), 0.0117864))
		.add(circ(uv, vec2(0.0146398, 0.0791346), 0.0299458))
		.add(circ(uv, vec2(0.43871, 0.394445), 0.0289087))
		.add(circ(uv, vec2(0.909446, 0.878141), 0.028466))
		.add(circ(uv, vec2(0.310149, 0.686637), 0.0128496))
		.add(circ(uv, vec2(0.928617, 0.195986), 0.0152041))
		.add(circ(uv, vec2(0.0438506, 0.868153), 0.0268601))
		.add(circ(uv, vec2(0.308619, 0.194937), 0.00806102))
		.add(circ(uv, vec2(0.349922, 0.449714), 0.00928667))
		.add(circ(uv, vec2(0.0449556, 0.953415), 0.023126))
		.add(circ(uv, vec2(0.117761, 0.503309), 0.0151272))
		.add(circ(uv, vec2(0.563517, 0.244991), 0.0292322))
		.add(circ(uv, vec2(0.566936, 0.954457), 0.00981141))
		.add(circ(uv, vec2(0.0489944, 0.200931), 0.0178746))
		.add(circ(uv, vec2(0.569297, 0.624893), 0.0132408))
		.add(circ(uv, vec2(0.298347, 0.710972), 0.0114426))
		.add(circ(uv, vec2(0.878141, 0.771279), 0.00322719))
		.add(circ(uv, vec2(0.150995, 0.376221), 0.00216157))
		.add(circ(uv, vec2(0.119673, 0.541984), 0.0124621))
		.add(circ(uv, vec2(0.629598, 0.295629), 0.0198736))
		.add(circ(uv, vec2(0.334357, 0.266278), 0.0187145))
		.add(circ(uv, vec2(0.918044, 0.968163), 0.0182928))
		.add(circ(uv, vec2(0.965445, 0.505026), 0.006348))
		.add(circ(uv, vec2(0.514847, 0.865444), 0.00623523))
		.add(circ(uv, vec2(0.710575, 0.0415131), 0.00322689))
		.add(circ(uv, vec2(0.71403, 0.576945), 0.0215641))
		.add(circ(uv, vec2(0.748873, 0.413325), 0.0110795))
		.add(circ(uv, vec2(0.0623365, 0.896713), 0.0236203))
		.add(circ(uv, vec2(0.980482, 0.473849), 0.00573439))
		.add(circ(uv, vec2(0.647463, 0.654349), 0.0188713))
		.add(circ(uv, vec2(0.651406, 0.981297), 0.00710875))
		.add(circ(uv, vec2(0.428928, 0.382426), 0.0298806))
		.add(circ(uv, vec2(0.811545, 0.62568), 0.00265539))
		.add(circ(uv, vec2(0.400787, 0.74162), 0.00486609))
		.add(circ(uv, vec2(0.331283, 0.418536), 0.00598028))
		.add(circ(uv, vec2(0.894762, 0.0657997), 0.00760375))
		.add(circ(uv, vec2(0.525104, 0.572233), 0.0141796))
		.add(circ(uv, vec2(0.431526, 0.911372), 0.0213234))
		.add(circ(uv, vec2(0.658212, 0.910553), 0.000741023))
		.add(circ(uv, vec2(0.514523, 0.243263), 0.0270685))
		.add(circ(uv, vec2(0.0249494, 0.252872), 0.00876653))
		.add(circ(uv, vec2(0.502214, 0.47269), 0.0234534))
		.add(circ(uv, vec2(0.693271, 0.431469), 0.0246533))
		.add(circ(uv, vec2(0.415, 0.884418), 0.0271696))
		.add(circ(uv, vec2(0.149073, 0.41204), 0.00497198))
		.add(circ(uv, vec2(0.533816, 0.897634), 0.00650833))
		.add(circ(uv, vec2(0.0409132, 0.83406), 0.0191398))
		.add(circ(uv, vec2(0.638585, 0.646019), 0.0206129))
		.add(circ(uv, vec2(0.660342, 0.966541), 0.0053511))
		.add(circ(uv, vec2(0.513783, 0.142233), 0.00471653))
		.add(circ(uv, vec2(0.124305, 0.644263), 0.00116724))
		.add(circ(uv, vec2(0.99871, 0.583864), 0.0107329))
		.add(circ(uv, vec2(0.894879, 0.233289), 0.00667092))
		.add(circ(uv, vec2(0.246286, 0.682766), 0.00411623))
		.add(circ(uv, vec2(0.0761895, 0.16327), 0.0145935))
		.add(circ(uv, vec2(0.949386, 0.802936), 0.0100873))
		.add(circ(uv, vec2(0.480122, 0.196554), 0.0110185))
		.add(circ(uv, vec2(0.896854, 0.803707), 0.013969))
		.add(circ(uv, vec2(0.292865, 0.762973), 0.00566413))
		.add(circ(uv, vec2(0.0995585, 0.117457), 0.00869407))
		.add(circ(uv, vec2(0.377713, 0.00335442), 0.0063147))
		.add(circ(uv, vec2(0.506365, 0.531118), 0.0144016))
		.add(circ(uv, vec2(0.408806, 0.894771), 0.0243923))
		.add(circ(uv, vec2(0.143579, 0.85138), 0.00418529))
		.add(circ(uv, vec2(0.0902811, 0.181775), 0.0108896))
		.add(circ(uv, vec2(0.780695, 0.394644), 0.00475475))
		.add(circ(uv, vec2(0.298036, 0.625531), 0.00325285))
		.add(circ(uv, vec2(0.218423, 0.714537), 0.00157212))
		.add(circ(uv, vec2(0.658836, 0.159556), 0.00225897))
		.add(circ(uv, vec2(0.987324, 0.146545), 0.0288391))
		.add(circ(uv, vec2(0.222646, 0.251694), 0.00092276))
		.add(circ(uv, vec2(0.159826, 0.528063), 0.00605293))

	return max(ret, 0.0)
})

const water = Fn<[uv: Node<'vec2'>, cdir: Node<'vec3'>, time: Node<'float'>, waterColor: Node<'vec3'>, waterColor2: Node<'vec3'>, foamColor: Node<'vec3'>], Node<'vec3'>>(
	([uv_immutable, cdir, time, water_color, water_color2, foam_color]) => {
		const uv0 = uv_immutable.mul(vec2(0.25))
		const a = mul(0.025, cdir.xz).div(cdir.y)

		// Two-pass parallax: each pass shifts uv by a * sin(wave)
		const uv1 = uv0.add(a.mul(sin(uv0.x.add(time))))
		const uv2 = uv1.add(a.mul(sin(mul(0.841471, uv1.x).sub(mul(0.540302, uv1.y)).add(time))))

		// Texture distortion
		const d1 = time.mul(0.07).add(mod(uv2.x.add(uv2.y), 6.283185307))
		const d2 = time.mul(0.5).add(mod(uv2.x.add(uv2.y).add(0.25).mul(1.3), 18.84955592))
		const dist = vec2(sin(d1).mul(0.15).add(sin(d2).mul(0.05)), cos(d1).mul(0.15).add(cos(d2).mul(0.05)))

		return mix(mix(water_color, water_color2, waterlayer(uv2.add(dist.xy))), foam_color, waterlayer(vec2(1.0).sub(uv2).sub(dist.yx)))
	},
)
export class WaterMaterial extends ToonMaterial {
	time = uniform(0)
	size: UniformNode<'vec2', Vector2>
	waterColor = color(0x36c5f4)
	foam_color = color(0xcff5f6)
	constructor(params: MeshStandardNodeMaterialParameters, size: Vector2) {
		super(params)
		this.size = uniform(size)
		this.colorNode = water(uv().mul(this.size).div(8), vec3(0, 1, 0), this.time, this.waterColor.sub(0.2), this.waterColor, this.foam_color)
	}
}
