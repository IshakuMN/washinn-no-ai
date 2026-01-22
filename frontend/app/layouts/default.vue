<template>
  <div class="layout">
    <header>
      <h3>WashInn Menu</h3>
      <nav>
        <ul>
          <li v-for="route in availableRoutes" :key="route.path">
            <NuxtLink :to="route.path">{{ route.name || route.path }}</NuxtLink>
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
