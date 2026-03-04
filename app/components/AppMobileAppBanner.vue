<template>
  <div
    v-show="isVisible"
    class="banner-slide fixed top-2 left-2 right-2 z-[9999] lg:hidden"
  >
    <div class="overflow-hidden rounded-2xl border border-blue-400/30 bg-blue-600/95 font-quicksand text-white shadow-2xl backdrop-blur-md">
      <div class="flex items-center justify-between px-3 py-2.5">
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0 rounded-lg bg-white p-1 shadow-sm">
            <img src="/pwa-192x192.png" alt="Logo" class="h-6 w-6 rounded-md" />
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-[11px] font-bold">App Vie Publique</span>
            <span class="text-[9px] opacity-90">Emportez Vie Publique partout avec vous</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            to="https://onelink.to/a3jrac"
            target="_blank"
            size="xs"
            color="white"
            variant="solid"
            class="rounded-full px-4 font-bold text-blue-600 shadow-sm transition-transform active:scale-90"
          >
            Installer
          </UButton>
          <button
            @click="closeBanner"
            class="rounded-full p-1 transition-colors hover:bg-white/10"
            aria-label="Fermer"
          >
            <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isVisible = ref(false);
const STORAGE_KEY = 'mobile-app-banner-closed';

onMounted(() => {
  const isClosed = sessionStorage.getItem(STORAGE_KEY);
  if (!isClosed) {
    setTimeout(() => {
      isVisible.value = true;
    }, 2000);
  }
});

const closeBanner = () => {
  isVisible.value = false;
  sessionStorage.setItem(STORAGE_KEY, 'true');
};
</script>

<style scoped>
.font-quicksand {
  font-family: 'Quicksand', sans-serif;
}

.banner-slide {
  animation: slideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes slideDown {
  from {
    transform: translateY(-120%) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
