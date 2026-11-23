import {__, sprintf} from '@wordpress/i18n';
import {useEffect, useId, useRef, useState} from '@wordpress/element';
import {addDays, daysBetween} from '../lib/dates';
import {buildLetter, defaultNotePlaceholder, defaultSubject, newRequest, requestProblems} from '../lib/requests';
import useOccupancy from '../lib/use-occupancy';
import RequestCard, {requestDays} from './request-card';
import {CheckIcon, CopyIcon, MailIcon, PlusIcon} from './icons';

async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) {
        throw new Error('copy failed');
    }
}

export default function ReservationTool({recipient, subject, template, notePlaceholder}) {
    const uid = useId();
    const [requests, setRequests] = useState(() => [newRequest()]);
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [copyState, setCopyState] = useState('idle');
    const focusNext = useRef(null);
    const listRef = useRef(null);

    const days = [...new Set(requests.flatMap(requestDays))].sort();
    const occupancy = useOccupancy(days);

    const open = requests
        .map((request, index) => ({index, problems: requestProblems(request)}))
        .filter((item) => item.problems.length);
    const ready = open.length === 0;

    const letter = buildLetter({requests, name, note, template});
    const mailSubject = subject?.trim() || defaultSubject();
    const mailto = `mailto:${recipient || ''}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(letter)}`;

    useEffect(() => {
        if (focusNext.current !== null && listRef.current) {
            listRef.current.children[focusNext.current]?.querySelector('input')?.focus();
            focusNext.current = null;
        }
    }, [requests.length]);

    useEffect(() => {
        if (copyState === 'idle') {
            return undefined;
        }
        const timer = setTimeout(() => setCopyState('idle'), 2500);
        return () => clearTimeout(timer);
    }, [copyState]);

    const update = (index, request) => setRequests((prev) => prev.map((r, i) => (i === index ? request : r)));
    const remove = (index) => setRequests((prev) => prev.filter((_, i) => i !== index));
    const addRequest = (request) => {
        focusNext.current = requests.length;
        setRequests((prev) => [...prev, request]);
    };
    const nextDay = ({id, ...request}) => {
        const span = request.multiDay && request.endDate ? daysBetween(request.date, request.endDate).length : 1;
        addRequest(newRequest({
            ...request,
            date: addDays(request.date, span),
            endDate: request.multiDay && request.endDate ? addDays(request.endDate, span) : '',
        }));
    };

    const copy = () => copyToClipboard(letter).then(() => setCopyState('copied'), () => setCopyState('failed'));

    return (
        <section className="soli-reserve" aria-label={__('Room reservation', 'soli-event')}>
            <div className="soli-reserve__layout">
                <div className="soli-reserve__requests">
                    <ol className="soli-reserve__list" ref={listRef}>
                        {requests.map((request, index) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                index={index}
                                occupancy={occupancy}
                                canRemove={requests.length > 1}
                                onChange={(r) => update(index, r)}
                                onRemove={() => remove(index)}
                                onNextDay={() => nextDay(request)}
                            />
                        ))}
                    </ol>
                    <button type="button" className="soli-reserve-add" onClick={() => addRequest(newRequest())}>
                        <PlusIcon/>
                        {__('Add another day or time', 'soli-event')}
                    </button>
                </div>

                <aside className="soli-reserve__summary" aria-labelledby={`${uid}-summary`}>
                    <h3 className="soli-reserve__summary-title" id={`${uid}-summary`}>{__('Your request', 'soli-event')}</h3>

                    <label className="soli-reserve-field">
                        <span>{__('Your name', 'soli-event')}</span>
                        <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}/>
                    </label>
                    <label className="soli-reserve-field">
                        <span>{__('What is it for?', 'soli-event')} <em>{__('optional', 'soli-event')}</em></span>
                        <textarea
                            rows="3"
                            value={note}
                            placeholder={notePlaceholder?.trim() || defaultNotePlaceholder()}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </label>

                    <figure className="soli-reserve-letter">
                        <figcaption className="screen-reader-text">{__('Preview of the e-mail', 'soli-event')}</figcaption>
                        <dl className="soli-reserve-letter__meta">
                            <dt>{__('To', 'soli-event')}</dt>
                            <dd>{recipient || <em>{__('your mail program asks for the address', 'soli-event')}</em>}</dd>
                            <dt>{__('Subject', 'soli-event')}</dt>
                            <dd>{mailSubject}</dd>
                        </dl>
                        <div className="soli-reserve-letter__body" data-testid="reservation-letter">{letter}</div>
                    </figure>

                    {!ready && (
                        <div className="soli-reserve-todo" aria-live="polite">
                            <p>{__('Before you send:', 'soli-event')}</p>
                            <ul>
                                {open.map(({index, problems}) => (
                                    <li key={index}>
                                        {/* translators: 1: request number, 2: list of problems */}
                                        {sprintf(__('request %1$d: %2$s', 'soli-event'), index + 1, problems.map((p) => p.text).join(', '))}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="soli-reserve-actions">
                        {ready ? (
                            <a className="soli-reserve-button is-primary" href={mailto}>
                                <MailIcon/>
                                {__('Open in e-mail', 'soli-event')}
                            </a>
                        ) : (
                            <button type="button" className="soli-reserve-button is-primary" disabled>
                                <MailIcon/>
                                {__('Open in e-mail', 'soli-event')}
                            </button>
                        )}
                        <button type="button" className="soli-reserve-button" onClick={copy} disabled={!ready}>
                            {copyState === 'copied' ? <CheckIcon/> : <CopyIcon/>}
                            {copyState === 'copied' ? __('Copied', 'soli-event') : __('Copy text', 'soli-event')}
                        </button>
                    </div>
                    <p className="soli-reserve-footnote" role="status">
                        {copyState === 'failed'
                            ? __('Copying did not work. Select the text above and copy it yourself.', 'soli-event')
                            : __('This is a request, not a booking. We will reply by e-mail.', 'soli-event')}
                    </p>
                </aside>
            </div>
        </section>
    );
}
