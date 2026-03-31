<script setup lang="ts">
import { World } from '@dimforge/rapier3d-compat'
import { OrbitControls } from '@tresjs/cientos'
import { useLoop, useTresContext } from '@tresjs/core'
import { AmbientLight } from 'three/webgpu'
import { computed, onMounted, onUnmounted } from 'vue'
import { RapierDebugRenderer } from '../../../src/lib/debugRenderer'
import Collider from './Collider.vue'

const props = defineProps<{
	category: string
	model: string
	transformMode: 'translate' | 'scale' | 'rotate'
}>()
const colliderStore = useColliderStore()
const assetStore = useAssetStore()
const modelDataStore = useModelDataStore()
const mesh = computed(() => {
	return assetStore.models?.[props.category]?.[props.model]
})

const world = new World({ x: 0, y: 0, z: 0 })
const rapierDebugRenderer = new RapierDebugRenderer(world)
const { onRender } = useLoop()
onRender(() => {
	world.step()
	rapierDebugRenderer.update()
})
onMounted(() => {
	const { scene } = useTresContext()
	scene.value.add(rapierDebugRenderer)
})
const light = computed(() => new AmbientLight())
const modelData = computed(() => modelDataStore.modelData?.[props.category]?.[props.model] ?? [])
const COLORS = [0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff]
onUnmounted(() => {
	world.colliders.forEach((collider) => {
		world.removeCollider(collider, true)
	})
	world.bodies.forEach((body) => {
		world.removeRigidBody(body)
	})
	rapierDebugRenderer.update()
})
watchEffect(() => {
	if (colliderStore.selectedCollider === 'primary' && !modelData.value.collider) {
		colliderStore.selectedCollider = null
	}
	if (colliderStore.selectedCollider === 'secondary' && !modelData.value.secondaryColliders?.[colliderStore.selectedIndex]) {
		colliderStore.selectedCollider = null
	}
})
const dragging = ref(false)
</script>

<template>
	<primitive
		:object="light"
		:dispose="true"
	/>
	<OrbitControls
		v-if="!dragging"
		:enable-damping="false"
	/>

	<TresPerspectiveCamera
		:zoom="2"
		:position="[0, 10, 5]"
	/>
	<TresGroup>
		<primitive
			v-if="mesh"
			:object="mesh"
			dispose
		/>
		<TresAxesHelper />
		<TresGridHelper />
		<Collider
			v-if="modelData.collider && mesh"
			id="primary"
			:key="`${category}-${model}`"
			v-model:dragging="dragging"
			v-model:collider="modelData.collider"
			:color="0xff0000"
			:world
			:model="mesh"
			:rapier-debug-renderer
			:transform-mode
			:index="0"
		/>
		<template v-for="(_collider, i) in modelData.secondaryColliders">
			<Collider
				v-if="modelData.secondaryColliders?.[i]"
				id="secondary"
				:key="`${category}-${model}-${i}`"
				v-model:dragging="dragging"
				v-model:collider="modelData.secondaryColliders[i]"
				:color="COLORS[i]"
				:world
				:model="mesh"
				:rapier-debug-renderer
				:transform-mode
				:index="i"
			/>
		</template>
	</TresGroup>
</template>

<style scoped></style>
