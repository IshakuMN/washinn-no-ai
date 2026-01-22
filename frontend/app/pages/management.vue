<template>
  <div class="crud-page">
    <h1>Project Management (Full CRUD)</h1>
    <p class="description">
      Hierarchical Structure: Users → Projects (by Owner) → Tasks (by Project).
      <br />
      Optimized with indexes to avoid deep reads.
    </p>

    <div class="grid">
      <!-- 1. Users Collection -->
      <section class="col">
        <div class="header">
          <h2>Users</h2>
          <button @click="openModal('user')" class="add-btn" title="Add User">
            +
          </button>
        </div>

        <div class="list">
          <div
            v-for="(user, key) in users"
            :key="key"
            class="item"
            :class="{ active: selectedUserId === key }"
            @click="selectUser(key, user)"
          >
            <div class="content">
              <strong>{{ user.name }}</strong>
              <small>{{ user.email }}</small>
            </div>
            <div class="actions">
              <button @click.stop="editItem('user', key, user)">✎</button>
              <button @click.stop="deleteItem('users', key)" class="del">
                ×
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Projects Collection (Filtered by User) -->
      <section class="col" :class="{ disabled: !selectedUserId }">
        <div class="header">
          <h2>Projects</h2>
          <button
            v-if="selectedUserId"
            @click="openModal('project')"
            class="add-btn"
            title="Add Project"
          >
            +
          </button>
        </div>

        <div v-if="!selectedUserId" class="empty-state">
          Select a User first
        </div>
        <div v-else class="list">
          <div
            v-for="(project, key) in userProjects"
            :key="key"
            class="item"
            :class="{ active: selectedProjectId === key }"
            @click="selectProject(key, project)"
          >
            <div class="content">
              <strong>{{ project.name }}</strong>
            </div>
            <div class="actions">
              <button @click.stop="editItem('project', key, project)">✎</button>
              <button @click.stop="deleteItem('projects', key)" class="del">
                ×
              </button>
            </div>
          </div>
          <div
            v-if="Object.keys(userProjects).length === 0"
            class="empty-state"
          >
            No projects for {{ users[selectedUserId]?.name }}
          </div>
        </div>
      </section>

      <!-- 3. Tasks Collection (Filtered by Project) -->
      <section class="col" :class="{ disabled: !selectedProjectId }">
        <div class="header">
          <h2>Tasks</h2>
          <button
            v-if="selectedProjectId"
            @click="openModal('task')"
            class="add-btn"
            title="Add Task"
          >
            +
          </button>
        </div>

        <div v-if="!selectedProjectId" class="empty-state">
          Select a Project first
        </div>
        <div v-else class="list">
          <div
            v-for="(task, key) in projectTasks"
            :key="key"
            class="item task-item"
          >
            <div class="content">
              <strong>{{ task.title }}</strong>
              <small v-if="task.assigneeId"
                >Assigned to:
                {{ users[task.assigneeId]?.name || "Unknown" }}</small
              >
            </div>
            <div class="actions">
              <button @click.stop="editItem('task', key, task)">✎</button>
              <button @click.stop="deleteItem('tasks', key)" class="del">
                ×
              </button>
            </div>
          </div>
          <div
            v-if="Object.keys(projectTasks).length === 0"
            class="empty-state"
          >
            No tasks in this project
          </div>
        </div>
      </section>
    </div>

    <!-- Generic Modal for Create/Edit -->
    <div v-if="modal.isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ modal.isEdit ? "Edit" : "New" }} {{ modal.type }}</h3>
        <form @submit.prevent="handleSubmit">
          <!-- User Fields -->
          <template v-if="modal.type === 'user'">
            <div class="form-group">
              <label>Name</label>
              <input
                v-model="form.name"
                placeholder="John Doe"
                required
                autofocus
              />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="john@example.com"
                required
              />
            </div>
          </template>

          <!-- Project Fields -->
          <template v-if="modal.type === 'project'">
            <div class="form-group">
              <label>Project Name</label>
              <input
                v-model="form.name"
                placeholder="My Awesome Project"
                required
                autofocus
              />
            </div>
            <div class="info">
              Owner: <strong>{{ users[selectedUserId]?.name }}</strong>
            </div>
          </template>

          <!-- Task Fields -->
          <template v-if="modal.type === 'task'">
            <div class="form-group">
              <label>Task Title</label>
              <input
                v-model="form.title"
                placeholder="Fix bug #123"
                required
                autofocus
              />
            </div>
            <div class="form-group">
              <label>Assignee</label>
              <select v-model="form.assigneeId">
                <option value="" disabled>Select User</option>
                <option v-for="(u, k) in users" :key="k" :value="k">
                  {{ u.name }}
                </option>
              </select>
            </div>
            <div class="info">
              Project:
              <strong>{{ userProjects[selectedProjectId]?.name }}</strong>
            </div>
          </template>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-cancel">
              Cancel
            </button>
            <button type="submit" class="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import {
  ref as dbRef,
  onValue,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

const { $db } = useNuxtApp();

// --- State ---
const users = ref({});
const userProjects = ref({});
const projectTasks = ref({});

const selectedUserId = ref(null);
const selectedProjectId = ref(null);

// Modal & Form State
const modal = reactive({
  isOpen: false,
  type: "", // 'user', 'project', 'task'
  isEdit: false,
  editId: null,
});

const form = reactive({
  name: "",
  email: "",
  title: "",
  assigneeId: "",
});

// --- Data Fetching ---

// 1. Fetch Users (All)
onMounted(() => {
  onValue(dbRef($db, "users"), (snapshot) => {
    users.value = snapshot.val() || {};
  });
});

