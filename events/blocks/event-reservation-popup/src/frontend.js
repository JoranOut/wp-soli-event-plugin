import './index.scss';
import {createRoot} from '@wordpress/element';
import ReservationTool from './components/reservation-tool';

document.querySelectorAll('.block-event-reservation-popup').forEach((element) => {
    const {recipient, subject, template, notePlaceholder} = element.dataset;
    createRoot(element).render(
        <ReservationTool recipient={recipient} subject={subject} template={template} notePlaceholder={notePlaceholder}/>
    );
});
