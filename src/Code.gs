// Global constants
const SPREADSHEET_ID = ''; // You'll need to replace this with your actual spreadsheet ID
const CUSTOMER_SHEET_NAME = 'Customers';
const AGENTS_SHEET_NAME = 'Agents';
const DAILY_LIMITS_SHEET_NAME = 'DailyLimits';
const DAILY_CUSTOMER_LIMIT = 100;

// Web app endpoints
function doGet(e) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    console.log("Active user email: " + userEmail);
    
    // Check if user is authorized
    const isAuthorized = isAuthorizedUser(userEmail);
    console.log("Is user authorized: " + isAuthorized);
    
    if (!isAuthorized) {
      return HtmlService.createHtmlOutput(
        '<h1>Unauthorized Access</h1>' +
        '<p>You are not authorized to use this application.</p>' +
        '<p>Your email: ' + userEmail + '</p>' +
        '<p>Please contact the administrator to get access.</p>'
      )
      .setTitle('Telesales CRM - Unauthorized')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
    
    // Check if admin or regular user
    const isAdminUser = isAdmin(userEmail);
    console.log("Is user admin: " + isAdminUser);
    
    if (isAdminUser) {
      return HtmlService.createTemplateFromFile('admin')
        .evaluate()
        .setTitle('Telesales CRM - Admin Dashboard')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else {
      return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Telesales CRM - Agent Dashboard')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
  } catch (error) {
    console.error("Error in doGet: " + error);
    return HtmlService.createHtmlOutput(
      '<h1>Error Occurred</h1>' +
      '<p>An error occurred while processing your request:</p>' +
      '<pre>' + error.toString() + '</pre>' +
      '<p>Please contact the administrator for assistance.</p>'
    )
    .setTitle('Telesales CRM - Error')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

// Include HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Check if user is authorized (in Agents sheet)
function isAuthorizedUser(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
  const agentsData = agentsSheet.getDataRange().getValues();
  
  // Skip header row
  for (let i = 1; i < agentsData.length; i++) {
    if (agentsData[i][0].toLowerCase() === email.toLowerCase()) {
      return true;
    }
  }
  return false;
}

// Check if user is an admin
function isAdmin(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
  const agentsData = agentsSheet.getDataRange().getValues();
  
  // Skip header row
  for (let i = 1; i < agentsData.length; i++) {
    if (agentsData[i][0].toLowerCase() === email.toLowerCase() && agentsData[i][2] === true) {
      return true;
    }
  }
  return false;
}

// Get current user's email
function getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

// Get current user's info
function getCurrentUserInfo() {
  const userEmail = getCurrentUserEmail();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
  const agentsData = agentsSheet.getDataRange().getValues();
  
  for (let i = 1; i < agentsData.length; i++) {
    if (agentsData[i][0].toLowerCase() === userEmail.toLowerCase()) {
      return {
        email: agentsData[i][0],
        name: agentsData[i][1],
        isAdmin: agentsData[i][2] || false
      };
    }
  }
  
  return { email: userEmail, name: userEmail.split('@')[0], isAdmin: false };
}

// Get customer count for agent today
function getTodayCustomerCount() {
  const userEmail = getCurrentUserEmail();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dailyLimitsSheet = ss.getSheetByName(DAILY_LIMITS_SHEET_NAME);
  const dailyData = dailyLimitsSheet.getDataRange().getValues();
  
  for (let i = 1; i < dailyData.length; i++) {
    const recordDate = new Date(dailyData[i][0]);
    recordDate.setHours(0, 0, 0, 0);
    
    if (recordDate.getTime() === today.getTime() && 
        dailyData[i][1].toLowerCase() === userEmail.toLowerCase()) {
      return dailyData[i][2];
    }
  }
  
  return 0;
}

// Check if agent has reached daily limit
function hasReachedDailyLimit() {
  return getTodayCustomerCount() >= DAILY_CUSTOMER_LIMIT;
}

// Get a new customer for the agent
function getNewCustomer() {
  const userEmail = getCurrentUserEmail();
  
  // Check daily limit
  if (hasReachedDailyLimit()) {
    return { 
      success: false, 
      message: 'You have reached your daily limit of ' + DAILY_CUSTOMER_LIMIT + ' customers.'
    };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Find column indexes
  const idColIndex = headers.indexOf('CustomerID');
  const nameColIndex = headers.indexOf('Name');
  const phoneColIndex = headers.indexOf('Phone');
  const statusColIndex = headers.indexOf('Status');
  const assignedToColIndex = headers.indexOf('AssignedTo');
  const assignedTimestampColIndex = headers.indexOf('AssignedTimestamp');
  
  // Find a new customer
  for (let i = 1; i < customerData.length; i++) {
    if (customerData[i][statusColIndex] === 'New') {
      // Found a new customer, assign to agent
      const row = i + 1; // Convert to 1-based index for Google Sheets
      
      // Update customer data
      customersSheet.getRange(row, statusColIndex + 1).setValue('Assigned');
      customersSheet.getRange(row, assignedToColIndex + 1).setValue(userEmail);
      const now = new Date();
      customersSheet.getRange(row, assignedTimestampColIndex + 1).setValue(now);
      
      // Update daily limit
      updateDailyLimit(userEmail);
      
      // Return customer info
      return { 
        success: true, 
        customer: {
          id: customerData[i][idColIndex],
          name: customerData[i][nameColIndex],
          phone: customerData[i][phoneColIndex]
        }
      };
    }
  }
  
  return { 
    success: false, 
    message: 'No new customers available at this time.'
  };
}

// Update daily limit for agent
function updateDailyLimit(userEmail) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dailyLimitsSheet = ss.getSheetByName(DAILY_LIMITS_SHEET_NAME);
  const dailyData = dailyLimitsSheet.getDataRange().getValues();
  
  // Check if today's record exists
  let recordExists = false;
  
  for (let i = 1; i < dailyData.length; i++) {
    const recordDate = new Date(dailyData[i][0]);
    recordDate.setHours(0, 0, 0, 0);
    
    if (recordDate.getTime() === today.getTime() && 
        dailyData[i][1].toLowerCase() === userEmail.toLowerCase()) {
      // Update existing record
      const row = i + 1;
      const currentCount = dailyData[i][2];
      dailyLimitsSheet.getRange(row, 3).setValue(currentCount + 1);
      recordExists = true;
      break;
    }
  }
  
  if (!recordExists) {
    // Add new record
    dailyLimitsSheet.appendRow([today, userEmail, 1]);
  }
}

// Submit customer rating
function submitCustomerRating(customerId, rating) {
  const userEmail = getCurrentUserEmail();
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Find column indexes
  const idColIndex = headers.indexOf('CustomerID');
  const statusColIndex = headers.indexOf('Status');
  const assignedToColIndex = headers.indexOf('AssignedTo');
  const ratingColIndex = headers.indexOf('Rating');
  const contactedTimestampColIndex = headers.indexOf('ContactedTimestamp');
  
  // Find the customer
  for (let i = 1; i < customerData.length; i++) {
    if (customerData[i][idColIndex] === customerId && 
        customerData[i][assignedToColIndex].toLowerCase() === userEmail.toLowerCase() &&
        customerData[i][statusColIndex] === 'Assigned') {
      // Update customer data
      const row = i + 1; // Convert to 1-based index for Google Sheets
      customersSheet.getRange(row, statusColIndex + 1).setValue('Contacted');
      customersSheet.getRange(row, ratingColIndex + 1).setValue(rating);
      const now = new Date();
      customersSheet.getRange(row, contactedTimestampColIndex + 1).setValue(now);
      
      return { success: true };
    }
  }
  
  return { 
    success: false, 
    message: 'Customer not found or not assigned to you.'
  };
}

// Get current assigned customer
function getCurrentAssignedCustomer() {
  const userEmail = getCurrentUserEmail();
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Find column indexes
  const idColIndex = headers.indexOf('CustomerID');
  const nameColIndex = headers.indexOf('Name');
  const phoneColIndex = headers.indexOf('Phone');
  const statusColIndex = headers.indexOf('Status');
  const assignedToColIndex = headers.indexOf('AssignedTo');
  
  // Find assigned customer
  for (let i = 1; i < customerData.length; i++) {
    if (customerData[i][statusColIndex] === 'Assigned' && 
        customerData[i][assignedToColIndex].toLowerCase() === userEmail.toLowerCase()) {
      return { 
        success: true, 
        customer: {
          id: customerData[i][idColIndex],
          name: customerData[i][nameColIndex],
          phone: customerData[i][phoneColIndex]
        }
      };
    }
  }
  
  return { success: false };
}

// Logout function
function logoutUser() {
  var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  // Unfortunately, Google Apps Script doesn't provide a direct way to log out a user
  // We'll return a URL that can be used to sign out of Google accounts
  return {
    success: true,
    logoutUrl: 'https://accounts.google.com/logout'
  };
}

// ADMIN FUNCTIONS

// Get all agents
function getAllAgents() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
  const agentsData = agentsSheet.getDataRange().getValues();
  
  const agents = [];
  // Skip header row
  for (let i = 1; i < agentsData.length; i++) {
    agents.push({
      email: agentsData[i][0],
      name: agentsData[i][1],
      isAdmin: agentsData[i][2] || false
    });
  }
  
  return agents;
}

// Add new agent
function addAgent(email, name, isAdmin) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
  
  // Check if agent already exists
  const agentsData = agentsSheet.getDataRange().getValues();
  for (let i = 1; i < agentsData.length; i++) {
    if (agentsData[i][0].toLowerCase() === email.toLowerCase()) {
      return { 
        success: false, 
        message: 'Agent with this email already exists.' 
      };
    }
  }
  
  // Add new agent
  agentsSheet.appendRow([email, name, isAdmin === 'true' || isAdmin === true]);
  
  return { success: true };
}

// Remove agent
function removeAgent(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
  const agentsData = agentsSheet.getDataRange().getValues();
  
  // Find agent
  for (let i = 1; i < agentsData.length; i++) {
    if (agentsData[i][0].toLowerCase() === email.toLowerCase()) {
      const row = i + 1; // Convert to 1-based index
      agentsSheet.deleteRow(row);
      return { success: true };
    }
  }
  
  return { 
    success: false, 
    message: 'Agent not found.' 
  };
}

// Get all customers
function getAllCustomers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  const customers = [];
  // Skip header row
  for (let i = 1; i < customerData.length; i++) {
    const customer = {};
    for (let j = 0; j < headers.length; j++) {
      customer[headers[j]] = customerData[i][j];
    }
    customers.push(customer);
  }
  
  return customers;
}

