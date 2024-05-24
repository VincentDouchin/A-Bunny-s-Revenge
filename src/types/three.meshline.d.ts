declare module '@/lib/MeshLine' {
	import type { BufferGeometry, Line, Material } from 'three'

	export class MeshLine extends BufferGeometry {
		constructor()
		setGeometry(geometry: BufferGeometry | Float32Array): void
		geometry: BufferGeometry
	}

	export class MeshLineMaterial extends Material {
		constructor(parameters?: {
			color?: number | string
			opacity?: number
			lineWidth?: number
			dashArray?: number
			dashOffset?: number
			dashRatio?: number
			resolution?: [number, number]
			sizeAttenuation?: boolean
			near?: number
			far?: number
			depthTest?: boolean
			alphaTest?: number
			transparent?: boolean
		})
		color: number | string
		opacity: number
		lineWidth: number
		dashArray: number
		dashOffset: number
		dashRatio: number
		resolution: [number, number]
		sizeAttenuation: boolean
		near: number
		far: number
		depthTest: boolean
		alphaTest: number
		transparent: boolean
	}

	export class MeshLineRaycast {
		constructor()
		raycast(raycaster: any, intersects: any): void
	}

	export class MeshLineRaycastGroup extends Line {
		constructor(meshLine: MeshLine, material: MeshLineMaterial)
		raycast(raycaster: any, intersects: any): void
	}
}