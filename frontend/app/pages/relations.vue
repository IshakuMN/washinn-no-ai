<template>
  <div class="relations-page">
    <h1>Relations Manager</h1>
    <p class="description">
      Manage relationships with bi-directional updates (Reverse Indexes).
      <br />
      <strong>Features:</strong> Assign Members to Projects (Many-to-Many),
      Reassign Tasks.
    </p>

    <div class="container">
      <!-- 1. Select Project -->
      <section class="panel">
        <h2>1. Select Project</h2>
        <select v-model="selectedProjectId" class="project-select">
          <option :value="null" disabled>Choose a Project...</option>
          <option v-for="(p, k) in projects" :key="k" :value="k">
            {{ p.name }} (Owner: {{ users[p.ownerId]?.name || "Unknown" }})
          </option>
        </select>

        <div v-if="selectedProjectId" class="project-info">
          <h3>Current Project: {{ projects[selectedProjectId]?.name }}</h3>

          <!-- Owner Management (1:N) -->
          <div class="control-group">
            <label>Owner:</label>
            <select
              :value="projects[selectedProjectId]?.ownerId"
              @change="updateOwner($event.target.value)"
            >
              <option v-for="(u, k) in users" :key="k" :value="k">
                {{ u.name }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <!-- 2. Manage Members (M:N) -->
      <section class="panel" :class="{ disabled: !selectedProjectId }">
        <h2>2. Project Members (Many-to-Many)</h2>
        <p class="hint">
          Updates <code>project_members</code> AND
          <code>user_projects</code> atomically.
        </p>

        <div class="members-grid">
          <div
            v-for="(user, uid) in users"
            :key="uid"
            class="member-card"
            :class="{ isMember: isMember(uid) }"
            @click="toggleMember(uid)"
          >
            <div class="checkbox">
              {{ isMember(uid) ? "✅" : "⬜" }}
            </div>
            <div>
              <strong>{{ user.name }}</strong>
              <br /><small>{{ user.email }}</small>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Reassign Tasks (1:N) -->
      <section class="panel" :class="{ disabled: !selectedProjectId }">
        <h2>3. Reassign Tasks</h2>
        <div class="tasks-list">
          <div v-for="(task, tid) in projectTasks" :key="tid" class="task-row">
            <span>{{ task.title }}</span>
            <div class="assign-control">
              <span>Assigned to:</span>
              <select
                :value="task.assigneeId"
                @change="reassignTask(tid, $event.target.value)"
              >
                <option value="">Unassigned</option>
                <option v-for="(u, k) in users" :key="k" :value="k">
                  {{ u.name }}
                </option>
              </select>
            </div>
          </div>
          <div v-if="Object.keys(projectTasks).length === 0" class="empty">
            No tasks in this project
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import {
  ref as dbRef,
  onValue,
  update,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

const { $db } = useNuxtApp();

// State
const users = ref({});
const projects = ref({});
const projectTasks = ref({});
const projectMembers = ref({}); // list of userIds for current project

const selectedProjectId = ref(null);

// Computed
const isMember = (uid) => {
  return !!projectMembers.value[uid];
};

// Data Fetching
onMounted(() => {
  onValue(dbRef($db, "users"), (sn) => (users.value = sn.val() || {}));
  onValue(dbRef($db, "projects"), (sn) => (projects.value = sn.val() || {}));
});

// Watch Project Selection
watch(selectedProjectId, (pid) => {
  projectTasks.value = {};
  projectMembers.value = {};

  if (pid) {
    // 1. Fetch Tasks for Project
    const tasksQuery = query(
      dbRef($db, "tasks"),
      orderByChild("projectId"),
      equalTo(pid),
    );
    onValue(tasksQuery, (sn) => (projectTasks.value = sn.val() || {}));

    // 2. Fetch Members (M:N)
    onValue(dbRef($db, `project_members/${pid}`), (sn) => {
      projectMembers.value = sn.val() || {};
    });
  }
});

// Actions

// 1. Update Owner (Simple 1:N update)
const updateOwner = (newOwnerId) => {
  if (!selectedProjectId.value) return;
  update(dbRef($db, `projects/${selectedProjectId.value}`), {
    ownerId: newOwnerId,
  });
};

// 2. Toggle Member (Complex M:N with Reverse Index)
const toggleMember = async (uid) => {
  if (!selectedProjectId.value) return;

  const pid = selectedProjectId.value;
  const currentlyMember = isMember(uid);
  const newVal = currentlyMember ? null : true; // null deletes the key in Firebase

  // Atomic Multi-path Update
  const updates = {};
  // Forward Index: Project -> Users
  updates[`project_members/${pid}/${uid}`] = newVal;
  // Reverse Index: User -> Projects
  updates[`user_projects/${uid}/${pid}`] = newVal;

  try {
    await update(dbRef($db), updates);
  } catch (e) {
    alert("Error updating members: " + e.message);
  }
};

// 3. Reassign Task
const reassignTask = (tid, newAssigneeId) => {
  update(dbRef($db, `tasks/${tid}`), {
    assigneeId: newAssigneeId,
  });
};
</script>

<style scoped>
.relations-page {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
  font-family: sans-serif;
}
.description {
  background: #e3f2fd;
  color: #0d47a1;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 30px;
  line-height: 1.6;
}
.container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
.panel {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: opacity 0.3s;
}
.panel.disabled {
  opacity: 0.5;
  pointer-events: none;
}
h2 {
  margin-top: 0;
  color: #333;
}
h3 {
  color: #555;
}
.hint {
  color: #666;
  font-size: 0.9em;
  font-style: italic;
}

.project-select {
  width: 100%;
  padding: 10px;
  font-size: 1.1em;
  margin-bottom: 10px;
  border: 2px solid #007bff;
  border-radius: 5px;
}

.control-group {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.control-group select {
  padding: 5px;
  font-size: 1em;
}

/* Members Grid */
.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 15px;
}
.member-card {
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s;
}
.member-card:hover {
  background: #f9f9f9;
}
.member-card.isMember {
  background: #e8f5e9;
  border-color: #c8e6c9;
}
.checkbox {
  font-size: 1.2em;
}

/* Tasks List */
.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.task-row:last-child {
  border-bottom: none;
}
.assign-control {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9em;
  color: #666;
}
.assign-control select {
  padding: 4px;
}
.empty {
  color: #999;
  padding: 10px;
  font-style: italic;
}
</style>
