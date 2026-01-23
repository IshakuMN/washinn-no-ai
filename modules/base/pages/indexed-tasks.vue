<template>
  <div class="indexed-page">
    <h1>Layer Page: Reverse Index Filter</h1>
    <p class="desc">
      This page lives in <code>modules/base</code>. It uses the efficient
      <strong>Reverse Index</strong> approach
      (<code>tasksByProject/{projectId}</code>) instead of querying the main
      collection.
    </p>

    <!-- Project Selector -->
    <div class="controls">
      <label>Select Project:</label>
      <select v-model="selectedProjectId">
        <option :value="null" disabled>Choose...</option>
        <option v-for="(name, pid) in projectNames" :key="pid" :value="pid">
          {{ name }}
        </option>
      </select>
    </div>

    <!-- Results -->
    <div v-if="selectedProjectId" class="results">
      <h3>Tasks for Project ({{ taskCount }})</h3>
      <div v-if="loading" class="loading">Loading via Reverse Index...</div>

      <ul v-else class="task-list">
        <li v-for="task in tasks" :key="task.id" class="task-card">
          <strong>{{ task.title }}</strong>
          <span class="badg">{{
            task.assigneeId ? "Assigned" : "Unassigned"
          }}</span>
        </li>
      </ul>
      <div v-if="!loading && tasks.length === 0" class="empty">
        No tasks found in reverse index.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { ref as dbRef, onValue, get, child } from "firebase/database";

const { $db } = useNuxtApp();

const selectedProjectId = ref(null);
const projectNames = ref({});
const tasks = ref([]);
const loading = ref(false);

// 1. Load Projects for the dropdown
onMounted(() => {
  onValue(dbRef($db, "projects"), (snapshot) => {
    const val = snapshot.val() || {};
    // Map to simple { id: name } object
    projectNames.value = Object.keys(val).reduce((acc, key) => {
      acc[key] = val[key].name;
      return acc;
    }, {});
  });
});

const taskCount = computed(() => tasks.value.length);

// 2. Watch Selection -> Fetch via Reverse Index
watch(selectedProjectId, async (pid) => {
  if (!pid) {
    tasks.value = [];
    return;
  }

  loading.value = true;
  tasks.value = [];

  // Step A: Read the Reverse Index First
  // Path: tasksByProject/{projectId} -> returns { taskId1: true, taskId2: true }
  const indexRef = dbRef($db, `tasksByProject/${pid}`);

  onValue(indexRef, async (snapshot) => {
    const indexData = snapshot.val() || {};
    const taskIds = Object.keys(indexData);

    if (taskIds.length === 0) {
      tasks.value = [];
      loading.value = false;
      return;
    }

    // Step B: Fetch details for these IDs only
    // This often happens client-side securely, or simplified here with Promise.all
    const promises = taskIds.map(async (tid) => {
      const taskSnap = await get(child(dbRef($db), `tasks/${tid}`));
      if (taskSnap.exists()) {
        return { id: tid, ...taskSnap.val() };
      }
      return null;
    });

    const results = await Promise.all(promises);
    tasks.value = results.filter((t) => t !== null);
    loading.value = false;
  });
});
</script>

<style scoped>
.indexed-page {
  padding: 20px;
  font-family: sans-serif;
  max-width: 800px;
}
.desc {
  background: #e8f5e9;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #c8e6c9;
  color: #2e7d32;
}
.controls {
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
select {
  padding: 8px;
  font-size: 1rem;
  min-width: 200px;
}
.task-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}
.task-card {
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.badg {
  font-size: 0.8em;
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
