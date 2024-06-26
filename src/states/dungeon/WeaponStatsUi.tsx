import type { weapons } from '@assets/assets'
import { weaponsData } from '@/constants/weapons'

export const WeaponStatsUi = ({ name }: { name: weapons }) => {
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