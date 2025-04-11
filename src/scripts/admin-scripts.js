// Initialize page
function initPage() {
  // Load user info
  google.script.run
    .withSuccessHandler(handleUserInfo)
    .withFailureHandler(handleError)
    .getCurrentUserInfo();
    
  // Load dashboard data
  loadDashboardData();
    
  // Load customers
  loadCustomers();
  
  // Load agents
  loadAgents();
  
  // Load contact history
  loadContactHistory();
  
  // Set up logout button
  document.getElementById('logout-btn').addEventListener('click', logout);
  
  // Set up CSV file upload
  setupCsvFileUpload();
  
  // Ensure all modals are hidden on page load
  hideAllModals();
}

// Function to hide all modals
function hideAllModals() {
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.classList.add('hidden');
  });
}

// Set up CSV file upload
function setupCsvFileUpload() {
  const fileInput = document.getElementById('csv-file-input');
  const fileNameDisplay = document.getElementById('selected-file-name');
  const processButton = document.getElementById('process-csv-btn');
  
  fileInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
      fileNameDisplay.textContent = this.files[0].name;
      processButton.disabled = false;
    } else {
      fileNameDisplay.textContent = 'Chưa có file được chọn';
      processButton.disabled = true;
    }
  });
  
  processButton.addEventListener('click', function() {
    const file = fileInput.files[0];
    if (!file) {
      showMessage('import-message', 'Vui lòng chọn file CSV', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const csvContent = e.target.result;
      document.getElementById('csv-data').value = csvContent;
    };
    reader.onerror = function() {
      showMessage('import-message', 'Lỗi khi đọc file', 'error');
    };
    reader.readAsText(file);
  });
}

// Logout function
function logout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    window.location.href = '?login=true';
  }
}

// Handle user info
function handleUserInfo(userInfo) {
  document.getElementById('user-name').textContent = 'Admin: ' + userInfo.name;
}

// Load dashboard data
function loadDashboardData() {
  google.script.run
    .withSuccessHandler(initializeDashboardCharts)
    .withFailureHandler(handleError)
    .getDashboardStats();
}

