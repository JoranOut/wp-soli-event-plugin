import { registerBlockVariation } from '@wordpress/blocks';

const SOLI_EVENTS_VARIATION = 'soli/soli-events-list';

registerBlockVariation( 'core/query', {
	name: SOLI_EVENTS_VARIATION,
	title: 'Soli Events List',
	description: 'Displays the latest Soli events with dates and location',
	icon: 'calendar-alt', // any dashicon
	isActive: ( { namespace, query } ) =>
		namespace === SOLI_EVENTS_VARIATION &&
		query.postType === 'soli_event',
	attributes: {
		namespace: SOLI_EVENTS_VARIATION,
		query: {
			perPage: 3,
			postType: 'soli_event',
			order: 'ASC',
			orderBy: 'meta_value', // your PHP logic will override
		},
	},
	innerBlocks: [
		[ 'core/post-template', {}, [
			[ 'core/post-title' ],
			[ 'core/paragraph', { placeholder: 'Dates: {{start_date}} – {{end_date}}' } ],
			[ 'core/paragraph', { placeholder: 'Location: {{location_name}}' } ],
		]
		],
		[ 'core/query-pagination' ],
		[ 'core/query-no-results' ],
	],
	allowedControls: [ 'inherit', 'order', 'orderBy', 'perPage' ],
});
