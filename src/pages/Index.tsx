
import React from 'react';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg text-center bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-6">Telesales CRM System</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-5 mb-8">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Google Apps Script Project</h2>
          <p className="text-gray-700 mb-4">
            This is a React visualization of the Google Apps Script project. To use the actual application, please follow the setup instructions below.
          </p>
        </div>
        
        <div className="text-left">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Create a new Google Spreadsheet in your Google Drive</li>
            <li>Open the spreadsheet and go to Extensions → Apps Script</li>
            <li>Copy the provided Code.gs file content into the script editor</li>
            <li>Create additional HTML files (index.html, admin.html, stylesheet.html)</li>
            <li>Update the SPREADSHEET_ID constant in Code.gs with your spreadsheet's ID</li>
            <li>Run the setupSpreadsheet function once to initialize your sheets</li>
            <li>Deploy as a web app (Deploy → New deployment → Web app)</li>
            <li>Set access to "Anyone" and execute as "User accessing the web app"</li>
            <li>Copy the web app URL and share with your team</li>
          </ol>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>User authentication based on Google account</li>
            <li>Role-based access (Admin/User)</li>
            <li>Customer assignment system for telesales agents</li>
            <li>Daily limits per agent (100 customers)</li>
            <li>Customer rating system (1-3 stars)</li>
            <li>Admin dashboard for customer/agent management</li>
            <li>Reports and contact history</li>
            <li>CSV import functionality</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8 text-gray-500 text-sm">
        Note: The files above contain the complete source code for a Google Apps Script telesales CRM system.
      </div>
    </div>
  );
};

export default Index;
