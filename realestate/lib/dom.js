// Tiny createElement helper used by every DOM-building module in /realestate.
// Supports text, class, attrs, inline style, and children appended in order.
export function el(tag, props, children) {
    const e = document.createElement(tag);
    if (props?.cls) e.className = props.cls;
    if (props?.text != null) e.textContent = props.text;
    if (props?.attrs) for (const k in props.attrs) e.setAttribute(k, props.attrs[k]);
    if (props?.style) for (const k in props.style) e.style[k] = props.style[k];
    if (children) for (const c of children) if (c) e.appendChild(c);
    return e;
}
