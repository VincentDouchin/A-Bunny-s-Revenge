import { weaponsData } from '@/constants/weapons'
import { AssetNames } from '@/global/entity'

export const WeaponStatsUi = ({ name }: { name: AssetNames['weapons'] }) => {
	const data = weaponsData[name]
	return (
		<div style={{ 'display': 'grid', 'place-items': 'center' }}>
			<div style={{ 'font-size': '1.5rem' }}>{data.name}</div>
			<div style={{ 'font-size': '1.2rem' }}>
				Attack:
				{data.attack}
			</div>
			<div style={{ 'font-size': '1.2rem' }}>
				Knockback:
				{data.knockBack}
			</div>
			<div style={{ 'font-size': '1.2rem' }}>
				Attack speed:
				{data.attackSpeed}
			</div>
		</div>
	)
}

export const TouchWeaponStats = () => {

}