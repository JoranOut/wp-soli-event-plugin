/**
 * Front-end for the calendar-subscribe block. Reads the ticked options and
 * rebuilds the /ical subscribe URL live (display, add-to-calendar/webcal,
 * download link, copy button). Categories live in a searchable multi-select
 * dropdown with removable chips. Pure DOM — labels come pre-translated from
 * PHP (data attributes / server-rendered markup).
 */

function buildQuery(root) {
    const opts = root.querySelectorAll('.soli-cal-subscribe__opt');
    const slugs = [];
    let concerts = false;
    opts.forEach((opt) => {
        if (!opt.checked) return;
        if (opt.getAttribute('data-kind') === 'concerts') {
            concerts = true;
        } else if (opt.value) {
            slugs.push(opt.value);
        }
    });
    const params = [];
    if (slugs.length) params.push('categorie=' + slugs.map(encodeURIComponent).join(','));
    if (concerts) params.push('concerten=1');
    return params.length ? '?' + params.join('&') : '';
}

function sync(root) {
    const base = root.getAttribute('data-base') || '';
    const url = base + buildQuery(root);
    const webcal = url.replace(/^https?:\/\//i, 'webcal://');

    const urlEl = root.querySelector('.soli-cal-subscribe__url');
    const addEl = root.querySelector('.soli-cal-subscribe__add');
    const downloadEl = root.querySelector('.soli-cal-subscribe__download');

    if (urlEl) urlEl.textContent = url;
    if (addEl) addEl.setAttribute('href', webcal);
    if (downloadEl) downloadEl.setAttribute('href', url);

    root.dataset.currentUrl = url;
}

function initCopy(root) {
    const copyBtn = root.querySelector('.soli-cal-subscribe__copy');
    if (!copyBtn) return;
    const original = copyBtn.textContent;
    const copied = copyBtn.getAttribute('data-copied-label') || original;

    copyBtn.addEventListener('click', function () {
        const url = root.dataset.currentUrl || '';
        const done = function () {
            copyBtn.textContent = copied;
            copyBtn.classList.add('is-copied');
            window.setTimeout(function () {
                copyBtn.textContent = original;
                copyBtn.classList.remove('is-copied');
            }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done).catch(done);
        } else {
            // Legacy fallback: select a temporary textarea and execCommand copy.
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) { /* no-op */ }
            document.body.removeChild(ta);
            done();
        }
    });
}

function optionName(box) {
    const label = box.closest('.soli-cal-subscribe__option');
    const span = label && label.querySelector('span');
    return span ? span.textContent.trim() : box.value;
}

/** Rebuild the chips in the dropdown control from the checked option boxes. */
function renderChips(select) {
    const chips = select.querySelector('.soli-cal-subscribe__chips');
    if (!chips) return;
    const placeholder = select.getAttribute('data-placeholder') || '';
    const removeLabel = select.getAttribute('data-remove-label') || '';

    chips.textContent = '';
    const checked = select.querySelectorAll('.soli-cal-subscribe__opt:checked');
    if (!checked.length) {
        const ph = document.createElement('span');
        ph.className = 'soli-cal-subscribe__placeholder';
        ph.textContent = placeholder;
        chips.appendChild(ph);
        return;
    }
    checked.forEach((box) => {
        const name = optionName(box);
        const chip = document.createElement('span');
        chip.className = 'soli-cal-subscribe__chip';
        if (box.getAttribute('data-kind') === 'concerts') {
            chip.setAttribute('data-kind', 'concerts');
        } else {
            chip.setAttribute('data-value', box.value);
        }
        chip.appendChild(document.createTextNode(name));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'soli-cal-subscribe__chip-remove';
        remove.setAttribute('aria-label', (removeLabel + ' ' + name).trim());
        remove.textContent = '×';
        chip.appendChild(remove);
        chips.appendChild(chip);
    });
}

/** Searchable multi-select dropdown for the category options. */
function initSelect(root) {
    const select = root.querySelector('.soli-cal-subscribe__select');
    if (!select) return;
    const control = select.querySelector('.soli-cal-subscribe__control');
    const panel = select.querySelector('.soli-cal-subscribe__panel');
    const search = select.querySelector('.soli-cal-subscribe__search');
    const noMatch = select.querySelector('.soli-cal-subscribe__no-match');

    function open() {
        panel.hidden = false;
        control.setAttribute('aria-expanded', 'true');
        if (search) search.focus();
    }
    function close() {
        panel.hidden = true;
        control.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
        if (panel.hidden) { open(); } else { close(); }
    }

    control.addEventListener('click', function (e) {
        const removeBtn = e.target.closest('.soli-cal-subscribe__chip-remove');
        if (removeBtn) {
            const chip = removeBtn.closest('.soli-cal-subscribe__chip');
            if (!chip) return;
            const isConcerts = chip.getAttribute('data-kind') === 'concerts';
            const value = chip.getAttribute('data-value');
            select.querySelectorAll('.soli-cal-subscribe__opt').forEach((box) => {
                const matches = isConcerts
                    ? box.getAttribute('data-kind') === 'concerts'
                    : box.getAttribute('data-kind') === 'category' && box.value === value;
                if (matches && box.checked) {
                    box.checked = false;
                    box.dispatchEvent(new Event('change'));
                }
            });
            return;
        }
        toggle();
    });
    control.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
    });
    select.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !panel.hidden) {
            close();
            control.focus();
        }
    });
    document.addEventListener('click', function (e) {
        if (!select.contains(e.target)) close();
    });

    if (search) {
        search.addEventListener('input', function () {
            const query = search.value.trim().toLowerCase();
            let visible = 0;
            panel.querySelectorAll('.soli-cal-subscribe__option').forEach((option) => {
                const match = option.textContent.toLowerCase().indexOf(query) !== -1;
                option.hidden = !match;
                if (match) visible++;
            });
            if (noMatch) noMatch.hidden = visible > 0;
        });
    }

    renderChips(select);
}

function initBlock(root) {
    const select = root.querySelector('.soli-cal-subscribe__select');
    root.querySelectorAll('.soli-cal-subscribe__opt').forEach((opt) => {
        opt.addEventListener('change', function () {
            sync(root);
            if (select) renderChips(select);
        });
    });
    initSelect(root);
    initCopy(root);
    sync(root);
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.soli-cal-subscribe').forEach(initBlock);
});
