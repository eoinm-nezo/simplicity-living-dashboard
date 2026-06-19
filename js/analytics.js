// Simplicity Living — lightweight analytics
// Persistent anon_id per browser, logs page views + tool events to Supabase.
// Uses fetch directly so it works before supabase-client.js is ready.

(function () {
    const ANON_KEY  = 'simplicity_anon_id';
    const SB_URL    = 'https://faltilsbkrrmjugxhako.supabase.co';
    const SB_KEY    = 'sb_publishable_Lx64Hp7qIUHnSzMdphDTRw_O2kF-nsD';
    const ENDPOINT  = `${SB_URL}/rest/v1/analytics_events`;

    function getAnonId() {
        let id = localStorage.getItem(ANON_KEY);
        if (!id) {
            id = 'anon_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            localStorage.setItem(ANON_KEY, id);
        }
        return id;
    }

    function currentPage() {
        return location.pathname.split('/').pop().replace('.html', '') || 'index';
    }

    async function logEvent(event, meta) {
        const userId = (window.sbGetUser && window.sbGetUser()?.id) || null;
        try {
            await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${SB_KEY}`
                },
                body: JSON.stringify({
                    anon_id: getAnonId(),
                    user_id: userId,
                    event,
                    page: currentPage(),
                    meta: meta || {}
                })
            });
        } catch (e) { /* silently fail */ }
    }

    // Auto page-view on load
    document.addEventListener('DOMContentLoaded', () => {
        logEvent('page_view', { title: document.title });
    });

    // Public API — call from anywhere in the app
    window.trackEvent = (event, meta) => logEvent(event, meta);

})();
