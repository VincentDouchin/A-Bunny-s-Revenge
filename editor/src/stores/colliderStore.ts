import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useColliderStore = defineStore('collider', () => {
	const selectedCollider = ref<'primary' | `secondary` | null>(null)
	const selectedIndex = ref<number>(0)
	const selectedKey = computed(() => {
		if (selectedCollider.value === 'secondary') {
			return `secondary-${selectedIndex.value}`
		} else if (selectedCollider.value === 'primary') {
			return 'primary'
		}
		return null
	})
	return {
		selectedCollider,
		selectedIndex,
		selectedKey,
	}
})
