
// Global constants
const SPREADSHEET_ID = ''; // You'll need to replace this with your actual spreadsheet ID
const CUSTOMER_SHEET_NAME = 'Customers';
const AGENTS_SHEET_NAME = 'Agents';
const DAILY_LIMITS_SHEET_NAME = 'DailyLimits';
const DAILY_CUSTOMER_LIMIT = 100;

// Web app endpoints
function doGet(e) {
  const userEmail = Session.getActiveUser().getEmail();
  
  // Check if user is authorized
  if (!isAuthorizedUser(userEmail)) {
    return HtmlService.createHtmlOutput('<h1>Unauthorized Access</h1><p>You are not authorized to use this application.</p>')
      .setTitle('Telesales CRM - Unauthorized')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  
  // Check if admin or regular user
  if (isAdmin(userEmail)) {
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

// Import customers from CSV
function importCustomersFromCSV(csvData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
    const customerData = customersSheet.getDataRange().getValues();
    
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
    
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].split(',');
      if (cols.length >= 2 && cols[0] && cols[1]) {
        maxId++;
        const newId = 'C' + maxId.toString().padStart(4, '0');
        
        // Add new customer
        customersSheet.appendRow([
          newId,           // CustomerID
          cols[0].trim(),  // Name
          cols[1].trim(),  // Phone
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
      message: `Successfully imported ${importCount} customers.` 
    };
  } catch (e) {
    return { 
      success: false, 
      message: 'Error importing customers: ' + e.toString() 
    };
  }
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
