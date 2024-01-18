import type { models } from '@assets/assets'

export interface PlacableProp {
	name: string
	models: models[]
}
export const props: PlacableProp[] = [
	{
		name: 'log',
		models: ['WoodLog'],
	},
	{
		name: 'rock',
		models: ['Rock_1', 'Rock_2', 'Rock_3', 'Rock_4', 'Rock_5', 'Rock_6', 'Rock_7'],
	},
]