// Add new customer
function addCustomer(name, phone) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  
  // Generate new ID
  let maxId = 0;
  for (let i = 1; i < customerData.length; i++) {
    const currentId = parseInt(customerData[i][0].toString().replace('C', ''), 10);
    if (currentId > maxId) {
      maxId = currentId;
    }
  }
  const newId = 'C' + (maxId + 1).toString().padStart(4, '0');
  
  // Add new customer
  customersSheet.appendRow([
    newId,           // CustomerID
    name,            // Name
    phone,           // Phone
    'New',           // Status
    '',              // AssignedTo
    '',              // AssignedTimestamp
    '',              // Rating
    ''               // ContactedTimestamp
  ]);
  
  return { success: true };
}

// Update customer
function updateCustomer(customerId, name, phone) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Find column indexes
  const idColIndex = headers.indexOf('CustomerID');
  const nameColIndex = headers.indexOf('Name');
  const phoneColIndex = headers.indexOf('Phone');
  
  // Find the customer
  for (let i = 1; i < customerData.length; i++) {
    if (customerData[i][idColIndex] === customerId) {
      const row = i + 1; // Convert to 1-based index
      
      // Update customer data
      customersSheet.getRange(row, nameColIndex + 1).setValue(name);
      customersSheet.getRange(row, phoneColIndex + 1).setValue(phone);
      
      return { success: true };
    }
  }
  
  return { 
    success: false, 
    message: 'Customer not found.' 
  };
}