// 2. Optimized: Fetch Projects only for selected User
watch(selectedUserId, (newId) => {
  selectedProjectId.value = null; // Reset child selection when parent changes
  projectTasks.value = {};

  if (newId) {
    const projectsQuery = query(
      dbRef($db, "projects"),
      orderByChild("ownerId"),
      equalTo(newId),
    );
    onValue(projectsQuery, (snapshot) => {
      userProjects.value = snapshot.val() || {};
    });
  } else {
    userProjects.value = {};
  }
});

// 3. Optimized: Fetch Tasks only for selected Project
watch(selectedProjectId, (newId) => {
  if (newId) {
    const tasksQuery = query(
      dbRef($db, "tasks"),
      orderByChild("projectId"),
      equalTo(newId),
    );
    onValue(tasksQuery, (snapshot) => {
      projectTasks.value = snapshot.val() || {};
    });
  } else {
    projectTasks.value = {};
  }
});

// --- Interaction Logic ---

const selectUser = (key, user) => {
  selectedUserId.value = key;
};

const selectProject = (key, project) => {
  selectedProjectId.value = key;
};

const openModal = (type) => {
  modal.type = type;
  modal.isEdit = false;
  modal.editId = null;
  resetForm();
  modal.isOpen = true;
};

const editItem = (type, key, data) => {
  modal.type = type;
  modal.isEdit = true;
  modal.editId = key;
  resetForm();

  // Pre-fill form
  if (type === "user") {
    form.name = data.name;
    form.email = data.email;
  } else if (type === "project") {
    form.name = data.name;
  } else if (type === "task") {
    form.title = data.title;
    form.assigneeId = data.assigneeId || "";
  }

  modal.isOpen = true;
};

const closeModal = () => {
  modal.isOpen = false;
};

const resetForm = () => {
  form.name = "";
  form.email = "";
  form.title = "";
  form.assigneeId = "";
};

const handleSubmit = async () => {
  const { type, isEdit, editId } = modal;
  const path = `${type}s`; // users, projects, tasks

  let payload = {};

  if (type === "user") {
    payload = { name: form.name, email: form.email };
  } else if (type === "project") {
    payload = { name: form.name };
    if (!isEdit) payload.ownerId = selectedUserId.value;
  } else if (type === "task") {
    payload = { title: form.title, assigneeId: form.assigneeId };
    if (!isEdit) payload.projectId = selectedProjectId.value;
  }

  try {
    if (isEdit) {
      // Update
      await update(dbRef($db, `${path}/${editId}`), payload);
    } else {
      // Create
      await push(dbRef($db, path), payload);
    }
    closeModal();
  } catch (e) {
    alert("Error saving: " + e.message);
    console.error(e);
  }
};

const deleteItem = async (collection, key) => {
  if (!confirm("Are you sure you want to delete this item?")) return;
  try {
    await remove(dbRef($db, `${collection}/${key}`));
  } catch (e) {
    alert("Error deleting: " + e.message);
  }
};
</script>

<style scoped>
.crud-page {
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}
.description {
  color: #5f6368;
  margin-bottom: 24px;
  line-height: 1.5;
  background: #fffde7;
  padding: 10px;
  border-left: 4px solid #fbc02d;
  border-radius: 4px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  height: calc(100vh - 200px); /* Fill screen */
  min-height: 500px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
    height: auto;
  }
  .col {
    height: 400px;
  }
}

.col {
  border: 1px solid #dadce0;
  border-radius: 12px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.col.disabled {
  opacity: 0.6;
  filter: grayscale(0.8);
  pointer-events: none;
  background: #f1f3f4;
}

.header {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #dadce0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
}

h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #202124;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-btn {
  background: #1a73e8;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background 0.2s;
  box-shadow: 0 2px 4px rgba(26, 115, 232, 0.3);
}
.add-btn:hover {
  background: #1557b0;
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.item {
  background: white;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.1);
  cursor: pointer;
  border: 2px solid transparent;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.2s;
}

.item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(60, 64, 67, 0.15);
}
.item.active {
  border-color: #1a73e8;
  background: #e8f0fe;
}

.content {
  flex: 1;
  min-width: 0;
}
.content strong {
  display: block;
  color: #3c4043;
  font-size: 0.95rem;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.content small {
  color: #5f6368;
  font-size: 0.85rem;
  display: block;
}

.actions {
  display: flex;
  gap: 8px;
  margin-left: 12px;
}
.actions button {
  width: 28px;
  height: 28px;
  border: 1px solid #dadce0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #5f6368;
  transition: all 0.2s;
}
.actions button:hover {
  background: #f1f3f4;
  color: #202124;
}
.actions button.del:hover {
  background: #fce8e6;
  color: #d93025;
  border-color: #f1998e;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #80868b;
  font-style: italic;
  font-size: 0.9rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(32, 33, 36, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
.modal {
  background: white;
  padding: 32px;
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  transform: translateY(0);
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5rem;
  color: #202124;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #3c4043;
}
.modal input,
.modal select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.modal input:focus,
.modal select:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.info {
  margin-top: 10px;
  padding: 10px;
  background: #e8f0fe;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1967d2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.btn-cancel,
.btn-primary {
  padding: 10px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-cancel {
  background: transparent;
  border: 1px solid transparent;
  color: #5f6368;
}
.btn-cancel:hover {
  background: #f1f3f4;
  color: #202124;
}
.btn-primary {
  background: #1a73e8;
  color: white;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.btn-primary:hover {
  background: #1557b0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
</style>
