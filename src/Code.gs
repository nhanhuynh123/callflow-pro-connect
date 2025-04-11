// Global constants
const SPREADSHEET_ID = ''; // You'll need to replace this with your actual spreadsheet ID
const CUSTOMER_SHEET_NAME = 'Customers';
const AGENTS_SHEET_NAME = 'Agents';
const DAILY_LIMITS_SHEET_NAME = 'DailyLimits';
const DAILY_CUSTOMER_LIMIT = 100;
const MAX_CONTACT_ATTEMPTS = 3;

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

// Get new customer - Updated to handle max 3 attempts per customer and max 1 call per agent
function getNewCustomer() {
  try {
    const userEmail = getCurrentUserEmail();
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // First check if the agent has reached their daily limit
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const limitsSheet = ss.getSheetByName(DAILY_LIMITS_SHEET_NAME);
    const limitsData = limitsSheet.getDataRange().getValues();
    
    // Format today's date as YYYY-MM-DD for comparison
    const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    // Check agent's daily count
    let currentCount = 0;
    for (let i = 1; i < limitsData.length; i++) {
      const limitDate = limitsData[i][0];
      const limitEmail = limitsData[i][1];
      
      // If date is a Date object, format it
      const limitDateStr = limitDate instanceof Date ? 
        Utilities.formatDate(limitDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : limitDate;
      
      if (limitDateStr === todayStr && limitEmail.toLowerCase() === userEmail.toLowerCase()) {
        currentCount = limitsData[i][2];
        break;
      }
    }
    
    if (currentCount >= DAILY_CUSTOMER_LIMIT) {
      return { success: false, message: 'Bạn đã đạt giới hạn hàng ngày. Vui lòng thử lại vào ngày mai.' };
    }
    
    // Get customers data
    const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
    const customersData = customersSheet.getDataRange().getValues();
    const headers = customersData[0];
    
    // Find column indexes
    const idColIndex = headers.indexOf('CustomerID');
    const nameColIndex = headers.indexOf('Name');
    const phoneColIndex = headers.indexOf('Phone');
    const statusColIndex = headers.indexOf('Status');
    const assignedToColIndex = headers.indexOf('AssignedTo');
    const assignedTimestampColIndex = headers.indexOf('AssignedTimestamp');
    const contactCountColIndex = headers.indexOf('ContactCount');
    const contact1ColIndex = headers.indexOf('Contact1');
    const contact2ColIndex = headers.indexOf('Contact2');
    const contact3ColIndex = headers.indexOf('Contact3');
    
    // First try to find a customer with:
    // 1. Status 'New' and ContactCount < MAX_CONTACT_ATTEMPTS
    // or
    // 2. Status 'Contacted' but ContactCount < MAX_CONTACT_ATTEMPTS and not contacted today
    // and
    // 3. Not previously contacted by this agent
    
    // Array to hold suitable customers
    const eligibleCustomers = [];
    
    for (let i = 1; i < customersData.length; i++) {
      const status = customersData[i][statusColIndex];
      let contactCount = customersData[i][contactCountColIndex] || 0;
      
      // Skip if already reached max contact attempts
      if (contactCount >= MAX_CONTACT_ATTEMPTS) {
        continue;
      }
      
      // Check if this agent has already contacted this customer
      let alreadyContactedByThisAgent = false;
      for (let j = 1; j <= contactCount; j++) {
        const contactAgentCol = headers.indexOf('Contact' + j + 'Agent');
        if (contactAgentCol > -1 && customersData[i][contactAgentCol] === userEmail) {
          alreadyContactedByThisAgent = true;
          break;
        }
      }
      
      // Skip if already contacted by this agent
      if (alreadyContactedByThisAgent) {
        continue;
      }
      
      // For contacted customers, check if they were contacted today
      if (status === 'Contacted') {
        const lastContactTimestampCol = headers.indexOf('Contact' + contactCount + 'Timestamp');
        if (lastContactTimestampCol > -1) {
          const lastContactTime = customersData[i][lastContactTimestampCol];
          if (lastContactTime instanceof Date) {
            const lastContactDate = new Date(lastContactTime);
            lastContactDate.setHours(0, 0, 0, 0);
            
            // Skip if contacted today
            if (lastContactDate.getTime() === today.getTime()) {
              continue;
            }
          }
        }
      }
      
      // This customer is eligible
      eligibleCustomers.push({
        row: i + 1, // 1-based index for sheet
        id: customersData[i][idColIndex],
        name: customersData[i][nameColIndex],
        phone: customersData[i][phoneColIndex],
        contactCount: contactCount
      });
    }
    
    // If no eligible customers found
    if (eligibleCustomers.length === 0) {
      return { success: false, message: 'Không tìm thấy khách hàng hợp lệ. Tất cả khách hàng đã được liên hệ hoặc bạn đã liên hệ với tất cả khách hàng phù hợp.' };
    }
    
    // Choose a random customer from eligible ones
    const randomIndex = Math.floor(Math.random() * eligibleCustomers.length);
    const selectedCustomer = eligibleCustomers[randomIndex];
    
    // Update the customer as assigned
    const row = selectedCustomer.row;
    
    // Set status to Assigned
    customersSheet.getRange(row, statusColIndex + 1).setValue('Assigned');
    
    // Set assigned to
    customersSheet.getRange(row, assignedToColIndex + 1).setValue(userEmail);
    
    // Set assigned timestamp
    const now = new Date();
    customersSheet.getRange(row, assignedTimestampColIndex + 1).setValue(now);
    
    // Update agent's daily count
    const todayRow = getOrCreateDailyLimitRow(userEmail);
    const currentDailyCount = todayRow.count || 0;
    limitsSheet.getRange(todayRow.row, 3).setValue(currentDailyCount + 1);
    
    return {
      success: true,
      customer: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        phone: selectedCustomer.phone
      }
    };
  } catch (error) {
    console.error("Error in getNewCustomer: " + error);
    return { success: false, message: 'Lỗi: ' + error };
  }
}

