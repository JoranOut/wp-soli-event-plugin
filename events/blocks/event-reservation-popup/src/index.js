import './index.scss';
import {__} from '@wordpress/i18n';
import {InspectorControls, useBlockProps} from '@wordpress/block-editor';
import {PanelBody, TextControl, TextareaControl} from '@wordpress/components';
import ReservationTool from './components/reservation-tool';
import {defaultNotePlaceholder, defaultSubject, defaultTemplate} from './lib/requests';

wp.blocks.registerBlockType('soli/event-reservation-popup', {
    apiVersion: 3,
    title: __('Room reservation', 'soli-event'),
    description: __('Lets visitors put together a room request, check availability and send it by e-mail.', 'soli-event'),
    icon: 'tagcloud',
    category: 'soli',
    attributes: {
        recipient: {type: 'string', default: ''},
        subject: {type: 'string', default: ''},
        template: {type: 'string', default: ''},
        notePlaceholder: {type: 'string', default: ''},
    },
    edit: EditComponent,
});

function EditComponent({attributes, setAttributes}) {
    return (
        <div {...useBlockProps()}>
            <InspectorControls>
                <PanelBody title={__('Reservation e-mail', 'soli-event')} initialOpen={true}>
                    <TextControl
                        label={__('Recipient e-mail address', 'soli-event')}
                        help={__('The generated reservation e-mail is addressed to this public address. Leave empty to let the visitor fill in the recipient themselves.', 'soli-event')}
                        type="email"
                        value={attributes.recipient}
                        onChange={(value) => setAttributes({recipient: value})}
                    />
                    <TextControl
                        label={__('Subject', 'soli-event')}
                        placeholder={defaultSubject()}
                        value={attributes.subject}
                        onChange={(value) => setAttributes({subject: value})}
                    />
                    <TextareaControl
                        label={__('E-mail text', 'soli-event')}
                        help={__('Use {reservations} for the chosen rooms and times, {note} for what the visitor wrote under "What is it for?" and {name} for their name. Leave empty for the standard text.', 'soli-event')}
                        rows={12}
                        placeholder={defaultTemplate()}
                        value={attributes.template}
                        onChange={(value) => setAttributes({template: value})}
                    />
                    {!attributes.template && (
                        <p>
                            <button type="button" className="components-button is-link" onClick={() => setAttributes({template: defaultTemplate()})}>
                                {__('Start from the standard text', 'soli-event')}
                            </button>
                        </p>
                    )}
                    <TextControl
                        label={__('Placeholder for "What is it for?"', 'soli-event')}
                        placeholder={defaultNotePlaceholder()}
                        value={attributes.notePlaceholder}
                        onChange={(value) => setAttributes({notePlaceholder: value})}
                    />
                </PanelBody>
            </InspectorControls>
            <ReservationTool
                recipient={attributes.recipient}
                subject={attributes.subject}
                template={attributes.template}
                notePlaceholder={attributes.notePlaceholder}
            />
        </div>
    );
}
