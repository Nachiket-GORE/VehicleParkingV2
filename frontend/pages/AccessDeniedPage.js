Vue.component('access-denied', {
  template: `
    <div class="container mt-5 text-center">
      <h2 class="text-danger">Access Denied</h2>
      <p>You do not have permission to view this page.</p>
      <router-link to="/">Go to Home</router-link>
    </div>
  `
});