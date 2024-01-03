// import { type BufferGeometry, Matrix4, Object3D, type ShaderMaterial, type Vector2, type Vector3 } from 'three'
// import { InstancedUniformsMesh } from 'three-instanced-uniforms-mesh'
// import { entries, range } from '@/utils/mapFunctions'

// type ParticleUniforms<T extends string> = {
// 	position: Vector3
// 	acceleration: Vector3
// 	Velocity: Vector3
// } & { [key in T]: number | Vector3 | Vector2 }

// export class ParticleEmitter<T extends string> extends InstancedUniformsMesh<ShaderMaterial> {
// 	lifetime = () => 1000
// 	amount = () => 1
// 	lifetimes = new Map<number, { start: number, end: number }>()
// 	particles: number[] = []
// 	available: number[] = []

// 	constructor(geometry: BufferGeometry, material: ShaderMaterial, count: number, private params: (life: number) => ParticleUniforms<T>) {
// 		super(geometry, material, count)
// 		this.available = range(0, count)
// 	}

// 	setLifetime(lifetime: () => number) {
// 		this.lifetime = lifetime
// 	}

// 	setAmount(amount: () => number) {
// 		this.amount = amount
// 	}

// 	emit() {
// 		const now = Date.now()
// 		for (let i = 0; i < this.amount(); i++) {
// 			const index = this.available.pop()
// 			if (index) {
// 				this.particles.push(index)
// 				this.lifetimes.set(index, { start: now, end: now + this.lifetime() })
// 			}
// 		}
// 		for (const index of this.particles) {
// 			const lifetime = this.lifetimes.get(index)!
// 			this.setUniformAt('lifetime', index, lifetime.start - now)
// 			if (lifetime.end >= now) {
// 				this.particles.splice(this.particles.indexOf(index), 1)
// 				this.available.push(index)
// 			}
// 			const params = this.params(lifetime.start - now)
// 			const matrix = new Matrix4()
// 			this.getMatrixAt(index, matrix)
// 			for (const key in params) {
// 				if (key === 'position') {
// 					matrix.setPosition(params[key])
// 				} else if (key === 'velocity') {
// 					// const position =
// 				} else {
// 					const keyType = key as keyof ParticleUniforms<T>
// 					this.setUniformAt(keyType, index, params[keyType])
// 				}
// 			}
// 		}
// 	}
// }