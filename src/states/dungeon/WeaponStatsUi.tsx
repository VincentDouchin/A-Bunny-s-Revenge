import type { AssetNames } from '@/global/entity'
import { weaponsData } from '@/constants/weapons'
import { OutlineText } from '@/ui/components/styledComponents'

export const WeaponStatsUi = ({ name }: { name: AssetNames['weapons'] }) => {
	const data = weaponsData[name]
	return (
		<div style={{ 'display': 'grid', 'place-items': 'center' }}>
			<div>
				<OutlineText textSize="1.5rem">
					{data.name}
				</OutlineText>
			</div>
			<div>
				<OutlineText textSize="1.2rem">
					Attack:
					{data.attack}
				</OutlineText>
			</div>
			<div>
				<OutlineText textSize="1.2rem">
					Knockback:
					{data.knockBack}
				</OutlineText>
			</div>
			<div>
				<OutlineText textSize="1.2rem">
					Attack speed:
					{data.attackSpeed}
				</OutlineText>
			</div>
		</div>
	)
}

export const TouchWeaponStats = () => {

}