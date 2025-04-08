
import React from 'react';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg text-center bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-6">Telesales CRM System</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-5 mb-8">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Google Apps Script Project</h2>
          <p className="text-gray-700 mb-4">
            Hệ thống CRM cho đội ngũ telesales được xây dựng bằng Google Apps Script và Google Sheets.
          </p>
        </div>
        
        <div className="text-left">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Hướng dẫn cài đặt:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>Tạo một Google Spreadsheet mới trong Google Drive của bạn</li>
            <li>Mở spreadsheet và vào Extensions → Apps Script</li>
            <li>Sao chép nội dung của tệp Code.gs vào trình soạn thảo script</li>
            <li>Tạo thêm các tệp HTML (index.html, admin.html, stylesheet.html)</li>
            <li>Cập nhật hằng số SPREADSHEET_ID trong Code.gs với ID của spreadsheet của bạn</li>
            <li>Chạy hàm setupSpreadsheet một lần để khởi tạo cấu trúc bảng tính</li>
            <li>Triển khai dưới dạng ứng dụng web (Deploy → New deployment → Web app)</li>
            <li>Đặt quyền truy cập là "Anyone" và thực thi dưới dạng "User accessing the web app"</li>
            <li>Sao chép URL của ứng dụng web và chia sẻ với team của bạn</li>
          </ol>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Tính năng:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Xác thực người dùng dựa trên tài khoản Google</li>
            <li>Hệ thống phân quyền (Admin/User)</li>
            <li>Hệ thống gán khách hàng cho nhân viên telesales</li>
            <li>Giới hạn số lượng khách hàng mỗi ngày cho mỗi nhân viên (100 khách hàng)</li>
            <li>Hệ thống đánh giá khách hàng (1-3 sao)</li>
            <li>Dashboard quản trị với biểu đồ thống kê</li>
            <li>Quản lý khách hàng: thêm, sửa, xóa, import CSV</li>
            <li>Lọc tự động khách hàng trùng lặp khi import</li>
            <li>Báo cáo và lịch sử liên hệ</li>
          </ul>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Mới! Tính năng Dashboard:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Biểu đồ phân phối trạng thái khách hàng (mới, đã gán, đã liên hệ)</li>
            <li>Biểu đồ phân phối đánh giá (1 sao, 2 sao, 3 sao)</li>
            <li>Biểu đồ hiệu suất nhân viên</li>
            <li>Quản lý khách hàng nâng cao (sửa, xóa, lọc trùng lặp)</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8 text-gray-500 text-sm">
        Lưu ý: Các tệp trên chứa mã nguồn đầy đủ cho hệ thống CRM telesales Google Apps Script.
      </div>
    </div>
  );
};

export default Index;
