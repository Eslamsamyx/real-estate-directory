import { getFavorites } from './store.js';
import { el } from './dom.js';

export function mountNav(activePage) {
    const target = document.getElementById('topnav');
    if (!target) return;

    const logo = el('a', { cls: 'logo', text: 'Domus', attrs: { href: './index.html' } });
    const links = el('div', { cls: 'links' }, [
        el('a', { text: 'Buy', cls: activePage === 'index' ? 'active' : '', attrs: { href: './index.html' } }),
        el('a', { text: 'Rent', attrs: { 'aria-disabled': 'true', href: '#' } }),
        el('a', { text: 'Sell', attrs: { 'aria-disabled': 'true', href: '#' } })
    ]);

    const heartLink = el('a', {
        cls: 'heart-link' + (activePage === 'favorites' ? ' active' : ''),
        attrs: { href: './favorites.html' }
    });
    heartLink.appendChild(document.createTextNode('♥ '));
    const heartCount = el('span', { cls: 'count', text: String(getFavorites().length) });
    heartLink.appendChild(heartCount);

    const account = el('div', { cls: 'account', text: 'JD', attrs: { title: 'Demo only — no real account' } });
    const right = el('div', { cls: 'right' }, [heartLink, account]);

    target.replaceChildren(logo, links, right);

    window.addEventListener('favorites-changed', () => {
        heartCount.textContent = String(getFavorites().length);
    });
}

export function mountFooter() {
    const target = document.getElementById('foot');
    if (!target) return;
    const left = el('div', { text: 'Domus · demo built on PlayCanvas · ' + new Date().getFullYear() });
    const right = el('div');
    right.appendChild(el('a', { text: 'Engine examples', attrs: { href: '/demo/examples.html' } }));
    right.appendChild(document.createTextNode(' · '));
    right.appendChild(el('a', { text: 'Open splat tour', attrs: { href: '/demo/walkthrough.html' } }));
    right.appendChild(document.createTextNode(' · '));
    right.appendChild(el('a', { text: 'About this demo', attrs: { href: '#' } }));
    target.replaceChildren(left, right);
}
