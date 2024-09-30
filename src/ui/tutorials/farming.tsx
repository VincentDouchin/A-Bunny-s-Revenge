import { css } from 'solid-styled'
import { OutlineText } from '../components/styledComponents'

export const FarmingTutorial = () => {
	css/* css */`
	.farming-tutorial{
		text-align: center;
	}
	`
	return (
		<div class="farming-tutorial">
			<OutlineText textSize="2rem">
				<div>You can plant seeds in the garden.</div>
				<div>If you water the seeds you will have a </div>
				<div>chance to get more than one when you harvest it.</div>
			</OutlineText>
		</div>
	)
}