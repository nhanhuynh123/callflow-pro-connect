// Global constants
const SPREADSHEET_ID = ''; // You'll need to replace this with your actual spreadsheet ID
const CUSTOMER_SHEET_NAME = 'Customers';
const AGENTS_SHEET_NAME = 'Agents';
const DAILY_LIMITS_SHEET_NAME = 'DailyLimits';
const DAILY_CUSTOMER_LIMIT = 100;

// Web app endpoints
function doGet(e) {
  try {
    // First check if there's a login parameter
    if (e && e.parameter && e.parameter.login) {
      return serveLoginPage();
    }
    
    // Get the active user email - note this may be empty when deployed as "Execute as: Me"
    const userEmail = Session.getActiveUser().getEmail();
    console.log("Active user email from Session: " + userEmail);
    
    // If we have a userEmail parameter, use that instead
    const providedEmail = e && e.parameter && e.parameter.userEmail ? e.parameter.userEmail : null;
    const effectiveEmail = userEmail && userEmail !== "" ? userEmail : providedEmail;
    
    console.log("Effective email being used: " + effectiveEmail);
    
    // Check if we have no way to identify the user
    if (!effectiveEmail) {
      return serveLoginPage();
    }
    
    // Check if user is authorized
    const isAuthorized = isAuthorizedUser(effectiveEmail);
    console.log("Is user authorized: " + isAuthorized);
    
    if (!isAuthorized) {
      // Show more detailed unauthorized message with the email for debugging
      return HtmlService.createHtmlOutput(
        '<h1>Unauthorized Access</h1>' +
        '<p>You are not authorized to use this application.</p>' +
        '<p>Email used: <strong>' + effectiveEmail + '</strong></p>' +
        '<p>Please contact the administrator to get access.</p>' +
        '<p><a href="' + getScriptUrl() + '?login=true" target="_self">Try different email</a></p>'
      )
      .setTitle('Telesales CRM - Unauthorized')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
    
    // Check if admin or regular user
    const isAdminUser = isAdmin(effectiveEmail);
    console.log("Is user admin: " + isAdminUser);
    
    // Create HTML template with user email as a parameter
    let template;
    let title;
    
    if (isAdminUser) {
      template = HtmlService.createTemplateFromFile('admin');
      title = 'Telesales CRM - Admin Dashboard';
    } else {
      template = HtmlService.createTemplateFromFile('index');
      title = 'Telesales CRM - Agent Dashboard';
    }
    
    // Set user email parameter for the template
    template.userEmail = effectiveEmail;
    
    return template
      .evaluate()
      .setTitle(title)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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

// Serve login page
function serveLoginPage() {
  const template = HtmlService.createTemplateFromFile('login');
  template.scriptUrl = getScriptUrl();
  
  return template
    .evaluate()
    .setTitle('Telesales CRM - Login')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Get script URL
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// Include HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Check if user is authorized (in Agents sheet)
function isAuthorizedUser(email) {
  if (!email || email === "") {
    console.error("Empty email provided to isAuthorizedUser");
    return false;
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
    const agentsData = agentsSheet.getDataRange().getValues();
    
    // Skip header row
    for (let i = 1; i < agentsData.length; i++) {
      const agentEmail = agentsData[i][0].toString().trim().toLowerCase();
      const userEmail = email.toString().trim().toLowerCase();
      
      console.log("Comparing: [" + agentEmail + "] with [" + userEmail + "]");
      
      if (agentEmail === userEmail) {
        console.log("User authorized: " + email);
        return true;
      }
    }
    
    console.log("User not found in agents list: " + email);
    return false;
  } catch (error) {
    console.error("Error in isAuthorizedUser: " + error);
    return false;
  }
}

// Check if user is an admin
function isAdmin(email) {
  if (!email || email === "") {
    console.error("Empty email provided to isAdmin");
    return false;
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agentsSheet = ss.getSheetByName(AGENTS_SHEET_NAME);
    const agentsData = agentsSheet.getDataRange().getValues();
    
    // Skip header row
    for (let i = 1; i < agentsData.length; i++) {
      const agentEmail = agentsData[i][0].toString().trim().toLowerCase();
      const isAdminFlag = agentsData[i][2]; // The IsAdmin column (3rd column)
      const userEmail = email.toString().trim().toLowerCase();
      
      if (agentEmail === userEmail && isAdminFlag === true) {
        console.log("User is an admin: " + email);
        return true;
      }
    }
    
    console.log("User is not an admin: " + email);
    return false;
  } catch (error) {
    console.error("Error in isAdmin: " + error);
    return false;
  }
}

// Get current user's email - now with fallback to parameter
function getCurrentUserEmail() {
  const email = Session.getActiveUser().getEmail();
  
  // If email is empty, try to get it from cache or user property
  if (!email || email === "") {
    // This will be handled by the client-side logic that stores the email parameter
    return CacheService.getScriptCache().get('current_user_email') || "";
  }
  
  return email;
}

// Set current user email (for use with login form)
function setCurrentUserEmail(email) {
  if (email && email.trim() !== "") {
    CacheService.getScriptCache().put('current_user_email', email, 21600); // Cache for 6 hours
    return { success: true };
  }
  return { success: false, message: "Invalid email" };
}

// Get current user's info with email parameter support
function getCurrentUserInfo(email) {
  // Use provided email or try to get from session
  const userEmail = email || getCurrentUserEmail();
  
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
