Vue.component('login-page', {
  template: `
    <div class="login-bg">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <h2 class="mb-4 text-center">Sign In</h2>
            <form @submit.prevent="login">
              <div class="mb-3">
                <label for="email">Email</label>
                <input id="email" type="email" class="form-control" v-model="form.email" required autocomplete="username">
              </div>
              <div class="mb-3">
                <label for="password">Password</label>
                <input id="password" type="password" class="form-control" v-model="form.password" required autocomplete="current-password">
              </div>
              <button type="submit" class="btn btn-primary mt-2">Login</button>
            </form>
            <div class="mt-3" v-if="message" :class="{'text-success': success, 'text-danger': !success}">
              {{ message }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        email: '',
        password: ''
      },
      message: '',
      success: false
    }
  },
  methods: {
    async login() {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(this.form)
      });
      const data = await res.json();
      this.message = data.message;
      this.success = res.status === 200;
      if (this.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_role', data.role);
        if (data.role === 'admin') {
          this.$router.push('/admin-dashboard');
        } else {
          this.$router.push('/user-dashboard');
        }
      }
    }
  }
});