// Initialize dashboard charts
function initializeDashboardCharts(stats) {
  // Customer Status Chart
  const customerStatusData = {
    labels: ['New', 'Assigned', 'Contacted'],
    datasets: [{
      label: 'Customers',
      data: [stats.customerStats.new, stats.customerStats.assigned, stats.customerStats.contacted],
      backgroundColor: ['#4CAF50', '#FFC107', '#2196F3'],
    }]
  };
  
  const customerStatusCtx = document.getElementById('customer-status-chart').getContext('2d');
  new Chart(customerStatusCtx, {
    type: 'pie',
    data: customerStatusData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Customer Status Distribution'
        }
      }
    }
  });
  
  // Customer Progress Chart (new chart showing progress of customer contacts)
  const customerProgressData = {
    labels: ['Mới', 'Đã đánh giá', 'Đã hoàn thành'],
    datasets: [{
      label: 'Khách hàng',
      data: [stats.progressStats.new, stats.progressStats.inProgress, stats.progressStats.completed],
      backgroundColor: ['#4CAF50', '#FFC107', '#2196F3'],
    }]
  };
  
  const customerProgressCtx = document.getElementById('customer-progress-chart').getContext('2d');
  new Chart(customerProgressCtx, {
    type: 'doughnut',
    data: customerProgressData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Tiến độ liên hệ khách hàng'
        }
      }
    }
  });
  
  // Agent Performance Charts - one chart per agent
  if (stats.agentPerformance.length > 0) {
    const agentContainer = document.getElementById('agent-performance-container');
    agentContainer.innerHTML = ''; // Clear container
    
    stats.agentPerformance.forEach(agent => {
      // Create container for each agent chart
      const agentChartDiv = document.createElement('div');
      agentChartDiv.className = 'agent-chart';
      
      // Create canvas for chart
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 360;
      canvas.id = 'agent-chart-' + agent.email.replace(/[@.]/g, '-');
      
      // Add chart title
      const title = document.createElement('h4');
      title.textContent = agent.email.split('@')[0];
      
      // Add elements to container
      agentChartDiv.appendChild(title);
      agentChartDiv.appendChild(canvas);
      agentContainer.appendChild(agentChartDiv);
      
      // Create chart
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Đánh giá 1', 'Đánh giá 2', 'Đánh giá 3', 'Loại'],
          datasets: [{
            label: 'Số lượng',
            data: [agent.rating1, agent.rating2, agent.rating3, agent.rating4],
            backgroundColor: ['#F44336', '#FF9800', '#4CAF50', '#9E9E9E'],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            title: {
              display: true,
              text: 'Đã liên hệ: ' + agent.contacted + ' khách hàng'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    });
  } else {
    // No agent data available
    document.getElementById('agent-performance-container').innerHTML = 
      '<p class="text-center">No agent performance data available yet.</p>';
  }
}

// Load customers
function loadCustomers() {
  google.script.run
    .withSuccessHandler(displayCustomers)
    .withFailureHandler(handleError)
    .getAllCustomers();
}

// Display customers
function displayCustomers(customers) {
  const tableBody = document.getElementById('customers-table-body');
  tableBody.innerHTML = '';
  
  if (customers.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No customers found.</td></tr>';
    return;
  }
  
  for (const customer of customers) {
    const row = document.createElement('tr');
    
    // Add status class
    if (customer.Status === 'New') {
      row.classList.add('status-new');
    } else if (customer.Status === 'Assigned') {
      row.classList.add('status-assigned');
    } else if (customer.Status === 'Contacted') {
      row.classList.add('status-contacted');
    }
    
    row.innerHTML = `
      <td>${customer.CustomerID}</td>
      <td>${customer.Name}</td>
      <td>${customer.Phone}</td>
      <td>${customer.Status}</td>
      <td>${customer.AssignedTo || '-'}</td>
      <td>${customer.Rating || '-'}</td>
      <td>
        <button class="btn btn-sm btn-secondary edit-customer" data-id="${customer.CustomerID}" 
                data-name="${customer.Name}" data-phone="${customer.Phone}">Edit</button>
        <button class="btn btn-sm btn-danger delete-customer" data-id="${customer.CustomerID}">Delete</button>
      </td>
    `;
    
    tableBody.appendChild(row);
  }
  
  // Add event listeners to action buttons
  document.querySelectorAll('.edit-customer').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const name = this.getAttribute('data-name');
      const phone = this.getAttribute('data-phone');
      openEditCustomerModal(id, name, phone);
    });
  });
  
  document.querySelectorAll('.delete-customer').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      openDeleteCustomerModal(id);
    });
  });
}

// Open edit customer modal
function openEditCustomerModal(id, name, phone) {
  hideAllModals(); // Hide any other open modals first
  document.getElementById('edit-customer-id').value = id;
  document.getElementById('edit-customer-name').value = name;
  document.getElementById('edit-customer-phone').value = phone;
  document.getElementById('edit-customer-modal').classList.remove('hidden');
}

// Close edit customer modal
function closeEditCustomerModal() {
  document.getElementById('edit-customer-modal').classList.add('hidden');
}

// Save customer changes
function saveCustomerChanges() {
  const id = document.getElementById('edit-customer-id').value;
  const name = document.getElementById('edit-customer-name').value.trim();
  const phone = document.getElementById('edit-customer-phone').value.trim();
  
  if (!name || !phone) {
    alert('Please enter both name and phone number.');
    return;
  }
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        closeEditCustomerModal();
        loadCustomers(); // Reload customers
        showMessage('add-customer-message', 'Customer updated successfully!', 'success');
      } else {
        alert('Error: ' + result.message);
      }
    })
    .withFailureHandler(handleError)
    .updateCustomer(id, name, phone);
}

// Open delete customer modal
function openDeleteCustomerModal(id) {
  hideAllModals(); // Hide any other open modals first
  document.getElementById('delete-customer-id').value = id;
  document.getElementById('delete-customer-modal').classList.remove('hidden');
}

// Close delete customer modal
function closeDeleteCustomerModal() {
  document.getElementById('delete-customer-modal').classList.add('hidden');
}

