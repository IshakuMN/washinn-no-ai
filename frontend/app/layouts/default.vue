<template>
  <div class="layout">
    <header>
      <h3>WashInn Menu</h3>
      <nav>
        <ul>
          <!-- Standard Routes -->
          <li v-for="route in availableRoutes" :key="route.path">
            <NuxtLink :to="route.path">{{ route.name || route.path }}</NuxtLink>
          </li>

          <!-- Injected Layer Items (Visual separation for demo) -->
          <li
            v-for="item in layerMenuItems"
            :key="item.path"
            class="layer-item"
          >
            <NuxtLink :to="item.path">★ {{ item.name }}</NuxtLink>
          </li>
        </ul>
      </nav>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
const router = useRouter();

// Get all routes, including those from layers
const availableRoutes = computed(() => {
  return router
    .getRoutes()
    .filter((r) => !r.meta?.middleware?.includes("redirect")) // Optional filtering
    .filter((r) => !r.path.includes("api"))
    .filter((r) => !r.path.includes(":")) // Simple menu, skip dynamic params
    .sort((a, b) => a.path.localeCompare(b.path));
});

// Layer Menu Injection (Step 10)
const layerMenuItems = computed(() => {
  if (typeof useLayerMenu === "function") {
    return useLayerMenu();
  }
  return [];
});
</script>

<style scoped>
.layout {
  font-family: sans-serif;
  padding: 20px;
}
header {
  border-bottom: 1px solid #eee;
  margin-bottom: 20px;
}
nav ul {
  display: flex;
  gap: 15px;
  list-style: none;
  padding: 0;
}
a {
  text-decoration: none;
  color: #007bff;
}
a.router-link-active {
  font-weight: bold;
  text-decoration: underline;
}
</style>
