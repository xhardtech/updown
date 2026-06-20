// XHT Analytics — Custom event tracking for GA4
// Include on all pages after gtag.js

window.xhtTrack = {

  // User submits a URL
  submitUrl: function(url) {
    try {
      gtag('event', 'submit_url', {
        event_category: 'engagement',
        url_domain: new URL(url).hostname,
      });
    } catch {}
  },

  // User votes (free temp or paid)
  vote: function(type, isPaid) {
    gtag('event', 'vote', {
      event_category: 'engagement',
      vote_type: type,
      is_paid: isPaid || false,
    });
    if (isPaid) {
      gtag('event', 'purchase', {
        transaction_id: 'qv_' + Date.now(),
        currency: 'VND',
        value: 10000,
        items: [{ item_id: 'quick_vote', item_name: 'Quick Vote', price: 10000, quantity: 1 }],
      });
    }
  },

  // User shares
  share: function(method) {
    gtag('event', 'share', { method: method });
  },

  // User signs up / logs in
  signup: function(method) {
    gtag('event', 'sign_up', { method: method });
  },

  login: function(method) {
    gtag('event', 'login', { method: method });
  },

  // View result page
  viewResult: function(raceTitle) {
    gtag('event', 'view_result', {
      event_category: 'content',
      race_name: raceTitle || '',
    });
  },

  // View race page
  viewRace: function(raceTitle) {
    gtag('event', 'view_race', {
      event_category: 'content',
      race_name: raceTitle || '',
    });
  },
};
