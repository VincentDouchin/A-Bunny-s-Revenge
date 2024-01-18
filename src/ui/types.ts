import type { With } from 'miniplex'
import type { Entity } from '@/global/entity'

export interface FarmUiProps {
	player: With<Entity, 'inventoryId' | 'inventorySize' | 'menuType' | 'inventory' | 'playerControls'>
}