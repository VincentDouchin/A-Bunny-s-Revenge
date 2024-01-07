import { assets } from '@/global/init'

export const IconButton = (props: { icon?: icons, onClick?: () => void }) => {
	const icon = props.icon ? { innerHTML: assets.icons[props.icon] } : {}
	return <div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1rem', 'border': `solid 0.1rem hsl(0, 0%,100%, 30% )`, 'font-size': '2rem', 'color': 'white', 'display': 'grid', 'place-items': 'center' }} class="icon-container" {...icon} onClick={props.onClick}></div>
}