// Helper function to get or create a daily limit row for an agent
function getOrCreateDailyLimitRow(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const limitsSheet = ss.getSheetByName(DAILY_LIMITS_SHEET_NAME);
  const limitsData = limitsSheet.getDataRange().getValues();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Format date as YYYY-MM-DD
  const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  // Check if row exists
  for (let i = 1; i < limitsData.length; i++) {
    const rowDate = limitsData[i][0];
    const rowEmail = limitsData[i][1];
    
    // If date is a Date object, format it
    const rowDateStr = rowDate instanceof Date ? 
      Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : rowDate;
    
    if (rowDateStr === todayStr && rowEmail.toLowerCase() === email.toLowerCase()) {
      return { row: i + 1, count: limitsData[i][2] }; // return 1-based row index
    }
  }
  
  // Row doesn't exist, create it
  limitsSheet.appendRow([today, email, 0]);
  return { row: limitsSheet.getLastRow(), count: 0 };
}

// Submit customer rating - Updated to handle notes and 4 ratings
function submitCustomerRating(customerId, rating, note) {
  try {
    const userEmail = getCurrentUserEmail();
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
    const customersData = customersSheet.getDataRange().getValues();
    const headers = customersData[0];
    
    // Find column indexes
    const idColIndex = headers.indexOf('CustomerID');
    const statusColIndex = headers.indexOf('Status');
    const assignedToColIndex = headers.indexOf('AssignedTo');
    const ratingColIndex = headers.indexOf('Rating');
    const contactCountColIndex = headers.indexOf('ContactCount');
    const noteColIndex = headers.indexOf('Note');
    
    // Find the customer
    for (let i = 1; i < customersData.length; i++) {
      if (customersData[i][idColIndex] === customerId) {
        const row = i + 1; // Convert to 1-based index
        
        // Verify assignment
        if (customersData[i][assignedToColIndex].toLowerCase() !== userEmail.toLowerCase()) {
          return { 
            success: false, 
            message: 'Error: This customer is not assigned to you.' 
          };
        }
        
        // Get current contact count
        let contactCount = customersData[i][contactCountColIndex] || 0;
        contactCount++;
        
        // Update customer
        customersSheet.getRange(row, statusColIndex + 1).setValue('Contacted');
        customersSheet.getRange(row, ratingColIndex + 1).setValue(rating);
        customersSheet.getRange(row, contactCountColIndex + 1).setValue(contactCount);
        
        // Store note if provided
        if (note && noteColIndex > -1) {
          customersSheet.getRange(row, noteColIndex + 1).setValue(note);
        }
        
        // Store contact details in the appropriate Contact(N) columns
        const contactPrefix = 'Contact' + contactCount;
        
        // Store agent
        const contactAgentCol = headers.indexOf(contactPrefix + 'Agent');
        if (contactAgentCol > -1) {
          customersSheet.getRange(row, contactAgentCol + 1).setValue(userEmail);
        }
        
        // Store rating
        const contactRatingCol = headers.indexOf(contactPrefix + 'Rating');
        if (contactRatingCol > -1) {
          customersSheet.getRange(row, contactRatingCol + 1).setValue(rating);
        }
        
        // Store timestamp
        const contactTimestampCol = headers.indexOf(contactPrefix + 'Timestamp');
        if (contactTimestampCol > -1) {
          customersSheet.getRange(row, contactTimestampCol + 1).setValue(new Date());
        }
        
        // Store note
        const contactNoteCol = headers.indexOf(contactPrefix + 'Note');
        if (contactNoteCol > -1 && note) {
          customersSheet.getRange(row, contactNoteCol + 1).setValue(note);
        }
        
        return { success: true };
      }
    }
    
    return { 
      success: false, 
      message: 'Error: Customer not found.' 
    };
  } catch (error) {
    console.error("Error in submitCustomerRating: " + error);
    return { success: false, message: 'Error: ' + error };
  }
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

// Get agent performance data for chart
function getAgentPerformanceData(agentEmail) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
    const customersData = customersSheet.getDataRange().getValues();
    const headers = customersData[0];
    
    // Find contacts by this agent, grouped by date
    const contactsByDate = {};
    const lastWeek = [];
    
    // Create date labels for the last 7 days
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), "MM-dd");
      lastWeek.push(dateStr);
      contactsByDate[dateStr] = 0;
    }
    
    // Count contacts by this agent for each day
    for (let i = 1; i < customersData.length; i++) {
      for (let j = 1; j <= 3; j++) {
        const contactAgentCol = headers.indexOf('Contact' + j + 'Agent');
        const contactTimestampCol = headers.indexOf('Contact' + j + 'Timestamp');
        
        if (contactAgentCol > -1 && contactTimestampCol > -1) {
          const contactAgent = customersData[i][contactAgentCol];
          const contactTimestamp = customersData[i][contactTimestampCol];
          
          if (contactAgent && contactAgent.toLowerCase() === agentEmail.toLowerCase() && contactTimestamp) {
            const contactDate = new Date(contactTimestamp);
            // Only count contacts from the last 7 days
            if ((today - contactDate) <= 7 * 24 * 60 * 60 * 1000) {
              const dateStr = Utilities.formatDate(contactDate, Session.getScriptTimeZone(), "MM-dd");
              if (contactsByDate[dateStr] !== undefined) {
                contactsByDate[dateStr]++;
              }
            }
          }
        }
      }
    }
    
    // Create datasets for chart
    const contactedData = lastWeek.map(date => contactsByDate[date] || 0);
    
    return {
      labels: lastWeek,
      contacted: contactedData
    };
  } catch (error) {
    console.error("Error in getAgentPerformanceData: " + error);
    return {
      labels: [],
      contacted: []
    };
  }
}