// Delete customer
function deleteCustomer(customerId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Find column index
  const idColIndex = headers.indexOf('CustomerID');
  
  // Find the customer
  for (let i = 1; i < customerData.length; i++) {
    if (customerData[i][idColIndex] === customerId) {
      const row = i + 1; // Convert to 1-based index
      customersSheet.deleteRow(row);
      return { success: true };
    }
  }
  
  return { 
    success: false, 
    message: 'Customer not found.' 
  };
}

// Import customers from CSV with duplicate filtering
function importCustomersFromCSV(csvData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
    const customerData = customersSheet.getDataRange().getValues();
    
    // Get existing phone numbers to check for duplicates
    const existingPhones = {};
    const phoneColIndex = customerData[0].indexOf('Phone');
    
    for (let i = 1; i < customerData.length; i++) {
      const phone = customerData[i][phoneColIndex].toString().trim();
      if (phone) {
        existingPhones[phone] = true;
      }
    }
    
    // Generate new IDs starting from current max
    let maxId = 0;
    for (let i = 1; i < customerData.length; i++) {
      const currentId = parseInt(customerData[i][0].toString().replace('C', ''), 10);
      if (currentId > maxId) {
        maxId = currentId;
      }
    }
    
    // Parse CSV
    const rows = csvData.split('\n');
    let importCount = 0;
    let duplicateCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].split(',');
      if (cols.length >= 2 && cols[0] && cols[1]) {
        const name = cols[0].trim();
        const phone = cols[1].trim();
        
        // Check for duplicates
        if (existingPhones[phone]) {
          duplicateCount++;
          continue;
        }
        
        // Add to existing phones to prevent duplicates within import
        existingPhones[phone] = true;
        
        maxId++;
        const newId = 'C' + maxId.toString().padStart(4, '0');
        
        // Add new customer
        customersSheet.appendRow([
          newId,           // CustomerID
          name,            // Name
          phone,           // Phone
          'New',           // Status
          '',              // AssignedTo
          '',              // AssignedTimestamp
          '',              // Rating
          ''               // ContactedTimestamp
        ]);
        
        importCount++;
      }
    }
    
    return { 
      success: true, 
      message: `Successfully imported ${importCount} customers. Skipped ${duplicateCount} duplicates.` 
    };
  } catch (e) {
    return { 
      success: false, 
      message: 'Error importing customers: ' + e.toString() 
    };
  }
}

