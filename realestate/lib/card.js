import { fmtPrice, fmtSpecs, fmtCityState } from './format.js';
import { isFavorite, toggleFavorite } from './store.js';

function el(tag, props) {
    const e = document.createElement(tag);
    if (props?.cls) e.className = props.cls;
    if (props?.text != null) e.textContent = props.text;
    if (props?.attrs) for (const k in props.attrs) e.setAttribute(k, props.attrs[k]);
    if (props?.style) for (const k in props.style) e.style[k] = props.style[k];
    return e;
}

export function buildCard(listing) {
    const a = el('a', { cls: 'lcard', attrs: { href: './listing.html?id=' + listing.id } });

    const photo = el('div', { cls: 'photo' });
    photo.appendChild(el('div', { cls: 'gradient', style: { background: listing.heroColor } }));

    if (listing.tour3d) photo.appendChild(el('span', { cls: 'badge3d', text: '3D Tour' }));

    const heart = el('button', {
        cls: 'heart' + (isFavorite(listing.id) ? ' on' : ''),
        attrs: { 'aria-label': 'Save listing', type: 'button' }
    });
    heart.textContent = isFavorite(listing.id) ? '♥' : '♡';
    heart.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const on = toggleFavorite(listing.id);
        heart.classList.toggle('on', on);
        heart.textContent = on ? '♥' : '♡';
        window.dispatchEvent(new CustomEvent('favorites-changed'));
    });
    photo.appendChild(heart);
    a.appendChild(photo);

    const meta = el('div', { cls: 'meta' });
    const titleRow = el('div', { cls: 'title-row' });
    titleRow.appendChild(el('span', { cls: 'title', text: listing.title }));
    titleRow.appendChild(el('span', { cls: 'price', text: fmtPrice(listing.price) }));
    meta.appendChild(titleRow);
    meta.appendChild(el('div', { cls: 'addr', text: listing.address.line1 + ', ' + fmtCityState(listing) }));
    meta.appendChild(el('div', { cls: 'specs', text: fmtSpecs(listing) }));
    a.appendChild(meta);
    return a;
}
