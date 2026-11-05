/* Simplicity Living — shared icon set
 * =====================================================================================
 * One stroke-drawn set for the whole app, so a material on the A4–A5 calculator, a trade
 * on the activity profile and a category on the scorecard all look like they came from
 * the same place. 24×24 viewBox, 1.8 stroke, no fills, colour inherited from the parent.
 *
 * Usage:   appIcon('concrete')                 → <svg class="app-icon">…</svg>
 *          appIcon('concrete', { cls: 'foo' }) → a different class
 *          appIcon('concrete', { size: 32 })   → explicit px size
 *
 * Icons are referenced by NAME in the data files (a4a5-data.js, scoring-criteria.js),
 * never by glyph, so a rename here changes the whole app at once.
 * =====================================================================================
 */
const APP_ICONS = {
    // ── materials ────────────────────────────────────────────────────────────────────
    concrete:     '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v6M15 10v5M7 15v5M14 15v5"/>',
    precast:      '<rect x="3" y="7" width="7" height="13" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/><path d="M2 20h20"/>',
    rebar:        '<path d="M5 3v18M12 3v18M19 3v18"/><path d="M3 8h18M3 16h18"/>',
    steel:        '<path d="M5 3v18M19 3v18"/><path d="M3 3h4M17 3h4M3 21h4M17 21h4"/><path d="M5 12h14"/>',
    timber:       '<path d="M4 7h16v12H4z"/><ellipse cx="4" cy="13" rx="2" ry="6"/><path d="M4 11.5a1 1 0 0 1 0 3"/>',
    clt:          '<rect x="3" y="4" width="18" height="4.5" rx="1"/><rect x="3" y="9.75" width="18" height="4.5" rx="1"/><rect x="3" y="15.5" width="18" height="4.5" rx="1"/>',
    plasterboard: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 3v18"/><path d="M11 8h6M11 12h6M11 16h4"/>',
    glazing:      '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 3v18M3 12h18"/>',
    cladding:     '<path d="M3 6h7v4H3zM10 6h11v4H10z"/><path d="M3 14h11v4H3zM14 14h7v4h-7z"/>',
    insulation:   '<path d="M4 4h16v16H4z"/><path d="M4 8c3 0 3 3 6 3s3-3 6-3 3 3 4 3"/><path d="M4 14c3 0 3 3 6 3s3-3 6-3 3 3 4 3"/>',
    masonry:      '<path d="M3 5h6v4H3zM9 5h12v4H9z"/><path d="M3 11h12v4H3zM15 11h6v4h-6z"/><path d="M3 17h6v4H3zM9 17h12v4H9z"/>',
    services:     '<path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5-2-2 2.5-2.5Z"/>',

    // ── site activity: trades & metrics ──────────────────────────────────────────────
    people:       '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    material:     '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    equipment:    '<path d="M4 21V5l9 4"/><path d="M4 9h9"/><path d="M13 9V3h7l-3 6"/><path d="M17 9v6a2 2 0 0 1-2 2h-2"/><path d="M2 21h20"/>',
    fuel:         '<path d="M3 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M2 21h12"/><path d="M6 8h4"/><path d="M16 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    electricity:  '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    ground:       '<path d="M3 18h18"/><path d="m5 18 3-7 4 3 3-6 4 10"/>',
    core:         '<path d="M6 21V8l12-5v18"/><path d="M6 12h12"/><path d="M6 16h12"/><path d="M3 21h18"/>',
    envelope:     '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/>',
    fitout:       '<path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5-2-2 2.5-2.5Z"/>',

    // ── capture tools ────────────────────────────────────────────────────────────────
    mobile:       '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    truck:        '<path d="M3 17V6a1 1 0 0 1 1-1h10v12"/><path d="M14 9h4l3 3v5h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    waste:        '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14"/><path d="M10 11v6M14 11v6"/>',
    meter:        '<circle cx="12" cy="12" r="9"/><path d="M12 12 16 8"/><path d="M12 3v2M21 12h-2M12 21v-2M3 12h2"/>',

    // ── scorecard categories ─────────────────────────────────────────────────────────
    energy:       '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    comfort:      '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
    carbon:       '<path d="M3 20h18"/><path d="M6 20V9l6-4 6 4v11"/><path d="M10 20v-5h4v5"/>',
    materials:    '<path d="M3 7h6v5H3zM9 7h12v5H9z"/><path d="M3 14h12v5H3zM15 14h6v5h-6z"/>',
    water:        '<path d="M12 3s6 6.3 6 10.5a6 6 0 0 1-12 0C6 9.3 12 3 12 3Z"/>',
    recycle:      '<path d="m7 19-2-3.5 3-1.8"/><path d="M5 15.5 9.2 8a2 2 0 0 1 3.4 0l1.3 2.3"/><path d="m19.5 13 2 3.5-3.4.3"/><path d="M21.5 16.5h-8.6"/><path d="m10 21 3.5-.1-1.5-3"/>',
    transport:    '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M4 11h16"/><path d="M7 20v-2M17 20v-2"/><circle cx="8" cy="14" r=".6"/><circle cx="16" cy="14" r=".6"/>',
    nature:       '<path d="M12 21v-7"/><path d="M12 14s-5-1-5-5a5 5 0 0 1 10 0c0 4-5 5-5 5Z"/><path d="M7 21h10"/>',
    globe:        '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z"/>',
    wind:         '<path d="M3 8h9a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h14a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16h7a2 2 0 1 1-2 2"/>',
    // paint roller — healthy materials / low-VOC interior finishes
    roller:       '<rect x="3" y="4" width="12" height="6" rx="1"/><path d="M15 7h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5a1 1 0 0 0-1 1v1h-1v6"/>',
    // leaf with vein — water-sensitive design & ecology / planting
    leaf:         '<path d="M4 20c0-9 6-14 15-14 0 9-6 14-15 14Z"/><path d="M4 20C9 16 13 12 19 11"/>',
    // clipboard with check — responsible contracting / environmental management plan
    clipboardCheck:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="m9 13 2 2 4-4"/>',
    sun:          '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sound:        '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a4 4 0 0 1 0 7"/><path d="M19 6a7 7 0 0 1 0 12"/>',
    shield:       '<path d="M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',

    // ── the A4 journey: factory → port → road → site ─────────────────────────────────
    factory:      '<path d="M3 21V10l6 4V10l6 4V7l6 4v10z"/><path d="M2 21h20"/><path d="M7 7V3h3v4"/>',
    ship:         '<path d="M3 15h18l-2 5a2 2 0 0 1-1.8 1H6.8A2 2 0 0 1 5 20z"/><path d="M5 15V8h14v7"/><path d="M12 3v5"/><path d="M9 8h6"/>',
    anchor:       '<circle cx="12" cy="5" r="2"/><path d="M12 7v14"/><path d="M5 12H3a9 9 0 0 0 18 0h-2"/><path d="M8 11h8"/>',
    crane:        '<path d="M4 21V4l14 3"/><path d="M4 7h14"/><path d="M13 7v4"/><path d="M10 11h6l-3 4z"/><path d="M2 21h20"/>',
    excavation:   '<path d="M3 9h18"/><path d="M6 9v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9"/><path d="M9 9V5h6v4"/><path d="M9 13h6"/>',

    // ── navigation tiles & page headings ─────────────────────────────────────────────
    target:       '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>',
    trendDown:    '<path d="m3 7 6.5 6.5 4-4L21 17"/><path d="M15 17h6v-6"/>',
    chart:        '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7"/><rect x="12.5" y="7" width="3" height="11"/><rect x="18" y="13" width="3" height="5"/>',
    calculator:   '<rect x="4" y="2" width="16" height="20" rx="2"/><rect x="7" y="5" width="10" height="4"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/>',
    ruler:        '<path d="M3 15 15 3l6 6L9 21z"/><path d="m7 11 2 2M10 8l2 2M13 5l2 2"/>',
    thermometer:  '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0Z"/><path d="M12 9v6"/>',
    flame:        '<path d="M12 22a7 7 0 0 0 7-7c0-5-4-6-5-11-3 2-4 5-4 7-1 0-2-1-2.5-2.5C6 10.5 5 12.5 5 15a7 7 0 0 0 7 7Z"/>',
    palette:      '<path d="M12 21a9 9 0 1 1 9-9c0 1.7-1.3 3-3 3h-1.5a2 2 0 0 0-1.4 3.4c.3.3.4.7.4 1.1a1.5 1.5 0 0 1-1.5 1.5Z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
    stopwatch:    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/><path d="m19 5 1.5 1.5"/>',
    // hard hat (crown + brim), face below the brim, shoulders at the base — the three
    // bands must not overlap or the figure reads as a smudge at 30px.
    worker:       '<path d="M6 8a6 6 0 0 1 12 0"/><path d="M3 8h18"/><circle cx="12" cy="12.6" r="2.7"/><path d="M5.5 21v-1.2a6.5 6.5 0 0 1 13 0V21"/>',
    trophy:       '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/><path d="M17 6h3v1a3 3 0 0 1-3 3"/>',
    database:     '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    save:         '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/><rect x="8" y="13" width="8" height="8"/>',
    print:        '<path d="M7 9V3h10v6"/><path d="M5 9h14a2 2 0 0 1 2 2v6h-4"/><path d="M7 17H3v-6"/><rect x="7" y="14" width="10" height="7"/>',
    map:          '<path d="m2 6 6.5-3 7 3L22 3v15l-6.5 3-7-3L2 21z"/><path d="M8.5 3v15M15.5 6v15"/>',
    star:         '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.3L12 17.4 6.4 20.4l1.1-6.3L3 9.7l6.2-.9z"/>',
    cone:         '<path d="m12 3 6 16H6z"/><path d="M4 21h16"/><path d="M9.2 12h5.6"/>',
    edit:         '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    balance:      '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M4 7h16"/><path d="m4 7-2.5 5a3 3 0 0 0 5 0z"/><path d="m20 7-2.5 5a3 3 0 0 0 5 0z"/>'
};

/* Render an icon as an inline SVG string. */
function appIcon(name, opts) {
    const o = opts || {};
    const body = APP_ICONS[name];
    if (!body) return '';
    const size = o.size ? ` width="${o.size}" height="${o.size}"` : '';
    return '<svg class="' + (o.cls || 'app-icon') + '"' + size +
           ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"' +
           ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}

/* Fill every <… data-icon="name"> in static markup, so page HTML names an icon rather
 * than hard-coding a glyph. Runs on load and is safe to call again after a re-render. */
function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach((el) => {
        const svg = appIcon(el.dataset.icon, { cls: el.dataset.iconCls || 'app-icon' });
        if (svg && el.innerHTML !== svg) el.innerHTML = svg;
    });
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => hydrateIcons());
    } else {
        hydrateIcons();
    }
}
