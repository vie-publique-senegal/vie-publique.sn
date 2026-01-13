<script lang="ts" setup>

const appConfig = useAppConfig();
const { country, api, features, labels, seo, ui } = appConfig.vpsnElections;
</script>

<template>
  <div>
    <p>{{ country }}</p>
    <p>{{ api }}</p>
    <p>{{ features }}</p>
    <p>{{ labels }}</p>
    <p>{{ seo }}</p>
    <p>{{ ui }}</p>
  </div>
</template>
