<template>
  <div class="landing">
    <section class="landing-hero" :style="{ backgroundImage: `url(${heroImage})` }">
      <div class="landing-hero__overlay"></div>
      <div class="container landing-hero__inner position-relative z-1">
        <div class="landing-hero__copy text-center">
          <h1 class="display-3 fw-bolder mb-4 text-white text-shadow-glow">{{ $t('public.landing.title') }}</h1>
          <p class="lead text-light mb-5 fs-4">
            {{ $t('public.landing.description') }}
          </p>
          <router-link :to="{ name: 'Login' }" class="btn btn-primary btn-lg px-5 glow-button">
            {{ $t('public.landing.cta') }}
          </router-link>
        </div>
      </div>
    </section>

    <section class="landing-section container">
      <div class="text-center mb-4">
        <h2 class="fw-bold mb-2">{{ $t('public.landing.howItWorks.title') }}</h2>
        <p class="text-body-secondary">{{ $t('public.landing.howItWorks.subtitle') }}</p>
      </div>
      <div class="row g-4">
        <div v-for="step in steps" :key="step.icon" class="col-md-6 col-lg-3">
          <div class="card h-100 text-center landing-step glass-card">
            <div class="card-body">
              <div class="landing-step__icon glow-icon">
                <i :class="`bi ${step.icon}`" aria-hidden="true"></i>
              </div>
              <h5 class="card-title">{{ $t(step.title) }}</h5>
              <p class="card-text text-body-secondary">{{ $t(step.description) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="landing-section landing-section--muted">
      <div class="container">
        <div class="text-center mb-4">
          <h2 class="fw-bold mb-2">{{ $t('public.landing.benefits.title') }}</h2>
          <p class="text-body-secondary">{{ $t('public.landing.benefits.subtitle') }}</p>
        </div>
        <div class="row g-4">
          <div v-for="benefit in benefits" :key="benefit.icon" class="col-md-6 col-lg-3">
            <div class="card h-100 p-4 landing-benefit glass-card text-center">
              <div class="landing-benefit__icon glow-icon">
                <i :class="`bi ${benefit.icon}`" aria-hidden="true"></i>
              </div>
              <h5 class="mb-2">{{ $t(benefit.title) }}</h5>
              <p class="text-body-secondary mb-0">{{ $t(benefit.description) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="landing-section container text-center my-4 py-4 glass-card position-relative overflow-hidden" style="border-radius: 1.5rem;">
      <div class="position-relative z-1">
        <h2 class="fw-bold mb-3 text-shadow-glow">{{ $t('public.landing.finalCta.title') }}</h2>
        <p class="text-body-secondary mb-4 fs-5">{{ $t('public.landing.finalCta.description') }}</p>
        <router-link :to="{ name: 'Login' }" class="btn btn-primary btn-lg px-5 glow-button">
          {{ $t('public.landing.cta') }}
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import heroImage from '../../../assets/hero-realistic.png';

const steps = [
  {
    icon: 'bi-mic-fill',
    title: 'public.landing.howItWorks.step1.title',
    description: 'public.landing.howItWorks.step1.description',
  },
  {
    icon: 'bi-people-fill',
    title: 'public.landing.howItWorks.step2.title',
    description: 'public.landing.howItWorks.step2.description',
  },
  {
    icon: 'bi-sliders',
    title: 'public.landing.howItWorks.step3.title',
    description: 'public.landing.howItWorks.step3.description',
  },
  {
    icon: 'bi-film',
    title: 'public.landing.howItWorks.step4.title',
    description: 'public.landing.howItWorks.step4.description',
  },
];

const benefits = [
  {
    icon: 'bi-geo-alt-fill',
    title: 'public.landing.benefits.remote.title',
    description: 'public.landing.benefits.remote.description',
  },
  {
    icon: 'bi-soundwave',
    title: 'public.landing.benefits.quality.title',
    description: 'public.landing.benefits.quality.description',
  },
  {
    icon: 'bi-people',
    title: 'public.landing.benefits.collaboration.title',
    description: 'public.landing.benefits.collaboration.description',
  },
  {
    icon: 'bi-camera-reels-fill',
    title: 'public.landing.benefits.video.title',
    description: 'public.landing.benefits.video.description',
  },
];
</script>

<style scoped>
.landing-hero {
  position: relative;
  padding: 6rem 0 16rem 0;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.landing-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.85) 100%);
}

.landing-hero__inner {
  display: flex;
  justify-content: center;
  width: 100%;
}

.landing-hero__copy {
  max-width: 800px;
}

.text-shadow-glow {
  text-shadow: 0 0 24px rgba(var(--bs-primary-rgb), 0.6);
}

.glow-button {
  box-shadow: 0 0 20px rgba(var(--bs-primary-rgb), 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glow-button:hover {
  box-shadow: 0 0 35px rgba(var(--bs-primary-rgb), 0.8);
  transform: translateY(-2px) scale(1.02);
  border-color: rgba(255, 255, 255, 0.2);
}

.glass-card {
  background: rgba(var(--bs-body-color-rgb), 0.03) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(var(--bs-body-color-rgb), 0.1) !important;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
}

.glass-card:hover {
  transform: translateY(-6px);
  border-color: rgba(var(--bs-primary-rgb), 0.4) !important;
  box-shadow: 0 12px 40px 0 rgba(var(--bs-primary-rgb), 0.15);
}

.glow-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(var(--bs-primary-rgb), 0.15), rgba(var(--bs-primary-rgb), 0.05));
  color: var(--bs-primary);
  font-size: 1.75rem;
  box-shadow: inset 0 0 20px rgba(var(--bs-primary-rgb), 0.1), 0 0 15px rgba(var(--bs-primary-rgb), 0.15);
  border: 1px solid rgba(var(--bs-primary-rgb), 0.25);
  transition: all 0.3s ease;
}

.glass-card:hover .glow-icon {
  box-shadow: inset 0 0 20px rgba(var(--bs-primary-rgb), 0.25), 0 0 30px rgba(var(--bs-primary-rgb), 0.4);
  transform: scale(1.05);
}

.landing-section {
  padding: 3rem 0;
}

.landing-section--muted {
  background-color: transparent;
  position: relative;
}

.landing-section--muted::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(var(--bs-primary-rgb), 0.03) 0%, transparent 70%);
  pointer-events: none;
}

.landing-step, .landing-benefit {
  border-radius: 1rem;
}

@media (max-width: 767.98px) {
  .landing-hero {
    padding: 6rem 0 2rem;
    min-height: 100vh;
  }
}
</style>
