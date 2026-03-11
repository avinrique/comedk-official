/* ============================================
   COMEDK Official — Main JavaScript
   Handles: navigation, scroll effects, reveal
   animations, testimonial slider, FAQ accordion,
   stats counter, mobile bottom bar.
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
  initStickyNav();
  initSmoothScroll();
  initScrollReveal();
  initTestimonialSlider();
  initFaqAccordion();
  initStatsCounter();
  initMobileBottomBar();
});

/* -----------------------------------------
   Mobile Hamburger Menu
   ----------------------------------------- */
function initMobileMenu() {
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
    // Prevent body scroll when menu is open
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });

  // Close menu when a link is clicked
  const links = navLinks.querySelectorAll('a');
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close menu on escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

/* -----------------------------------------
   Sticky Nav — Background on Scroll
   ----------------------------------------- */
function initStickyNav() {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;

  var scrollThreshold = 50;

  function handleScroll() {
    if (window.scrollY > scrollThreshold) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // Check on load
  handleScroll();

  // Throttled scroll listener
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* -----------------------------------------
   Smooth Scroll for Anchor Links
   ----------------------------------------- */
function initSmoothScroll() {
  var anchors = document.querySelectorAll('a[href^="#"]');
  anchors.forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      var navHeight = document.getElementById('navbar')
        ? document.getElementById('navbar').offsetHeight
        : 0;

      var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
    });
  });
}

/* -----------------------------------------
   Scroll Reveal — IntersectionObserver
   Fade-in-up animation on .reveal elements
   ----------------------------------------- */
function initScrollReveal() {
  var revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length === 0) return;

  // Check for IntersectionObserver support
  if (!('IntersectionObserver' in window)) {
    // Fallback: show everything immediately
    revealElements.forEach(function (el) {
      el.classList.add('revealed');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealElements.forEach(function (el) {
    observer.observe(el);
  });
}

/* -----------------------------------------
   Testimonial Slider
   Auto-rotate + clickable dots
   ----------------------------------------- */
function initTestimonialSlider() {
  var track = document.getElementById('testimonialTrack');
  var dotsContainer = document.getElementById('testimonialDots');

  if (!track || !dotsContainer) return;

  var slides = track.querySelectorAll('.testimonial-card');
  var dots = dotsContainer.querySelectorAll('.testimonial-dot');
  var currentIndex = 0;
  var totalSlides = slides.length;
  var autoPlayInterval = null;
  var autoPlayDelay = 5000;

  function goToSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;

    currentIndex = index;
    track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';

    // Update dots
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  // Click dots to navigate
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var index = parseInt(this.getAttribute('data-index'), 10);
      goToSlide(index);
      resetAutoPlay();
    });
  });

  // Auto-play
  function startAutoPlay() {
    autoPlayInterval = setInterval(function () {
      goToSlide(currentIndex + 1);
    }, autoPlayDelay);
  }

  function resetAutoPlay() {
    clearInterval(autoPlayInterval);
    startAutoPlay();
  }

  // Pause on hover
  var slider = document.getElementById('testimonialSlider');
  if (slider) {
    slider.addEventListener('mouseenter', function () {
      clearInterval(autoPlayInterval);
    });
    slider.addEventListener('mouseleave', function () {
      startAutoPlay();
    });
  }

  // Touch swipe support
  var touchStartX = 0;
  var touchEndX = 0;

  track.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', function (e) {
    touchEndX = e.changedTouches[0].screenX;
    var diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
      resetAutoPlay();
    }
  }, { passive: true });

  // Start
  startAutoPlay();
}

/* -----------------------------------------
   FAQ Accordion
   Click to expand/collapse
   ----------------------------------------- */
function initFaqAccordion() {
  var faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length === 0) return;

  faqItems.forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', function () {
      var isActive = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(function (other) {
        if (other !== item) {
          other.classList.remove('active');
          var otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current item
      item.classList.toggle('active', !isActive);
      question.setAttribute('aria-expanded', String(!isActive));
    });
  });
}

/* -----------------------------------------
   Stats Counter Animation
   Count up numbers when section is in view
   ----------------------------------------- */
function initStatsCounter() {
  var statNumbers = document.querySelectorAll('.stat-number[data-count]');
  if (statNumbers.length === 0) return;

  var hasAnimated = false;

  function animateCounters() {
    if (hasAnimated) return;

    statNumbers.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var duration = 2000; // 2 seconds
      var startTime = null;
      var startValue = 0;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);

        // Ease-out curve
        var easedProgress = 1 - Math.pow(1 - progress, 3);

        var current = Math.floor(startValue + (target - startValue) * easedProgress);

        // Format display
        if (target >= 1000) {
          el.textContent = formatNumber(current) + '+';
        } else if (target === 95) {
          el.textContent = current + '%';
        } else {
          el.textContent = current;
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Ensure final value is exact
          if (target >= 1000) {
            el.textContent = formatNumber(target) + '+';
          } else if (target === 95) {
            el.textContent = target + '%';
          } else {
            el.textContent = target;
          }
        }
      }

      requestAnimationFrame(step);
    });

    hasAnimated = true;
  }

  function formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(0).replace(/\.0$/, '') + ',' + String(num % 1000).padStart(3, '0');
    }
    return String(num);
  }

  // Use IntersectionObserver to trigger when stats section is visible
  if ('IntersectionObserver' in window) {
    var statsSection = document.getElementById('stats');
    if (!statsSection) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounters();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(statsSection);
  } else {
    // Fallback
    animateCounters();
  }
}

/* -----------------------------------------
   Mobile Bottom Bar — Active State
   Highlights the link matching the current page
   ----------------------------------------- */
function initMobileBottomBar() {
  var bottomBar = document.querySelector('.mobile-bottom-bar');
  if (!bottomBar) return;

  var links = bottomBar.querySelectorAll('a[data-page]');
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';

  // Map filenames to page names
  var pageMap = {
    'index.html': 'home',
    'predictor.html': 'predictor',
    'about.html': 'about',
    'contact.html': 'contact',
    '': 'home',
  };

  var currentPage = pageMap[currentPath] || 'home';

  links.forEach(function (link) {
    var page = link.getAttribute('data-page');
    if (page === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