// Delete customer
function deleteCustomer() {
  const id = document.getElementById('delete-customer-id').value;
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        closeDeleteCustomerModal();
        loadCustomers(); // Reload customers
        loadDashboardData(); // Reload dashboard data
        showMessage('add-customer-message', 'Customer deleted successfully!', 'success');
      } else {
        alert('Error: ' + result.message);
      }
    })
    .withFailureHandler(handleError)
    .deleteCustomer(id);
}

// Load agents
function loadAgents() {
  google.script.run
    .withSuccessHandler(displayAgents)
    .withFailureHandler(handleError)
    .getAllAgents();
}

// Display agents
function displayAgents(agents) {
  const tableBody = document.getElementById('agents-table-body');
  tableBody.innerHTML = '';
  
  // Also populate agent filter dropdown
  const agentFilter = document.getElementById('agent-filter');
  // Keep the "All Agents" option
  agentFilter.innerHTML = '<option value="">All Agents</option>';
  
  if (agents.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No agents found.</td></tr>';
    return;
  }
  
  for (const agent of agents) {
    // Add to table
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${agent.email}</td>
      <td>${agent.name}</td>
      <td>${agent.isAdmin ? 'Admin' : 'Agent'}</td>
      <td>
        <button class="btn btn-sm btn-danger remove-agent" data-email="${agent.email}">Remove</button>
      </td>
    `;
    
    tableBody.appendChild(row);
    
    // Add to filter dropdown
    const option = document.createElement('option');
    option.value = agent.email;
    option.textContent = agent.name;
    agentFilter.appendChild(option);
  }
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-agent').forEach(button => {
    button.addEventListener('click', function() {
      const email = this.getAttribute('data-email');
      removeAgent(email);
    });
  });
}

// Remove agent
function removeAgent(email) {
  if (!confirm(`Are you sure you want to remove agent ${email}?`)) {
    return;
  }
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        loadAgents(); // Reload agent list
      } else {
        alert('Error: ' + result.message);
      }
    })
    .withFailureHandler(handleError)
    .removeAgent(email);
}

// Load contact history - Fixed to properly display contact history data
function loadContactHistory(agentEmail, startDate, endDate) {
  google.script.run
    .withSuccessHandler(displayContactHistory)
    .withFailureHandler(handleError)
    .getContactHistory(agentEmail, startDate, endDate);
}

// Display contact history - Updated to show notes and contact count
function displayContactHistory(history) {
  const tableBody = document.getElementById('history-table-body');
  tableBody.innerHTML = '';
  
  if (history.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No contact history found.</td></tr>';
    return;
  }
  
  for (const entry of history) {
    const row = document.createElement('tr');
    
    // Format date
    let contactDate = '-';
    if (entry.ContactedTimestamp) {
      const date = new Date(entry.ContactedTimestamp);
      contactDate = date.toLocaleString();
    }
    
    row.innerHTML = `
      <td>${entry.CustomerID}</td>
      <td>${entry.Name}</td>
      <td>${entry.Phone}</td>
      <td>${entry.AssignedTo}</td>
      <td>${entry.Rating || '-'}</td>
      <td>${contactDate}</td>
      <td>${entry.Note || '-'}</td>
      <td>${entry.ContactCount || '1'}</td>
    `;
    
    tableBody.appendChild(row);
  }
}

// Add new customer
function addCustomer() {
  const name = document.getElementById('new-customer-name').value.trim();
  const phone = document.getElementById('new-customer-phone').value.trim();
  
  if (!name || !phone) {
    showMessage('add-customer-message', 'Please enter both name and phone number.', 'error');
    return;
  }
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        // Clear inputs
        document.getElementById('new-customer-name').value = '';
        document.getElementById('new-customer-phone').value = '';
        
        // Show success message
        showMessage('add-customer-message', 'Customer added successfully!', 'success');
        
        // Reload customers and dashboard
        loadCustomers();
        loadDashboardData();
      } else {
        showMessage('add-customer-message', 'Error: ' + result.message, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showMessage('add-customer-message', 'Error: ' + error.message, 'error');
    })
    .addCustomer(name, phone);
}

// Import customers from CSV
function importCustomersFromCSV() {
  const csvData = document.getElementById('csv-data').value.trim();
  
  if (!csvData) {
    showMessage('import-message', 'Vui lòng nhập dữ liệu CSV hoặc tải lên file CSV.', 'error');
    return;
  }
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        // Clear input
        document.getElementById('csv-data').value = '';
        document.getElementById('csv-file-input').value = '';
        document.getElementById('selected-file-name').textContent = 'Chưa có file được chọn';
        document.getElementById('process-csv-btn').disabled = true;
        
        // Show success message
        showMessage('import-message', result.message, 'success');
        
        // Reload customers and dashboard
        loadCustomers();
        loadDashboardData();
      } else {
        showMessage('import-message', 'Lỗi: ' + result.message, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showMessage('import-message', 'Lỗi: ' + error.message, 'error');
    })
    .importCustomersFromCSV(csvData);
}

// Add new agent
function addAgent() {
  const email = document.getElementById('new-agent-email').value.trim();
  const name = document.getElementById('new-agent-name').value.trim();
  const isAdmin = document.getElementById('new-agent-admin').checked;
  
  if (!email || !name) {
    showMessage('add-agent-message', 'Please enter both email and name.', 'error');
    return;
  }
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        // Clear inputs
        document.getElementById('new-agent-email').value = '';
        document.getElementById('new-agent-name').value = '';
        document.getElementById('new-agent-admin').checked = false;
        
        // Show success message
        showMessage('add-agent-message', 'Agent added successfully!', 'success');
        
        // Reload agents
        loadAgents();
      } else {
        showMessage('add-agent-message', 'Error: ' + result.message, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showMessage('add-agent-message', 'Error: ' + error.message, 'error');
    })
    .addAgent(email, name, isAdmin);
}

// Apply filter to contact history
function applyFilter() {
  const agentEmail = document.getElementById('agent-filter').value;
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  loadContactHistory(agentEmail, startDate, endDate);
}

// Show message (success or error)
function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.classList.remove('hidden', 'success', 'error');
  element.classList.add(type);
  
  // Auto-hide after 5 seconds
  setTimeout(function() {
    element.classList.add('hidden');
  }, 5000);
}

// Handle error
function handleError(error) {
  console.error('Error:', error);
  alert('An error occurred: ' + (error.message || error));
}

// Switch tabs
function switchTab(tabName) {
  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Deactivate all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName + '-tab').classList.add('active');
  
  // Activate selected tab button
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
  
  // Hide any open modals when switching tabs
  hideAllModals();
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize page
  initPage();
  
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(function(button) {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Add customer button
  document.getElementById('add-customer-btn').addEventListener('click', function() {
    addCustomer();
  });
  
  // Import CSV button
  document.getElementById('import-csv-btn').addEventListener('click', function() {
    importCustomersFromCSV();
  });
  
  // Add agent button
  document.getElementById('add-agent-btn').addEventListener('click', function() {
    addAgent();
  });
  
  // Apply filter button
  document.getElementById('apply-filter-btn').addEventListener('click', function() {
    applyFilter();
  });
  
  // Edit customer - Save changes button
  document.getElementById('save-customer-btn').addEventListener('click', function() {
    saveCustomerChanges();
  });
  
  // Edit customer - Cancel button
  document.getElementById('cancel-edit-btn').addEventListener('click', function() {
    closeEditCustomerModal();
  });
  
  // Close modals when clicking the X
  document.querySelectorAll('.close-modal').forEach(function(button) {
    button.addEventListener('click', function() {
      // Find the parent modal and hide it
      const modal = this.closest('.modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    });
  });
  
  // Delete customer - Confirm button
  document.getElementById('confirm-delete-btn').addEventListener('click', function() {
    deleteCustomer();
  });
  
  // Delete customer - Cancel button
  document.getElementById('cancel-delete-btn').addEventListener('click', function() {
    closeDeleteCustomerModal();
  });
  
  // Click outside modals to close them
  window.addEventListener('click', function(event) {
    document.querySelectorAll('.modal').forEach(function(modal) {
      if (event.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
});
