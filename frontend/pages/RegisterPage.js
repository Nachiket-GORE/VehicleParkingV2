Vue.component('register-page', {
  template: `
<div class="register-bg">
      <div class="container mt-5">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <h2 class="mb-4 text-center">Register</h2>
          <form @submit.prevent="register" enctype="multipart/form-data">
            <div class="mb-3">
              <label>Email</label>
              <input type="email" class="form-control" v-model="form.email" required>
            </div>
            <div class="mb-3">
              <label>Password</label>
              <input type="password" class="form-control" v-model="form.password" required>
            </div>
            <div class="mb-3">
              <label>Full Name</label>
              <input type="text" class="form-control" v-model="form.full_name" required>
            </div>
            <!-- Country & City in one row -->
            <div class="row mb-3">
              <div class="col">
                <label>Country</label>
                <input type="text" class="form-control" v-model="form.country" required>
              </div>
              <div class="col">
                <label>City</label>
                <input type="text" class="form-control" v-model="form.city" required>
              </div>
            </div>
            <div class="mb-3">
              <label>Address</label>
              <input type="text" class="form-control" v-model="form.address" required>
            </div>
            <!-- Pincode & Profile Photo in one row -->
            <div class="row mb-3">
              <div class="col">
                <label>Pincode</label>
                <input type="number" class="form-control" v-model="form.pincode" required>
              </div>
              <div class="col">
                <label>Profile Photo (optional)</label>
                <input type="file" class="form-control" @change="onFileChange">
              </div>
            </div>
            <button type="submit" class="btn btn-primary">Register</button>
          </form>
          <div class="mt-3" v-if="message" :class="{'text-success': success, 'text-danger': !success}">
            {{ message }}
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        email: '',
        password: '',
        full_name: '',
        country: '',
        city: '',
        address: '',
        pincode: '',
        user_profile: ''
      },
      message: '',
      success: false
    }
  },
  methods: {
    onFileChange(e) {
      const file = e.target.files[0];
      if (!file) {
        this.form.user_profile = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        this.form.user_profile = event.target.result;
      };
      reader.readAsDataURL(file);
    },
    async register() {
      if (this.form.pincode !== '') {
        this.form.pincode = parseInt(this.form.pincode, 10);
      }
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(this.form)
      });
      const data = await res.json();
      this.message = data.message;
      this.success = res.status === 201;
      if (this.success) {
        this.form = {
          email: '', password: '', full_name: '', country: '', city: '', address: '', pincode: '', user_profile: ''
        };
        this.$router.push('/login');
      }
    }}
    });