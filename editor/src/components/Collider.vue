<script setup lang="ts">
import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat'
import type { ColorRepresentation, Object3D } from 'three/webgpu'
import type { ColliderData } from '../types'
import type { RapierDebugRenderer } from '@/lib/debugRenderer'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { TransformControls } from '@tresjs/cientos'
import { Euler, Quaternion } from 'three/webgpu'
import { createTrimeshCollider } from '@/lib/colliders'

const props = defineProps<{
	color: ColorRepresentation
	world: World
	model: Object3D
	rapierDebugRenderer: RapierDebugRenderer
	id: 'primary' | `secondary`
	index: number
	transformMode: 'translate' | 'scale' | 'rotate'
}>()

const collider = defineModel<ColliderData>('collider', { required: true })
const dragging = defineModel<boolean>('dragging', { required: true })
const colliderStore = useColliderStore()

const scale = computed<[number, number, number]>(() => {
	switch (collider.value.type) {
		case 'cuboid':
			return [collider.value.size.x, collider.value.size.y, collider.value.size.z]
		case 'capsule':
		case 'cylinder':
			return [collider.value.size.x, collider.value.size.y, collider.value.size.x]
		case 'ball':
			return [collider.value.size.x, collider.value.size.x, collider.value.size.x]
		default:
			return [1, 1, 1]
	}
})

const body = computed((prev?: RigidBody) => {
	if (prev) props.world.removeRigidBody(prev)
	const desc = RigidBodyDesc.fixed()
	desc.setCanSleep(false)
	return props.world.createRigidBody(desc)
})

const colliderDesc = computed(() => {
	if (collider.value.type === 'trimesh') {
		return createTrimeshCollider(props.model, [1, 1, 1])
	}
	switch (collider.value.type) {
		case 'ball':
			return ColliderDesc.ball(collider.value.size.x / 2)
		case 'capsule':
			return ColliderDesc.capsule(collider.value.size.x / 2, collider.value.size.y)
		case 'cuboid':
			return ColliderDesc.cuboid(collider.value.size.x / 2, collider.value.size.y / 2, collider.value.size.z / 2)
		case 'cylinder':
			return ColliderDesc.cylinder(collider.value.size.y / 2, collider.value.size.x / 2)
	}
	return null
})
const physicsCollider = ref<null | Collider>(null)
watch(
	colliderDesc,
	() => {
		if (physicsCollider.value) {
			props.world.removeCollider(physicsCollider.value as Collider, true)
		}
		if (colliderDesc.value) {
			physicsCollider.value = props.world.createCollider(colliderDesc.value, body.value)
		}
		props.rapierDebugRenderer.update()
	},
	{
		immediate: true,
	},
)
watchEffect(() => {
	if (collider.value.type !== 'trimesh' && collider.value.type !== 'link') {
		body.value.setTranslation(
			{
				x: collider.value.position.x,
				y: collider.value.position.y + collider.value.size.y / 2,
				z: collider.value.position.z,
			},
			true,
		)
		const rot = new Quaternion().fromArray(collider.value.rotation)
		body.value.setRotation(rot, true)
	} else {
		body.value.setTranslation({ x: 0, y: 0, z: 0 }, true)
	}
})

onUnmounted(() => {
	if (physicsCollider.value) {
		props.world.removeCollider(physicsCollider.value as Collider, true)
	}
	if (body.value) {
		props.world.removeRigidBody(body.value)
	}
})
const groupRef = shallowRef<Object3D | null>(null)

const update = () => {
	if (!groupRef.value || collider.value.type === 'link' || collider.value.type === 'trimesh') return
	if (props.transformMode === 'translate') {
		collider.value.position = {
			x: groupRef.value.position.x,
			y: groupRef.value.position.y,
			z: groupRef.value.position.z,
		}
	} else if (props.transformMode === 'scale') {
		collider.value.size = {
			x: groupRef.value.scale.x,
			y: groupRef.value.scale.y,
			z: groupRef.value.scale.z,
		}
	} else if (props.transformMode === 'rotate') {
		collider.value.rotation = new Quaternion().setFromEuler(groupRef.value.rotation).toArray()
	}
}
</script>

<template>
	<TransformControls
		v-if="colliderStore.selectedCollider === id && colliderStore.selectedIndex === index && groupRef"
		:object="groupRef"
		:mode="transformMode"
		:show-z="collider.type === 'cuboid'"
		:show-y="collider.type !== 'ball'"
		@dragging="(val) => (dragging = val)"
		@mouse-up="update"
	/>
	<TresGroup
		v-if="collider.type !== 'trimesh' && collider.type !== 'link'"
		:ref="(e: any) => (groupRef = e)"
		:scale="scale"
		:position="[collider.position.x, collider.position.y, collider.position.z]"
		:rotation="new Euler().setFromQuaternion(new Quaternion().fromArray(collider.rotation)).toArray()"
		@click="
			() => {
				colliderStore.selectedCollider = id
				colliderStore.selectedIndex = index
			}
		"
	>
		<TresMesh :position="[0, collider.type === 'capsule' ? 1 : 0.5, 0]">
			<TresBoxGeometry
				v-if="collider.type === 'cuboid'"
				:args="[1, 1, 1]"
			/>
			<TresSphereGeometry
				v-else-if="collider.type === 'ball'"
				:args="[0.5]"
			/>
			<TresCylinderGeometry
				v-else-if="collider.type === 'cylinder'"
				:args="[0.5, 0.5]"
			/>
			<TresCapsuleGeometry
				v-else-if="collider.type === 'capsule'"
				:args="[0.5]"
			/>
			<TresMeshBasicMaterial
				:color
				transparent
				:opacity="0.2"
			/>
		</TresMesh>
	</TresGroup>
</template>

<style scoped></style>
