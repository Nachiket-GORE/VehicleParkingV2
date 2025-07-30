Vue.component('admin-parking-history', {
  template: `
    <div>
      <admin-navbar></admin-navbar>
      <div class="container mt-5">
        <div class="row align-items-center mb-4">
          <!-- Left: Search Bar -->
          <div class="col-md-4">
            <input v-model="searchText" class="form-control" placeholder="Search by User, Lot, Vehicle No, Status, etc">
          </div>
          <!-- Center: Heading -->
          <div class="col-md-4 text-center">
            <h2 class="mb-0">All Parking Bookings</h2>
          </div>
          <!-- Right: Export Button -->
          <div class="col-md-4 text-end">
            <button class="btn btn-success btn-export" @click="exportHistory">Export</button>
          </div>
        </div>
        <div v-if="filteredHistory.length > 0">
          <table class="table table-bordered table-scroll mt-4">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Lot</th>
                <th>Slot</th>
                <th>Vehicle No</th>
                <th>Booked At</th>
                <th>Duration (hrs)</th>
                <th>Cost</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in filteredHistory" :key="item.id">
                <td>{{ idx + 1 }}</td>
                <td>{{ item.owner_name }}</td>
                <td>{{ item.lot_name || item.lot_id }}</td>
                <td>{{ item.slot_number || item.spot_id }}</td>
                <td>{{ item.vehicle_no }}</td>
                <td>{{ new Date(item.booking_time).toLocaleString() }}</td>
                <td>{{ item.duration_hours }}</td>
                <td>{{ item.parking_cost }}</td>
                <td>
                  <span v-if="item.status === 'Completed'" class="badge bg-success">Completed</span>
                  <span v-else-if="item.status === 'Occupied'" class="badge bg-warning">Occupied</span>
                  <span v-else-if="item.status === 'Reserved'" class="badge bg-info">Reserved</span>
                  <span v-else-if="item.status === 'Unattend'" class="badge bg-danger">Unattend</span>
                  <span v-else>{{ item.status }}</span>
                </td>
                <td>
                  <button class="btn btn-sm btn-info" @click="viewDetails(item)">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="mt-4">
          No parking history found.
        </div>
        <!-- Booking Details Modal -->
        <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Booking Details</h5>
                <button type="button" class="btn-close" @click="showModal = false"></button>
              </div>
              <div class="modal-body">
                <p><b>User:</b> {{ selected.owner_name }}</p>
                <p><b>Email:</b> {{ selected.owner_email }}</p>
                <p><b>Lot:</b> {{ selected.lot_name }}</p>
                <p><b>Slot:</b> {{ selected.slot_number }}</p>
                <p><b>Vehicle No:</b> {{ selected.vehicle_no }}</p>
                <p><b>Vehicle Type:</b> {{ selected.vehicle_type }}</p>
                <p><b>Booked At:</b> {{ new Date(selected.booking_time).toLocaleString() }}</p>
                <p><b>Duration (hrs):</b> {{ selected.duration_hours }}</p>
                <p><b>Release Time:</b> {{ new Date(selected.release_time).toLocaleString() }}</p>
                <p><b>Cost:</b> {{ selected.parking_cost }}</p>
                <p><b>Status:</b> {{ selected.status }}</p>
                <button class="btn btn-primary mt-2" @click="viewUserProfile(selected.owner_email)">View User Profile</button>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="showModal = false">Close</button>
              </div>
            </div>
          </div>
        </div>
        <!-- User Profile Modal -->
        <div v-if="showProfileModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">User Profile</h5>
                <button type="button" class="btn-close" @click="showProfileModal = false"></button>
              </div>
              <div class="modal-body" v-if="profile">
                <div v-if="profile.user_profile">
                  <img :src="profile.user_profile" alt="User Photo" class="img-thumbnail mb-2" style="max-width:150px;">
                </div>
                <p><b>Name:</b> {{ profile.full_name }}</p>
                <p><b>Email:</b> {{ profile.email }}</p>
                <p><b>Country:</b> {{ profile.country }}</p>
                <p><b>City:</b> {{ profile.city }}</p>
                <p><b>Address:</b> {{ profile.address }}</p>
                <p><b>Pincode:</b> {{ profile.pincode }}</p>
                <p><b>Account Created:</b> {{ new Date(profile.date_of_Account_creation).toLocaleDateString() }}</p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="showProfileModal = false">Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      history: [],
      showModal: false,
      selected: {},
      showProfileModal: false,
      profile: null,
      searchText: ''
    }
  },
  computed: {
    filteredHistory() {
      if (!this.searchText) return this.history;
      const txt = this.searchText.toLowerCase();
      return this.history.filter(item =>
        (item.owner_name && item.owner_name.toLowerCase().includes(txt)) ||
        (item.owner_email && item.owner_email.toLowerCase().includes(txt)) ||
        (item.lot_name && item.lot_name.toLowerCase().includes(txt)) ||
        (item.lot_id && String(item.lot_id).toLowerCase().includes(txt)) ||
        (item.slot_number && String(item.slot_number).toLowerCase().includes(txt)) ||
        (item.spot_id && String(item.spot_id).toLowerCase().includes(txt)) ||
        (item.vehicle_no && item.vehicle_no.toLowerCase().includes(txt)) ||
        (item.vehicle_type && item.vehicle_type.toLowerCase().includes(txt)) ||
        (item.status && item.status.toLowerCase().includes(txt)) ||
        (item.booking_time && new Date(item.booking_time).toLocaleString().toLowerCase().includes(txt)) ||
        (item.release_time && new Date(item.release_time).toLocaleString().toLowerCase().includes(txt)) ||
        (item.duration_hours && String(item.duration_hours).toLowerCase().includes(txt)) ||
        (item.parking_cost && String(item.parking_cost).toLowerCase().includes(txt))
      );
    }
  },
  methods: {
    async fetchHistory() {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/admin/parking/history', {
        headers: { 'Authentication-Token': token }
      });
      if (res.ok) {
        this.history = await res.json();
      }
    },
    viewDetails(item) {
      this.selected = item;
      this.showModal = true;
    },
    async viewUserProfile(email) {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`, {
        headers: { 'Authentication-Token': token }
      });
      if (res.ok) {
        this.profile = await res.json();
        this.showProfileModal = true;
      }
    },
    exportHistory() {
      let csv = 'User,Email,Lot,Slot,Vehicle No,Vehicle Type,Booked At,Duration (hrs),Release Time,Cost,Status\n';
      this.filteredHistory.forEach(item => {
        csv += `"${item.owner_name}","${item.owner_email}","${item.lot_name || item.lot_id}","${item.slot_number || item.spot_id}","${item.vehicle_no}","${item.vehicle_type}","${new Date(item.booking_time).toLocaleString()}","${item.duration_hours}","${new Date(item.release_time).toLocaleString()}","${item.parking_cost}","${item.status}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'parking_history.csv';
      link.click();
    }
  },
  mounted() {
    this.fetchHistory();
  }
});