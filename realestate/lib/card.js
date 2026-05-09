import { fmtPrice, fmtSpecs, fmtCityState } from './format.js';
import { isFavorite, toggleFavorite } from './store.js';
import { el } from './dom.js';

export function buildCard(listing) {
    const a = el('a', { cls: 'lcard', attrs: { href: './listing.html?id=' + listing.id } });

    const photo = el('div', { cls: 'photo' });
    photo.appendChild(el('div', { cls: 'gradient', style: { background: listing.heroColor } }));

    // Real photo overlay — fades in on load, removed on 404 so the gradient shows through.
    const img = el('img', {
        cls: 'photo-img',
        attrs: {
            src: '/realestate/photos/' + listing.id + '.png',
            alt: listing.title,
            loading: 'lazy',
            decoding: 'async'
        }
    });
    img.addEventListener('load', () => img.classList.add('loaded'));
    img.addEventListener('error', () => img.remove());
    photo.appendChild(img);

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
