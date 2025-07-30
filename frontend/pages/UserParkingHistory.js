Vue.component('user-parking-history', {
  template: `
    <div>
      <user-navbar></user-navbar>
      <div class="container mt-5">
        <div class="row align-items-center mb-4">
          <!-- Left: Search Bar -->
          <div class="col-md-4">
            <input v-model="searchText" class="form-control" placeholder="Search by Lot, Vehicle No, or Status">
          </div>
          <!-- Center: Heading -->
          <div class="col-md-4 text-center">
            <h2 class="mb-0">Parking History</h2>
          </div>
          <!-- Right: Export Button -->
          <div class="col-md-4 text-end">
            <button class="btn btn-success btn-export" @click="exportHistory">Export Data</button>
          </div>
        </div>
        <div v-if="filteredHistory.length > 0">
          <table class="table table-bordered table-scroll mt-4">
            <thead>
              <tr>
                <th>#</th>
                <th>Lot</th>
                <th>Slot</th>
                <th>Vehicle No</th>
                <th>Booked At</th>
                <th>Duration (hrs)</th>
                <th>Cost</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in filteredHistory" :key="item.id">
                <td>{{ idx + 1 }}</td>
                <td>{{ item.lot_name || item.lot_id }}</td>
                <td>{{ item.slot_number || item.spot_id }}</td>
                <td>{{ item.vehicle_no }}</td>
                <td>{{ new Date(item.booking_time).toLocaleString() }}</td>
                <td>{{ item.duration_hours }}</td>
                <td>{{ item.parking_cost }}</td>
                <td>
                  <button
                    v-if="isBookingActive(item) && item.status === 'Reserved'"
                    class="btn btn-warning btn-sm"
                    @click="updateStatus(item, 'Occupied')"
                  >Parked</button>
                  <button
                    v-if="isBookingActive(item) && item.status === 'Occupied'"
                    class="btn btn-success btn-sm"
                    @click="updateStatus(item, 'Completed')"
                  >Complete</button>
                  <button
                    v-if="showPenaltyButton(item)"
                    class="btn btn-danger btn-sm"
                    @click="applyPenalty(item)"
                  >Penalty</button>
                  <span v-if="item.status === 'Completed'" class="badge bg-success">Completed</span>
                  <span v-if="item.status === 'Unattend'" class="badge bg-danger">Unattend</span>
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
                <p><b>Lot:</b> {{ selected.lot_name }}</p>
                <p><b>Slot:</b> {{ selected.slot_number }}</p>
                <p><b>Vehicle No:</b> {{ selected.vehicle_no }}</p>
                <p><b>Vehicle Type:</b> {{ selected.vehicle_type }}</p>
                <p><b>Booked At:</b> {{ new Date(selected.booking_time).toLocaleString() }}</p>
                <p><b>Duration (hrs):</b> {{ selected.duration_hours }}</p>
                <p><b>Release Time:</b> {{ new Date(selected.release_time).toLocaleString() }}</p>
                <p><b>Cost:</b> {{ selected.parking_cost }}</p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="showModal = false">Close</button>
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
      searchText: ''
    }
  },
  computed: {
    filteredHistory() {
      if (!this.searchText) return this.history;
      const txt = this.searchText.toLowerCase();
      return this.history.filter(item =>
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
    showPenaltyButton(item) {
      const now = new Date();
      const end = new Date(item.release_time);
      return item.status === 'Occupied' && now > end;
    },
    async applyPenalty(item) {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/parking/apply-penalty/${item.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authentication-Token': token
        }
      });
      if (res.ok) {
        item.status = 'Completed';
        alert('Penalty applied and status updated.');
        this.fetchHistory();
      } else {
        alert('Failed to apply penalty.');
      }
    },
    exportHistory() {
      if (!this.history.length) {
        alert('No data to export.');
        return;
      }
      const header = [
        'Lot', 'Slot', 'Vehicle No', 'Vehicle Type', 'Booked At', 'Duration (hrs)', 'Release Time', 'Cost', 'Status'
      ];
      const rows = this.history.map(item => [
        item.lot_name || item.lot_id,
        item.slot_number || item.spot_id,
        item.vehicle_no,
        item.vehicle_type,
        new Date(item.booking_time).toLocaleString(),
        item.duration_hours,
        new Date(item.release_time).toLocaleString(),
        item.parking_cost,
        item.status
      ]);
      const csvContent = [header, ...rows]
        .map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parking_history.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Export done!');
    },
    isBookingActive(item) {
      const now = new Date();
      const start = new Date(item.booking_time);
      const end = new Date(item.release_time);
      return now >= start && now <= end;
    },
    async updateStatus(item, status) {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/parking/update-status/${item.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authentication-Token': token
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        item.status = status;
      }
    },
    async fetchHistory() {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/parking/history', {
        headers: { 'Authentication-Token': token }
      });
      if (res.ok) {
        this.history = await res.json();
      }
    },
    viewDetails(item) {
      this.selected = item;
      this.showModal = true;
    }
  },
  mounted() {
    this.fetchHistory();
  }
});