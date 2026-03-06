/* UpDown - Belief Registry */

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  initCountdowns();
  initAnimations();
  initMobileMenu();
});

/* === Category Filter === */
function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const raceCards = document.querySelectorAll('.race-card');

  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      raceCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = '';
          card.style.animation = 'fadeIn 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* === Countdown Timer === */
function initCountdowns() {
  const countdowns = document.querySelectorAll('[data-deadline]');

  countdowns.forEach(el => {
    updateCountdown(el);
    setInterval(() => updateCountdown(el), 60000);
  });
}

function updateCountdown(el) {
  const deadline = new Date(el.dataset.deadline);
  const now = new Date();
  const diff = deadline - now;

  if (diff <= 0) {
    el.innerHTML = '<span class="number">0</span><span class="unit">Ended</span>';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const remainDays = days % 30;

  el.querySelector('.cd-months').textContent = months;
  el.querySelector('.cd-days').textContent = remainDays;
}

/* === Scroll Animations === */
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.race-card, .argument-card, .contender-card, .vindication-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* === Mobile Menu === */
function initMobileMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.classList.toggle('active');
  });
}

/* === Odds Animation (for race pages) === */
function animateOdds(sideAPercent) {
  const bar = document.querySelector('.odds-bar');
  if (!bar) return;

  const sideA = bar.querySelector('.side-a');
  const sideB = bar.querySelector('.side-b');
  const sideBPercent = 100 - sideAPercent;

  setTimeout(() => {
    sideA.style.width = sideAPercent + '%';
    sideB.style.width = sideBPercent + '%';
  }, 300);
}

/* === Share functionality === */
function shareRace(title, url) {
  if (navigator.share) {
    navigator.share({ title, url });
  } else {
    navigator.clipboard.writeText(url).then(() => {
      const btn = event.target;
      const original = btn.textContent;
      btn.textContent = 'Link copied!';
      setTimeout(() => btn.textContent = original, 2000);
    });
  }
}

/* === Points counter animation === */
function animatePoints(el, target) {
  let current = 0;
  const step = Math.ceil(target / 30);
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 30);
}