// Get today's customer count - Updated as requested
function getTodayCustomerCount() {
  const userEmail = getCurrentUserEmail();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dailyLimitsSheet = ss.getSheetByName(DAILY_LIMITS_SHEET_NAME);
  const dailyData = dailyLimitsSheet.getDataRange().getValues();
  const headers = dailyData[0];
  
  const customerCountIdx = headers.indexOf('CustomerCount');
  const agentEmailIdx = headers.indexOf('AgentEmail');

  for (let i = 1; i < dailyData.length; i++) {
    if (dailyData[i][agentEmailIdx] === userEmail) {
      return dailyData[i][customerCountIdx];
    }
  }
  
  return 0; // Return 0 if no record found
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
  
  // Fix issue with missing customers on admin page
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

// Add new customer - Optimized to check for duplicate phone numbers
function addCustomer(name, phone) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const customerData = customersSheet.getDataRange().getValues();
  const headers = customerData[0];
  
  // Get index of phone column
  const phoneColIndex = headers.indexOf('Phone');
  
  // Check for duplicate phone number using a hashmap for O(1) lookup
  const phoneMap = {};
  for (let i = 1; i < customerData.length; i++) {
    const existingPhone = customerData[i][phoneColIndex].toString().trim();
    if (existingPhone) {
      phoneMap[existingPhone] = true;
    }
  }
  
  // Check if phone already exists
  if (phoneMap[phone.trim()]) {
    return {
      success: false,
      message: 'Customer with this phone number already exists.'
    };
  }
  
  // Generate new ID
  let maxId = 0;
  for (let i = 1; i < customerData.length; i++) {
    const currentId = parseInt(customerData[i][0].toString().replace('C', ''), 10);
    if (currentId > maxId) {
      maxId = currentId;
    }
  }
  const newId = 'C' + (maxId + 1).toString().padStart(4, '0');
  
  // Add new customer with updated columns
  customersSheet.appendRow([
    newId,           // CustomerID
    name,            // Name
    phone,           // Phone
    'New',           // Status
    '',              // AssignedTo
    '',              // AssignedTimestamp
    '',              // Rating
    '',              // ContactedTimestamp
    0,               // ContactCount
    '',              // Note
    '',              // Contact1Agent
    '',              // Contact1Rating
    '',              // Contact1Timestamp
    '',              // Contact1Note
    '',              // Contact2Agent
    '',              // Contact2Rating
    '',              // Contact2Timestamp
    '',              // Contact2Note
    '',              // Contact3Agent
    '',              // Contact3Rating
    '',              // Contact3Timestamp
    ''               // Contact3Note
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

// Import customers from CSV with duplicate filtering - Optimized for phone number checking
function importCustomersFromCSV(csvData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const customersSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
    const customerData = customersSheet.getDataRange().getValues();
    
    // Get existing phone numbers to check for duplicates - using hashmap for O(1) lookup
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
        
        // Add to existing phones to prevent duplicates
