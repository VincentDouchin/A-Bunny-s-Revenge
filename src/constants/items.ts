export type ItemData = CropItem

export interface StackableItem {
	icon: items
	quantity: number
}
interface CropItem extends StackableItem {

}

export const choppables = ['carrot'] as const