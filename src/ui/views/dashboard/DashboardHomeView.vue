<template>
  <div>
    <h1 class="h2 mb-4">{{ $t('dashboard.home.title') }}</h1>
    <div class="row">
      <div class="col-md-6 col-lg-3 mb-4">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h5 class="card-title text-primary">{{ $t('dashboard.home.stats.bands') }}</h5>
            <p class="card-text fs-4 fw-bold">12</p>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3 mb-4">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h5 class="card-title text-success">{{ $t('dashboard.home.stats.musicians') }}</h5>
            <p class="card-text fs-4 fw-bold">48</p>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3 mb-4">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h5 class="card-title text-warning">{{ $t('dashboard.home.stats.songs') }}</h5>
            <p class="card-text fs-4 fw-bold">34</p>
          </div>
        </div>
      </div>
      <div class="col-md-6 col-lg-3 mb-4">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h5 class="card-title text-danger">{{ $t('dashboard.home.stats.videoclips') }}</h5>
            <p class="card-text fs-4 fw-bold">8</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Dashboard home logic
</script>
