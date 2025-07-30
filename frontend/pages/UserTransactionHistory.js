Vue.component('user-transaction-history', {
  template: `
    <div>
      <user-navbar></user-navbar>
      <div class="container mt-5">
        <!-- Wallet Balance Card -->
        <div class="wallet-card">
          <div>
            <span class="balance-label">Wallet Balance:</span>
            <span class="balance-amount">₹{{ walletBalance.toFixed(2) }}</span>
          </div>
          <button class="btn btn-topup" @click="showTopupModal = true">Topup</button>
        </div>
        <!-- Heading and Export Button -->
        <div class="heading-row">
          <h2>Transaction History</h2>
          <button class="btn btn-export" @click="exportHistory">Export Data</button>
        </div>
        <!-- Toggle Buttons -->
        <div class="mb-3 d-flex justify-content-center gap-2">
          <button 
            class="btn"
            :class="toggleType === 'topup' ? 'btn-primary' : 'btn-outline-primary'"
            @click="toggleType = 'topup'">
            Topup History
          </button>
          <button 
            class="btn"
            :class="toggleType === 'booking' ? 'btn-primary' : 'btn-outline-primary'"
            @click="toggleType = 'booking'">
            Booking Expense History
          </button>
        </div>
        <!-- Loading Spinner -->
        <div v-if="loading" class="text-center my-4">
          <div class="spinner-border" role="status"></div>
        </div>
        <!-- Topup Table -->
        <div v-else>
          <table class="table table-bordered table-scroll" v-if="toggleType === 'topup'">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Bank Name</th>
                <th>Account No</th>
                <th>Holder Name</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(txn, idx) in topupHistory" :key="txn.id">
                <td>{{ idx + 1 }}</td>
                <td>{{ formatDate(txn.timestamp) }}</td>
                <td>₹{{ txn.amount }}</td>
                <td>{{ txn.from_bank?.bank_name }}</td>
                <td>{{ txn.from_bank?.account_no }}</td>
                <td>{{ txn.from_bank?.holder_name }}</td>
              </tr>
              <tr v-if="topupHistory.length === 0">
                <td colspan="6" class="text-center">No topup transactions found.</td>
              </tr>
            </tbody>
          </table>
          <!-- Booking Expense Table -->
          <table class="table table-bordered table-scroll" v-else>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Prime Location</th>
                <th>City</th>
                <th>Type</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(txn, idx) in bookingHistory" :key="txn.id">
                <td>{{ idx + 1 }}</td>
                <td>{{ formatDateOnly(txn.timestamp) }}</td>
                <td>{{ formatTimeOnly(txn.timestamp) }}</td>
                <td>₹{{ txn.amount }}</td>
                <td>{{ txn.lot_name || '-' }}</td>
                <td>{{ txn.city || '-' }}</td>
                <td>{{ txn.type }}</td>
                <td>
                  <button class="btn btn-sm btn-info" @click="viewReservation(txn)">View</button>
                </td>
              </tr>
              <tr v-if="bookingHistory.length === 0">
                <td colspan="8" class="text-center">No booking expense transactions found.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Reservation Details Modal -->
        <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Reservation Details</h5>
                <button type="button" class="btn-close" @click="showModal = false"></button>
              </div>
              <div class="modal-body" v-if="modalReservation">
                <p><b>Prime Location:</b> {{ modalReservation.lot_name }}</p>
                <p><b>City:</b> {{ modalReservation.city }}</p>
                <p><b>Slot Number:</b> {{ modalReservation.slot_number }}</p>
                <p><b>Vehicle No:</b> {{ modalReservation.vehicle_no }}</p>
                <p><b>Vehicle Type:</b> {{ modalReservation.vehicle_type }}</p>
                <p><b>Booked At:</b> {{ formatDate(modalReservation.booking_time) }}</p>
                <p><b>Duration:</b> {{ modalReservation.duration_hours }} hours</p>
                <p><b>Release Time:</b> {{ formatDate(modalReservation.release_time) }}</p>
                <p><b>Cost:</b> ₹{{ modalReservation.parking_cost }}</p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="showModal = false">Close</button>
              </div>
            </div>
          </div>
        </div>
        <!-- Topup Modal -->
        <div v-if="showTopupModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Topup Wallet</h5>
                <button type="button" class="btn-close" @click="showTopupModal = false"></button>
              </div>
              <div class="modal-body">
                <form @submit.prevent="topupWallet">
                  <div class="mb-2">
                    <label>Account Number</label>
                    <input v-model="topupForm.account_no" class="form-control" required>
                  </div>
                  <div class="mb-2">
                    <label>Bank Name</label>
                    <input v-model="topupForm.bank_name" class="form-control" required>
                  </div>
                  <div class="mb-2">
                    <label>Holder Name</label>
                    <input v-model="topupForm.holder_name" class="form-control" required>
                  </div>
                  <div class="mb-2">
                    <label>Amount</label>
                    <input v-model.number="topupForm.amount" type="number" min="1" class="form-control" required>
                  </div>
                  <button class="btn btn-success me-2" type="submit">Topup</button>
                  <button class="btn btn-secondary" @click="showTopupModal = false">Cancel</button>
                </form>
              </div>
            </div>
          </div>
        </div>
        <!-- Example Google Button (if needed) -->
        <!-- <button class="btn-google"><img src="google-icon.svg" alt="Google" width="20"> Sign in with Google</button> -->
      </div>
    </div>
  `,
  data() {
    return {
      transactions: [],
      reservations: [],
      loading: true,
      toggleType: 'topup',
      showModal: false,
      modalReservation: null,
      walletBalance: 0,
      showTopupModal: false,
      topupForm: {
        account_no: '',
        bank_name: '',
        holder_name: '',
        amount: ''
      }
    }
  },
  computed: {
    topupHistory() {
      return this.transactions.filter(txn => txn.type === 'Topup');
    },
    bookingHistory() {
      return this.transactions
        .filter(txn => txn.type === 'Paid')
        .map(txn => {
          const res = this.reservations.find(r => r.id === txn.reservation_id) || {};
          return {
            ...txn,
            lot_name: res.lot_name,
            city: res.city,
            slot_number: res.slot_number,
            vehicle_no: res.vehicle_no,
            vehicle_type: res.vehicle_type,
            booking_time: res.booking_time,
            duration_hours: res.duration_hours,
            release_time: res.release_time,
            parking_cost: res.parking_cost
          };
        });
    }
  },
  methods: {
    async fetchTransactions() {
      this.loading = true;
      const token = localStorage.getItem('auth_token');
      const [txnRes, resRes, walletRes] = await Promise.all([
        fetch('/api/user/wallet/transactions', {
          headers: { 'Authentication-Token': token }
        }),
        fetch('/api/parking/history', {
          headers: { 'Authentication-Token': token }
        }),
        fetch('/api/user/profile/me', {
          headers: { 'Authentication-Token': token }
        })
      ]);
      if (txnRes.ok) {
        this.transactions = await txnRes.json();
      }
      if (resRes.ok) {
        this.reservations = await resRes.json();
      }
      if (walletRes.ok) {
        const data = await walletRes.json();
        this.walletBalance = data.wallet_balance || 0;
      }
      this.loading = false;
    },
    async topupWallet() {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authentication-Token': token
        },
        body: JSON.stringify(this.topupForm)
      });
      if (res.ok) {
        this.showTopupModal = false;
        this.topupForm = { account_no: '', bank_name: '', holder_name: '', amount: '' };
        await this.fetchTransactions();
      }
    },
    formatDate(dt) {
      if (!dt) return '';
      return new Date(dt).toLocaleString();
    },
    formatDateOnly(dt) {
      if (!dt) return '';
      const d = new Date(dt);
      return d.toLocaleDateString();
    },
    formatTimeOnly(dt) {
      if (!dt) return '';
      const d = new Date(dt);
      return d.toLocaleTimeString();
    },
    viewReservation(txn) {
      this.modalReservation = this.reservations.find(r => r.id === txn.reservation_id);
      this.showModal = true;
    },
    exportHistory() {
      let csv = '';
      if (this.toggleType === 'topup') {
        csv += 'Date,Amount,Bank Name,Account No,Holder Name\n';
        this.topupHistory.forEach(txn => {
          csv += `"${this.formatDate(txn.timestamp)}","${txn.amount}","${txn.from_bank?.bank_name}","${txn.from_bank?.account_no}","${txn.from_bank?.holder_name}"\n`;
        });
      } else {
        csv += 'Date,Time,Amount,Prime Location,City,Type\n';
        this.bookingHistory.forEach(txn => {
          csv += `"${this.formatDateOnly(txn.timestamp)}","${this.formatTimeOnly(txn.timestamp)}","${txn.amount}","${txn.lot_name || '-'}","${txn.city || '-'}","${txn.type}"\n`;
        });
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transaction_history.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Export done!');
    }
  },
  mounted() {
    this.fetchTransactions();
  }
});