// Get dashboard statistics
function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Find column indexes
  const statusColIndex = headers.indexOf('Status');
  const ratingColIndex = headers.indexOf('Rating');
  const assignedToColIndex = headers.indexOf('AssignedTo');
  
  // Initialize counters
  const customerStats = {
    new: 0,
    assigned: 0,
    contacted: 0
  };
  
  const ratingStats = {
    noRating: 0,
    rating1: 0,
    rating2: 0,
    rating3: 0
  };
  
  const agentStats = {};
  
  // Count statistics
  for (let i = 1; i < customerData.length; i++) {
    const status = customerData[i][statusColIndex];
    const rating = customerData[i][ratingColIndex];
    const agent = customerData[i][assignedToColIndex];
    
    // Customer status counts
    if (status === 'New') {
      customerStats.new++;
    } else if (status === 'Assigned') {
      customerStats.assigned++;
    } else if (status === 'Contacted') {
      customerStats.contacted++;
      
      // Rating counts
      if (!rating) {
        ratingStats.noRating++;
      } else if (rating === 1) {
        ratingStats.rating1++;
      } else if (rating === 2) {
        ratingStats.rating2++;
      } else if (rating === 3) {
        ratingStats.rating3++;
      }
      
      // Agent performance
      if (agent) {
        if (!agentStats[agent]) {
          agentStats[agent] = {
            contacted: 0,
            rating1: 0,
            rating2: 0,
            rating3: 0
          };
        }
        
        agentStats[agent].contacted++;
        
        if (rating === 1) {
          agentStats[agent].rating1++;
        } else if (rating === 2) {
          agentStats[agent].rating2++;
        } else if (rating === 3) {
          agentStats[agent].rating3++;
        }
      }
    }
  }
  
  // Convert agent stats to array for easier processing in frontend
  const agentPerformance = [];
  for (const email in agentStats) {
    agentPerformance.push({
      email: email,
      contacted: agentStats[email].contacted,
      rating1: agentStats[email].rating1,
      rating2: agentStats[email].rating2,
      rating3: agentStats[email].rating3
    });
  }
  
  return {
    customerStats: customerStats,
    ratingStats: ratingStats,
    agentPerformance: agentPerformance
  };
}

