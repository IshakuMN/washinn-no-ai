<template>
  <div class="crud-page">
    <h1>CRUD & Optimizations</h1>

    <div class="grid">
      <!-- Clients -->
      <div class="col">
        <h2>Clients</h2>
        <form @submit.prevent="addClient">
          <input v-model="newClient.name" placeholder="Name" required />
          <button type="submit">Add</button>
        </form>
        <ul>
          <li v-for="(client, key) in clients" :key="key">
            <div
              @click="selectClient(key, client)"
              class="clickable"
              :class="{ selected: selectedClientId === key }"
            >
              {{ client.name }}
            </div>
            <button class="sm-btn" @click.stop="deleteItem('clients', key)">
              🗑
            </button>
          </li>
        </ul>
      </div>

      <!-- Services -->
      <div class="col">
        <h2>Services</h2>
        <form @submit.prevent="addService">
          <input
            v-model="newService.name"
            placeholder="Service Name"
            required
          />
          <input
            v-model.number="newService.price"
            placeholder="Price"
            required
            type="number"
          />
          <button type="submit">Add</button>
        </form>
        <ul>
          <li v-for="(service, key) in services" :key="key">
            <div>{{ service.name }} (${{ service.price }})</div>
            <button class="sm-btn" @click="deleteItem('services', key)">
              🗑
            </button>
          </li>
        </ul>
      </div>

      <!-- Orders (Optimized) -->
      <div class="col">
        <h2>
          Orders
          {{
            selectedClient ? `for ${selectedClient.name}` : "(Select Client)"
          }}
        </h2>
        <div v-if="selectedClientId">
          <form @submit.prevent="addOrder">
            <select v-model="newOrder.serviceId" required>
              <option value="" disabled>Select Service</option>
              <option v-for="(s, k) in services" :key="k" :value="k">
                {{ s.name }}
              </option>
            </select>
            <button type="submit">Add Order</button>
          </form>
          <ul>
            <li v-for="(order, key) in clientOrders" :key="key">
              <div>
                Order:
                {{ services[order.serviceId]?.name || "Unknown Service" }}
              </div>
              <button class="sm-btn" @click="deleteItem('orders', key)">
                🗑
              </button>
            </li>
          </ul>
        </div>
        <div v-else class="info">
          <p>Please select a client to view orders.</p>
          <small
            >Optimization: Orders are indexed by clientId and fetched only when
            needed.</small
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import {
  ref as dbRef,
  onValue,
  push,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

const { $db } = useNuxtApp();

// State
const clients = ref({});
const services = ref({});
const clientOrders = ref({});
const selectedClientId = ref(null);
const selectedClient = ref(null);

const newClient = ref({ name: "" });
const newService = ref({ name: "", price: "" });
const newOrder = ref({ serviceId: "" });

// Live Bindings
onMounted(() => {
  // 1. Fetch Clients
  onValue(dbRef($db, "clients"), (snapshot) => {
    clients.value = snapshot.val() || {};
  });

  // 2. Fetch Services
  onValue(dbRef($db, "services"), (snapshot) => {
    services.value = snapshot.val() || {};
  });
});

// Watch selection to fetch orders (Optimization: Query on demand)
watch(selectedClientId, (newId) => {
  if (newId) {
    const ordersQuery = query(
      dbRef($db, "orders"),
      orderByChild("clientId"),
      equalTo(newId),
    );
    onValue(ordersQuery, (snapshot) => {
      clientOrders.value = snapshot.val() || {};
    });
  } else {
    clientOrders.value = {};
  }
});

// Actions
const addClient = () => {
  push(dbRef($db, "clients"), newClient.value);
  newClient.value.name = "";
};

const addService = () => {
  push(dbRef($db, "services"), newService.value);
  newService.value = { name: "", price: "" };
};

const addOrder = () => {
  if (!selectedClientId.value) return;
  push(dbRef($db, "orders"), {
    clientId: selectedClientId.value,
    serviceId: newOrder.value.serviceId,
    timestamp: Date.now(),
  });
};

const deleteItem = (coll, key) => {
  remove(dbRef($db, `${coll}/${key}`));
};

const selectClient = (key, client) => {
  selectedClientId.value = key;
  selectedClient.value = client;
};
</script>

<style scoped>
.crud-page {
  padding: 20px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
.col {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  background: #f9f9f9;
}
h2 {
  margin-top: 0;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  margin-bottom: 5px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.clickable {
  cursor: pointer;
  flex: 1;
}
.selected {
  font-weight: bold;
  color: #2c3e50;
  border-left: 3px solid #42b983;
  padding-left: 5px;
}
.sm-btn {
  background: #ff4d4d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  margin-left: 10px;
}
form {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
input,
select {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
button[type="submit"] {
  background: #42b983;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.info {
  color: #666;
  font-style: italic;
}
</style>
