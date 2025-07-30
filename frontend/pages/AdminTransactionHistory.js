Vue.component('admin-transaction-history', {
  template: `
    <div>
      <admin-navbar></admin-navbar>
      <div class="container mt-5">
        <!-- Wallet Info Card and Withdraw Button -->
        <div class="wallet-card">
          <div>
            <span class="balance-label">Admin Wallet Balance:</span>
            <span class="balance-amount">₹{{ walletBalance.toFixed(2) }}</span>
          </div>
          <button class="btn btn-topup" @click="showWithdrawModal = true">Withdraw</button>
        </div>
        <!-- Heading and Export Button -->
        <div class="heading-row">
          <h2>Admin Transaction History</h2>
          <button class="btn btn-export" @click="exportHistory">Export Data</button>
        </div>
        <!-- Toggle Buttons -->
        <div class="mb-3 d-flex justify-content-center gap-2">
          <button 
            class="btn"
            :class="toggleType === 'withdrawal' ? 'btn-primary' : 'btn-outline-primary'"
            @click="toggleType = 'withdrawal'">
            Withdrawal History
          </button>
          <button 
            class="btn"
            :class="toggleType === 'booking' ? 'btn-primary' : 'btn-outline-primary'"
            @click="toggleType = 'booking'">
            Customer Transactions
          </button>
        </div>
        <!-- Loading Spinner -->
        <div v-if="loading" class="text-center my-4">
          <div class="spinner-border" role="status"></div>
        </div>
        <div v-else>
          <!-- Withdrawal Table -->
          <table class="table table-bordered table-scroll" v-if="toggleType === 'withdrawal'">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Bank Name</th>
                <th>Account No</th>
                <th>Holder Name</th>
                <th>User</th>
                
              </tr>
            </thead>
            <tbody>
              <tr v-for="(txn, idx) in withdrawalHistory" :key="txn.id">
                <td>{{ idx + 1 }}</td>
                <td>{{ formatDate(txn.timestamp) }}</td>
                <td>₹{{ txn.amount }}</td>
                <td>{{ txn.to_bank?.bank_name }}</td>
                <td>{{ txn.to_bank?.account_no }}</td>
                <td>{{ txn.to_bank?.holder_name }}</td>
                <td>{{ txn.user_name }}</td>
                
              </tr>
              <tr v-if="withdrawalHistory.length === 0">
                <td colspan="8" class="text-center">No withdrawal transactions found.</td>
              </tr>
            </tbody>
          </table>
          <!-- Customer Booking Table -->
          <table class="table table-bordered table-scroll" v-else>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Prime Location</th>
                <th>City</th>
                <th>Slot Number</th>
                <th>Vehicle No</th>
                <th>Vehicle Type</th>
                <th>Customer</th>
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
                <td>{{ txn.slot_number || '-' }}</td>
                <td>{{ txn.vehicle_no || '-' }}</td>
                <td>{{ txn.vehicle_type || '-' }}</td>
                <td>{{ txn.owner_name || '-' }}</td>
                <td>{{ txn.type }}</td>
                <td>
                  <button class="btn btn-sm btn-info" @click="viewReservation(txn)">View</button>
                </td>
              </tr>
              <tr v-if="bookingHistory.length === 0">
                <td colspan="12" class="text-center">No booking expense transactions found.</td>
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
                <p><b>Customer:</b> {{ modalReservation.owner_name }} ({{ modalReservation.owner_email }})</p>
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
        <!-- Withdraw Modal -->
        <div v-if="showWithdrawModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Withdraw from Wallet</h5>
                <button type="button" class="btn-close" @click="showWithdrawModal = false"></button>
              </div>
              <div class="modal-body">
                <form @submit.prevent="withdrawWallet">
                  <div class="mb-2">
                    <label>Account Number</label>
                    <input v-model="withdrawForm.account_no" class="form-control" required>
                  </div>
                  <div class="mb-2">
                    <label>Bank Name</label>
                    <input v-model="withdrawForm.bank_name" class="form-control" required>
                  </div>
                  <div class="mb-2">
                    <label>Holder Name</label>
                    <input v-model="withdrawForm.holder_name" class="form-control" required>
                  </div>
                  <div class="mb-2">
                    <label>Amount</label>
                    <input v-model.number="withdrawForm.amount" type="number" min="1" class="form-control" required>
                  </div>
                  <button class="btn btn-success me-2" type="submit">Withdraw</button>
                  <button class="btn btn-secondary" @click="showWithdrawModal = false">Cancel</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      transactions: [],
      reservations: [],
      loading: true,
      toggleType: 'withdrawal',
      showModal: false,
      modalReservation: null,
      walletBalance: 0,
      showWithdrawModal: false,
      withdrawForm: {
        account_no: '',
        bank_name: '',
        holder_name: '',
        amount: ''
      }
    }
  },
  computed: {
    withdrawalHistory() {
      return this.transactions.filter(txn => txn.type === 'Withdraw');
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
            parking_cost: res.parking_cost,
            owner_name: res.owner_name,
            owner_email: res.owner_email
          };
        });
    }
  },
  methods: {
    async fetchTransactions() {
      this.loading = true;
      const token = localStorage.getItem('auth_token');
      const [txnRes, resRes] = await Promise.all([
        fetch('/api/admin/wallet/transactions', {
          headers: { 'Authentication-Token': token }
        }),
        fetch('/api/admin/parking/history', {
          headers: { 'Authentication-Token': token }
        })
      ]);
      if (txnRes.ok) {
        this.transactions = await txnRes.json();
      }
      if (resRes.ok) {
        this.reservations = await resRes.json();
      }
      await this.fetchWalletBalance();
      this.loading = false;
    },
    async fetchWalletBalance() {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/profile/me', {
        headers: { 'Authentication-Token': token }
      });
      if (res.ok) {
        const data = await res.json();
        this.walletBalance = data.wallet_balance || 0;
      }
    },
    async withdrawWallet() {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authentication-Token': token
        },
        body: JSON.stringify(this.withdrawForm)
      });
      if (res.ok) {
        this.showWithdrawModal = false;
        this.withdrawForm = { account_no: '', bank_name: '', holder_name: '', amount: '' };
        await this.fetchWalletBalance();
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
      if (this.toggleType === 'withdrawal') {
        csv += 'Date,Amount,Bank Name,Account No,Holder Name,User,Email\n';
        this.withdrawalHistory.forEach(txn => {
          csv += `"${this.formatDate(txn.timestamp)}","${txn.amount}","${txn.to_bank?.bank_name}","${txn.to_bank?.account_no}","${txn.to_bank?.holder_name}","${txn.user_name}","${txn.user_email}"\n`;
        });
      } else {
        csv += 'Date,Time,Amount,Prime Location,City,Slot Number,Vehicle No,Vehicle Type,Customer,Type\n';
        this.bookingHistory.forEach(txn => {
          csv += `"${this.formatDateOnly(txn.timestamp)}","${this.formatTimeOnly(txn.timestamp)}","${txn.amount}","${txn.lot_name || '-'}","${txn.city || '-'}","${txn.slot_number || '-'}","${txn.vehicle_no || '-'}","${txn.vehicle_type || '-'}","${txn.owner_name || '-'}","${txn.type}"\n`;
        });
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admin_transaction_history.csv';
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