// Get contact history with filters
function getContactHistory(agentEmail, startDate, endDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Find column indexes
  const statusColIndex = headers.indexOf('Status');
  const assignedToColIndex = headers.indexOf('AssignedTo');
  const contactedTimestampColIndex = headers.indexOf('ContactedTimestamp');
  
  // Convert dates
  let startDateTime = null;
  let endDateTime = null;
  
  if (startDate) {
    startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
  }
  
  if (endDate) {
    endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
  }
  
  const history = [];
  
  // Filter customers
  for (let i = 1; i < customerData.length; i++) {
    // Skip if not contacted
    if (customerData[i][statusColIndex] !== 'Contacted') {
      continue;
    }
    
    // Apply agent filter
    if (agentEmail && customerData[i][assignedToColIndex].toLowerCase() !== agentEmail.toLowerCase()) {
      continue;
    }
    
    // Apply date filters
    const contactedDate = new Date(customerData[i][contactedTimestampColIndex]);
    if (startDateTime && contactedDate < startDateTime) {
      continue;
    }
    if (endDateTime && contactedDate > endDateTime) {
      continue;
    }
    
    // Add to history
    const customer = {};
    for (let j = 0; j < headers.length; j++) {
      customer[headers[j]] = customerData[i][j];
    }
    history.push(customer);
  }
  
  return history;
}

// Initialize spreadsheet structure
function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create Customers sheet if it doesn't exist
  let customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  if (!customersSheet) {
    customersSheet = ss.insertSheet(CUSTOMER_SHEET_NAME);
    customersSheet.appendRow([
      'CustomerID', 'Name', 'Phone', 'Status', 'AssignedTo', 
      'AssignedTimestamp', 'Rating', 'ContactedTimestamp'
    ]);
  }
  
  // Create Agents sheet if it doesn't exist
  let agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
  if (!agentsSheet) {
    agentsSheet = ss.insertSheet(AGENTS_SHEET_NAME);
    agentsSheet.appendRow(['AgentEmail', 'AgentName', 'IsAdmin']);
    
    // Add current user as admin
    const userEmail = Session.getActiveUser().getEmail();
    agentsSheet.appendRow([userEmail, userEmail.split('@')[0], true]);
  }
  
  // Create DailyLimits sheet if it doesn't exist
  let dailyLimitsSheet = ss.getSheetByName(DAILY_LIMITS_SHEET_NAME);
  if (!dailyLimitsSheet) {
    dailyLimitsSheet = ss.insertSheet(DAILY_LIMITS_SHEET_NAME);
    dailyLimitsSheet.appendRow(['Date', 'AgentEmail', 'CustomerCount']);
  }
  
  return {
    success: true,
    message: 'Spreadsheet structure set up successfully.'
  };
}
