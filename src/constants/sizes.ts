import type { characters } from '@assets/assets'
import { Vector3 } from 'three'

export const Sizes = {
	small: new Vector3(4, 4, 4),
	character: new Vector3(5, 6, 5),
}

export const EnemySizes: Partial<Record<characters, Vector3>> = {
	Armabee_Evolved: new Vector3(15, 20, 15),
}