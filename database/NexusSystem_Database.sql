-- ===================================================================================
-- NEXUS TELECOM SERVICE MARKETING SYSTEM - ENHANCED DATABASE ARCHITECTURE
-- Database Name: NexusSystem
-- Standardization: 3NF (Third Normal Form) & Zero-Redundancy Architecture
-- Compatibility: Microsoft SQL Server 2016+ / Azure SQL / EF Core / Svelte 5 Frontend
-- ===================================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'NexusSystem')
BEGIN
    CREATE DATABASE NexusSystem
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

USE NexusSystem;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ===================================================================================
-- 1. DROP EXISTING TABLES IN REVERSE DEPENDENCY ORDER (SAFE RE-RUN)
-- ===================================================================================
IF OBJECT_ID(N'dbo.EquipmentRequest', N'U') IS NOT NULL DROP TABLE dbo.EquipmentRequest;
IF OBJECT_ID(N'dbo.PurchaseOrder', N'U') IS NOT NULL DROP TABLE dbo.PurchaseOrder;
IF OBJECT_ID(N'dbo.ChatMessage', N'U') IS NOT NULL DROP TABLE dbo.ChatMessage;
IF OBJECT_ID(N'dbo.ConnectionActivityLog', N'U') IS NOT NULL DROP TABLE dbo.ConnectionActivityLog;
IF OBJECT_ID(N'dbo.Feedback', N'U') IS NOT NULL DROP TABLE dbo.Feedback;
IF OBJECT_ID(N'dbo.Payment', N'U') IS NOT NULL DROP TABLE dbo.Payment;
IF OBJECT_ID(N'dbo.Bill', N'U') IS NOT NULL DROP TABLE dbo.Bill;
IF OBJECT_ID(N'dbo.CustomerConnection', N'U') IS NOT NULL DROP TABLE dbo.CustomerConnection;
IF OBJECT_ID(N'dbo.Equipment', N'U') IS NOT NULL DROP TABLE dbo.Equipment;
IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID(N'dbo.Customer', N'U') IS NOT NULL DROP TABLE dbo.Customer;
IF OBJECT_ID(N'dbo.InventoryItem', N'U') IS NOT NULL DROP TABLE dbo.InventoryItem;
IF OBJECT_ID(N'dbo.ServicePlan', N'U') IS NOT NULL DROP TABLE dbo.ServicePlan;
IF OBJECT_ID(N'dbo.Employee', N'U') IS NOT NULL DROP TABLE dbo.Employee;
IF OBJECT_ID(N'dbo.RetailStore', N'U') IS NOT NULL DROP TABLE dbo.RetailStore;
IF OBJECT_ID(N'dbo.Vendor', N'U') IS NOT NULL DROP TABLE dbo.Vendor;
IF OBJECT_ID(N'dbo.SystemSettings', N'U') IS NOT NULL DROP TABLE dbo.SystemSettings;
GO

-- ===================================================================================
-- 2. CREATE REFINED 3NF TABLES (ZERO DUPLICATION, FULL FRONTEND COMPATIBILITY)
-- ===================================================================================

-- 2.1. RETAIL STORE TABLE (Cửa hàng bán lẻ)
CREATE TABLE dbo.RetailStore (
    StoreID                VARCHAR(20)      NOT NULL, -- e.g., 'SH-01'
    Name                   NVARCHAR(150)    NOT NULL,
    City                   NVARCHAR(100)    NOT NULL,
    CityCode               CHAR(3)          NOT NULL, -- 3-digit city code in 16-char AccountID ('064', '072', '081')
    Address                NVARCHAR(255)    NOT NULL,
    ManagerName            NVARCHAR(100)    NULL,
    Phone                  VARCHAR(30)      NULL,
    Email                  VARCHAR(100)     NULL,
    OperatingHours         NVARCHAR(100)    NULL,
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Active',
    ActiveEmployeesCount   INT              NOT NULL DEFAULT 0,
    TotalSubscribersServed INT              NOT NULL DEFAULT 0,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_RetailStore PRIMARY KEY CLUSTERED (StoreID),
    CONSTRAINT CK_RetailStore_CityCode CHECK (LEN(CityCode) = 3 AND CityCode NOT LIKE '%[^0-9]%'),
    CONSTRAINT CK_RetailStore_Status CHECK (Status IN ('Active', 'Renovating', 'Closed'))
);
GO

-- 2.2. EMPLOYEE TABLE (Nhân viên)
CREATE TABLE dbo.Employee (
    EmployeeID             VARCHAR(20)      NOT NULL, -- e.g., 'emp-01'
    EmployeeCode           VARCHAR(20)      NOT NULL, -- e.g., 'EMP-1001'
    FullName               NVARCHAR(100)    NOT NULL,
    Email                  VARCHAR(100)     NOT NULL,
    Phone                  VARCHAR(30)      NULL,
    PasswordHash           NVARCHAR(255)    NOT NULL,
    Role                   VARCHAR(50)      NOT NULL, -- 'Manager', 'Retail Staff', 'Field Engineer', 'Senior Accountant', 'Support Agent'
    Department             NVARCHAR(100)    NOT NULL, -- 'Administration', 'Retail Outlets', 'Technical Operations', 'Finance & Accounts'
    StoreID                VARCHAR(20)      NULL,     -- Assigned Retail Shop FK
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Active',
    DateOfJoining          DATE             NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    AvatarUrl              NVARCHAR(500)    NULL,
    Address                NVARCHAR(255)    NULL,
    Gender                 NVARCHAR(20)     NULL,
    DateOfBirth            DATE             NULL,
    Bio                    NVARCHAR(500)    NULL,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_Employee PRIMARY KEY CLUSTERED (EmployeeID),
    CONSTRAINT UQ_Employee_Email UNIQUE (Email),
    CONSTRAINT UQ_Employee_Code UNIQUE (EmployeeCode),
    CONSTRAINT FK_Employee_RetailStore FOREIGN KEY (StoreID) REFERENCES dbo.RetailStore(StoreID) ON DELETE SET NULL,
    CONSTRAINT CK_Employee_Status CHECK (Status IN ('Active', 'Inactive', 'Suspended'))
);
GO

-- 2.3. VENDOR TABLE (Nhà cung cấp thiết bị viễn thông)
CREATE TABLE dbo.Vendor (
    VendorID               VARCHAR(20)      NOT NULL, -- e.g., 'vnd-01'
    VendorCode             VARCHAR(20)      NOT NULL, -- e.g., 'VND-401'
    CompanyName            NVARCHAR(150)    NOT NULL,
    ContactPerson          NVARCHAR(100)    NULL,
    Category               NVARCHAR(100)    NOT NULL, -- 'Fiber Optics & Cabling', 'Modems & Routers', 'Telecom Switches', 'Field Tooling'
    Phone                  VARCHAR(30)      NULL,
    Email                  VARCHAR(100)     NULL,
    Address                NVARCHAR(255)    NULL,
    TaxNumber              VARCHAR(50)      NULL,
    Rating                 TINYINT          NOT NULL DEFAULT 5,
    Status                 VARCHAR(30)      NOT NULL DEFAULT 'Active',
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_Vendor PRIMARY KEY CLUSTERED (VendorID),
    CONSTRAINT UQ_Vendor_Code UNIQUE (VendorCode),
    CONSTRAINT CK_Vendor_Rating CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT CK_Vendor_Status CHECK (Status IN ('Active', 'Pending Review', 'Terminated'))
);
GO

-- 2.4. SERVICE PLAN TABLE (Gói cước viễn thông)
CREATE TABLE dbo.ServicePlan (
    PlanID                 VARCHAR(30)      NOT NULL, -- e.g., 'plan-bb-64', 'plan-du-56', 'plan-ll-std-m'
    PlanCode               VARCHAR(30)      NULL,     -- Commercial tariff code e.g., 'BB-U64'
    Name                   NVARCHAR(150)    NOT NULL,
    ConnectionType         VARCHAR(20)      NOT NULL, -- 'Broadband', 'Dial-Up', 'Landline'
    SpeedOrBandwidth       VARCHAR(100)     NOT NULL, -- e.g., '56 Kbps', '128 Kbps', 'PSTN Voice'
    MonthlyRental          DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    HourlyCharge           DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    SecurityDeposit        DECIMAL(18, 2)   NOT NULL DEFAULT 0.00, -- 500 Broadband / 325 Dial-Up / 250 Landline
    DataLimit              VARCHAR(50)      NULL,     -- 'Unlimited', '10 Hours', '30 Hours', 'Local Calling'
    BillingCycle           VARCHAR(30)      NOT NULL DEFAULT 'Monthly', -- 'Hourly Pack', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'
    Validity               VARCHAR(50)      NULL,     -- '1 Month', '3 Months', '6 Months', '1 Year'
    IncludedHours          INT              NOT NULL DEFAULT 0,
    CallRates              NVARCHAR(255)    NULL,
    Description            NVARCHAR(500)    NULL,
    IsPopular              BIT              NOT NULL DEFAULT 0,
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Active',
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_ServicePlan PRIMARY KEY CLUSTERED (PlanID),
    CONSTRAINT CK_ServicePlan_ConnectionType CHECK (ConnectionType IN ('Broadband', 'Dial-Up', 'Landline')),
    CONSTRAINT CK_ServicePlan_Status CHECK (Status IN ('Active', 'Archived'))
);
GO

-- 2.5. INVENTORY ITEM TABLE (Quản lý kho vật tư - Phục vụ trực tiếp Tab Stock của Admin)
CREATE TABLE dbo.InventoryItem (
    InventoryID            VARCHAR(30)      NOT NULL, -- e.g., 'inv-01'
    ItemCode               VARCHAR(50)      NOT NULL, -- e.g., 'EQ-ONT-FBR', 'EQ-RTR-AX'
    Name                   NVARCHAR(150)    NOT NULL,
    Category               VARCHAR(50)      NOT NULL, -- 'Modem', 'Router', 'Fiber ONT', 'Splitter', 'Patch Cord', 'VoIP Adapter'
    StockQuantity          INT              NOT NULL DEFAULT 0,
    ReorderLevel           INT              NOT NULL DEFAULT 10,
    UnitCost               DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    Location               NVARCHAR(100)    NULL,     -- e.g., 'Central Depot Bay 4A'
    VendorID               VARCHAR(20)      NULL,     -- Supplier link
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'In Stock',
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_InventoryItem PRIMARY KEY CLUSTERED (InventoryID),
    CONSTRAINT UQ_InventoryItem_Code UNIQUE (ItemCode),
    CONSTRAINT FK_InventoryItem_Vendor FOREIGN KEY (VendorID) REFERENCES dbo.Vendor(VendorID) ON DELETE SET NULL,
    CONSTRAINT CK_InventoryItem_Stock CHECK (StockQuantity >= 0)
);
GO

-- 2.6. CUSTOMER TABLE (Khách hàng)
CREATE TABLE dbo.Customer (
    CustomerID             VARCHAR(20)      NOT NULL, -- e.g., 'CUST-0001'
    FullName               NVARCHAR(100)    NOT NULL,
    CustomerType           VARCHAR(20)      NOT NULL DEFAULT 'Individual', -- 'Individual' vs 'Corporate' (Bulk scheme)
    Email                  VARCHAR(100)     NULL,
    ContactNumber          VARCHAR(30)      NOT NULL,
    Address                NVARCHAR(255)    NOT NULL,
    BillingAddress         NVARCHAR(255)    NULL,     -- Separate billing location for corporate accounts
    TaxNumber              VARCHAR(50)      NULL,     -- Tax registration number for B2B accounts
    IdProofType            VARCHAR(50)      NOT NULL DEFAULT 'National ID Card',
    IdProofNumber          VARCHAR(50)      NOT NULL,
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Active',
    PasswordHash           NVARCHAR(255)    NULL,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_Customer PRIMARY KEY CLUSTERED (CustomerID),
    CONSTRAINT CK_Customer_Type CHECK (CustomerType IN ('Individual', 'Corporate')),
    CONSTRAINT CK_Customer_IdProofType CHECK (IdProofType IN ('National ID Card', 'Passport', 'Driver''s License')),
    CONSTRAINT CK_Customer_Status CHECK (Status IN ('Active', 'Suspended', 'Terminated'))
);
GO

-- 2.7. ORDERS TABLE (Đơn hàng & Khảo sát đo kiểm)
CREATE TABLE dbo.Orders (
    OrderID                VARCHAR(11)      NOT NULL, -- Exactly 11 chars: [D|B|T] + 10 digits
    CustomerID             VARCHAR(20)      NOT NULL,
    PlanID                 VARCHAR(30)      NOT NULL,
    StoreID                VARCHAR(20)      NOT NULL,
    EmployeeID             VARCHAR(20)      NULL,     -- Retail sales executive who registered order
    InstallationAddress    NVARCHAR(255)    NOT NULL,
    ApplicationDate        DATETIME         NOT NULL DEFAULT GETDATE(),
    Status                 VARCHAR(30)      NOT NULL DEFAULT 'Pending',

    -- Technical Feasibility Metrics
    CableDistanceMeters    INT              NULL,
    DpBoxCapacity          NVARCHAR(100)    NULL,
    SignalLossDbm          DECIMAL(5, 2)    NULL,
    FeasibilityNotes       NVARCHAR(500)    NULL,
    FeasibilityCheckedBy   VARCHAR(20)      NULL,     -- Field engineer who verified line
    FeasibilityCheckedDate DATETIME         NULL,
    ScheduledInstallDate   DATETIME         NULL,
    RejectionReason        NVARCHAR(500)    NULL,

    -- Khâu Cửa hàng bán lẻ (Retail Stage): lưu vết ai duyệt hồ sơ và ghi chú kèm theo
    RetailApprovedBy       NVARCHAR(100)    NULL,
    RetailApprovedDate     DATETIME         NULL,
    RetailApprovalNotes    NVARCHAR(500)    NULL,

    -- Phân công kỹ thuật viên đi khảo sát (EmployeeID chỉ giữ mã, 3 cột này giữ thông tin hiển thị)
    AssignedTechnicianName  NVARCHAR(100)   NULL,
    AssignedTechnicianPhone VARCHAR(20)     NULL,
    AssignedTechnicianDate  DATETIME        NULL,

    -- Bulk / Corporate Scheme Discounts (Mặc định 50 connection / router thiết bị per Phương án 1)
    BulkConnectionsCount   INT              NOT NULL DEFAULT 50,
    BulkDiscountPercent    DECIMAL(5, 2)    NOT NULL DEFAULT 0.00,
    -- Miễn tiền cọc khi đơn trên 50 kết nối (đề bài: "above 50 ... 100% discount").
    -- Cột tính toán: SQL Server tự tính theo BulkConnectionsCount, không lệch được.
    DepositWaived          AS CAST(CASE WHEN BulkConnectionsCount > 50 THEN 1 ELSE 0 END AS BIT),

    -- Dial-Up Dual-Leg Feasibility Flags
    ExistingLandlineAccountId VARCHAR(20)   NULL,
    LandlineFeasible       BIT              NULL,
    InternetFeasible       BIT              NULL,
    AssignedAccountId      VARCHAR(20)      NULL,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (OrderID),
    CONSTRAINT FK_Orders_Customer FOREIGN KEY (CustomerID) REFERENCES dbo.Customer(CustomerID),
    CONSTRAINT FK_Orders_ServicePlan FOREIGN KEY (PlanID) REFERENCES dbo.ServicePlan(PlanID),
    CONSTRAINT FK_Orders_RetailStore FOREIGN KEY (StoreID) REFERENCES dbo.RetailStore(StoreID),
    CONSTRAINT FK_Orders_Employee FOREIGN KEY (EmployeeID) REFERENCES dbo.Employee(EmployeeID) ON DELETE SET NULL,
    CONSTRAINT FK_Orders_FeasibilityEngineer FOREIGN KEY (FeasibilityCheckedBy) REFERENCES dbo.Employee(EmployeeID),
    CONSTRAINT CK_Orders_ID_Format CHECK (LEN(OrderID) = 11 AND OrderID LIKE '[DBT][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    -- 6 trạng thái khớp với type OrderStatus bên frontend (src/types/nexus.ts):
    -- PendingRetail -> chờ cửa hàng bán lẻ duyệt; Not Approved -> bán lẻ từ chối;
    -- Pending -> đã chuyển sang hàng đợi khảo sát của Kỹ thuật.
    CONSTRAINT CK_Orders_Status CHECK (Status IN ('PendingRetail', 'Not Approved', 'Pending', 'Feasible', 'Not Feasible', 'Connection Provided')),
    CONSTRAINT CK_Orders_BulkDiscount CHECK (BulkDiscountPercent >= 0 AND BulkDiscountPercent <= 100)
);
GO

-- 2.8. EQUIPMENT TABLE (Thiết bị định danh đã gán kết nối hoặc CPE sẵn sàng triển khai)
CREATE TABLE dbo.Equipment (
    EquipmentID            VARCHAR(20)      NOT NULL, -- e.g., 'eq-01'
    InventoryID            VARCHAR(30)      NULL,     -- Link to stock catalog model
    SerialNumber           VARCHAR(50)      NULL,
    MacAddress             VARCHAR(50)      NULL,
    DeviceModel            NVARCHAR(150)    NOT NULL,
    DeviceType             VARCHAR(50)      NOT NULL, -- 'Fiber ONT Modem', 'VDSL2/ADSL Modem', 'Gigabit Router', 'Analog Telephone Adapter'
    VendorID               VARCHAR(20)      NOT NULL,
    StoreID                VARCHAR(20)      NULL,     -- Assigned depot/store
    Status                 VARCHAR(30)      NOT NULL DEFAULT 'In Stock', -- 'In Service', 'In Stock', 'Maintenance', 'Faulty'
    FirmwareVersion        VARCHAR(50)      NULL,
    AssignedAccountId      VARCHAR(20)      NULL,
    AssignedTechnicianId   VARCHAR(20)      NULL,     -- Field engineer assigned
    InstalledDate          DATETIME         NULL,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_Equipment PRIMARY KEY CLUSTERED (EquipmentID),
    CONSTRAINT UQ_Equipment_SerialNumber UNIQUE (SerialNumber),
    CONSTRAINT FK_Equipment_Inventory FOREIGN KEY (InventoryID) REFERENCES dbo.InventoryItem(InventoryID) ON DELETE SET NULL,
    CONSTRAINT FK_Equipment_Vendor FOREIGN KEY (VendorID) REFERENCES dbo.Vendor(VendorID),
    CONSTRAINT FK_Equipment_RetailStore FOREIGN KEY (StoreID) REFERENCES dbo.RetailStore(StoreID) ON DELETE SET NULL,
    CONSTRAINT FK_Equipment_Employee FOREIGN KEY (AssignedTechnicianId) REFERENCES dbo.Employee(EmployeeID) ON DELETE SET NULL,
    CONSTRAINT CK_Equipment_Status CHECK (Status IN ('In Stock', 'In Service', 'Maintenance', 'Faulty'))
);
GO

-- 2.9. CUSTOMER CONNECTION TABLE (Đường truyền thuê bao viễn thông)
CREATE TABLE dbo.CustomerConnection (
    AccountID              VARCHAR(20)      NOT NULL, -- 16-20 char canonical account identifier
    OrderID                VARCHAR(11)      NOT NULL, -- Phương án 1: 1 Order -> N Connections (cho phép nhiều connection trên 1 đơn hàng)
    EquipmentID            VARCHAR(20)      NULL,     -- 1 Connection = 1 Router thiết bị duy nhất (ràng buộc qua UQ_CustomerConnection_EquipmentID)
    Status                 VARCHAR(30)      NOT NULL DEFAULT 'Active',
    IpAddress              VARCHAR(50)      NULL,
    PortNumber             VARCHAR(50)      NULL,
    InstalledDate          DATETIME         NOT NULL DEFAULT GETDATE(),
    SuspensionStartDate    DATETIME         NULL,
    SuspensionEndDate      DATETIME         NULL,
    TerminatedDate         DATETIME         NULL,
    LastUpdated            DATETIME         NOT NULL DEFAULT GETDATE(),
    LastStatusReason       NVARCHAR(500)    NULL,

    CONSTRAINT PK_CustomerConnection PRIMARY KEY CLUSTERED (AccountID),
    CONSTRAINT FK_CustomerConnection_Order FOREIGN KEY (OrderID) REFERENCES dbo.Orders(OrderID),
    CONSTRAINT FK_CustomerConnection_Equipment FOREIGN KEY (EquipmentID) REFERENCES dbo.Equipment(EquipmentID) ON DELETE SET NULL,
    CONSTRAINT CK_CustomerConnection_Status CHECK (Status IN ('Active', 'Temporarily Inactive', 'Permanently Inactive'))
);
GO

-- 2.10. BILL / INVOICE TABLE (Hóa đơn cước)
CREATE TABLE dbo.Bill (
    BillID                 VARCHAR(30)      NOT NULL, -- e.g., 'bill-01'
    InvoiceNumber          VARCHAR(50)      NOT NULL, -- e.g., 'NEX-INV-2026-001'
    AccountID              VARCHAR(20)      NOT NULL,
    BillingMonth           VARCHAR(30)      NOT NULL, -- e.g., 'August 2026'
    BillingPeriodStart     DATE             NULL,
    BillingPeriodEnd       DATE             NULL,
    BillingDate            DATE             NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    DueDate                DATE             NOT NULL,

    -- Financial Breakdown
    SecurityDeposit        DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    MonthlyRental          DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    HourlyCharges          DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    DiscountPercent        DECIMAL(5, 2)    NOT NULL DEFAULT 0.00,
    DiscountAmount         DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    Subtotal               DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    ServiceTaxRate         DECIMAL(5, 2)    NOT NULL DEFAULT 12.24, -- 12.24%
    ServiceTaxAmount       DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    LateFeeAmount          DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    TotalAmount            DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,

    -- Settlement Tracking
    AmountPaid             DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    DueAmount              DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Unpaid',
    GeneratedDate          DATETIME         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Bill PRIMARY KEY CLUSTERED (BillID),
    CONSTRAINT UQ_Bill_InvoiceNumber UNIQUE (InvoiceNumber),
    CONSTRAINT FK_Bill_CustomerConnection FOREIGN KEY (AccountID) REFERENCES dbo.CustomerConnection(AccountID),
    CONSTRAINT CK_Bill_Status CHECK (Status IN ('Paid', 'Partially Paid', 'Unpaid'))
);
GO

-- 2.11. PAYMENT TABLE (Biên lai thu cước)
CREATE TABLE dbo.Payment (
    PaymentID              VARCHAR(30)      NOT NULL, -- e.g., 'PAY-89201'
    ReceiptNumber          VARCHAR(50)      NULL,     -- Customer voucher number
    BillID                 VARCHAR(30)      NOT NULL,
    EmployeeID             VARCHAR(20)      NULL,     -- Senior accountant who recorded payment
    AmountPaid             DECIMAL(18, 2)   NOT NULL,
    PaymentDate            DATETIME         NOT NULL DEFAULT GETDATE(),
    PaymentMode            VARCHAR(50)      NOT NULL, -- 'Cash', 'Cheque', 'Credit/Debit Card', 'Bank Transfer/NEFT', 'UPI/Digital Wallet'
    ReferenceNumber        VARCHAR(100)     NULL,
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Completed',
    Notes                  NVARCHAR(255)    NULL,

    CONSTRAINT PK_Payment PRIMARY KEY CLUSTERED (PaymentID),
    CONSTRAINT UQ_Payment_ReceiptNumber UNIQUE (ReceiptNumber),
    CONSTRAINT FK_Payment_Bill FOREIGN KEY (BillID) REFERENCES dbo.Bill(BillID),
    CONSTRAINT FK_Payment_Employee FOREIGN KEY (EmployeeID) REFERENCES dbo.Employee(EmployeeID) ON DELETE SET NULL,
    CONSTRAINT CK_Payment_Mode CHECK (PaymentMode IN ('Cash', 'Cheque', 'Credit/Debit Card', 'Bank Transfer/NEFT', 'UPI/Digital Wallet')),
    CONSTRAINT CK_Payment_Status CHECK (Status IN ('Completed', 'Pending Clearance', 'Failed', 'Refunded'))
);
GO

-- 2.13. PURCHASE ORDER TABLE (Purchase List — đơn đặt mua thiết bị từ vendor)
-- Spec: Admin quản lý "purchasal lists"; công ty "order for the equipments based
-- on the orders received for the connection". Đơn Received tự cộng InventoryItem.
CREATE TABLE dbo.PurchaseOrder (
    PurchaseOrderID        VARCHAR(30)      NOT NULL,
    VendorID               VARCHAR(20)      NOT NULL,
    StoreID                VARCHAR(20)      NULL,
    ItemCode               VARCHAR(50)      NOT NULL,
    ItemName               NVARCHAR(150)    NOT NULL,
    Category               NVARCHAR(50)     NOT NULL DEFAULT N'Modem',
    Quantity               INT              NOT NULL DEFAULT 1 CHECK (Quantity >= 1),
    UnitCost               DECIMAL(18,2)    NOT NULL DEFAULT 0,
    TotalCost              DECIMAL(18,2)    NOT NULL DEFAULT 0,
    OrderDate              DATETIME         NOT NULL DEFAULT GETDATE(),
    ExpectedDate           DATETIME         NULL,
    ReceivedDate           DATETIME         NULL,
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Draft' CHECK (Status IN ('Draft','Submitted','Received','Cancelled')),
    Notes                  NVARCHAR(500)    NULL,
    CreatedBy              NVARCHAR(100)    NULL,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,
    CONSTRAINT PK_PurchaseOrder PRIMARY KEY (PurchaseOrderID),
    CONSTRAINT FK_PurchaseOrder_Vendor FOREIGN KEY (VendorID) REFERENCES dbo.Vendor(VendorID),
    CONSTRAINT FK_PurchaseOrder_RetailStore FOREIGN KEY (StoreID) REFERENCES dbo.RetailStore(StoreID)
);
CREATE INDEX IX_PurchaseOrder_Status ON dbo.PurchaseOrder(Status);
CREATE INDEX IX_PurchaseOrder_VendorID ON dbo.PurchaseOrder(VendorID);

-- 2.14. EQUIPMENT REQUEST TABLE (Yêu cầu nhập thiết bị / vật tư từ Kỹ thuật viên gửi Admin)
CREATE TABLE dbo.EquipmentRequest (
    RequestID              VARCHAR(30)      NOT NULL, -- e.g. 'REQ-20260928-0001'
    OrderID                VARCHAR(11)      NULL,     -- Link to customer order if triggered from order
    StoreID                VARCHAR(20)      NOT NULL, -- RetailStore requesting stock
    EmployeeID             VARCHAR(20)      NOT NULL, -- Technician / requester
    InventoryID            VARCHAR(30)      NULL,     -- Link to stock catalog model
    ItemName               NVARCHAR(150)    NOT NULL, -- e.g. 'AX-100 Fiber Modem'
    DeviceType             VARCHAR(50)      NOT NULL, -- 'Modem', 'Router', 'Fiber ONT Modem', etc.
    Quantity               INT              NOT NULL DEFAULT 1 CHECK (Quantity >= 1),
    Urgency                VARCHAR(20)      NOT NULL DEFAULT 'Normal' CHECK (Urgency IN ('Low', 'Normal', 'High', 'Urgent')),
    Status                 VARCHAR(30)      NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Fulfilled', 'Rejected')),
    Reason                 NVARCHAR(500)    NULL,
    AdminNotes             NVARCHAR(500)    NULL,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    UpdatedAt              DATETIME         NULL,

    CONSTRAINT PK_EquipmentRequest PRIMARY KEY CLUSTERED (RequestID),
    CONSTRAINT FK_EquipmentRequest_Orders FOREIGN KEY (OrderID) REFERENCES dbo.Orders(OrderID) ON DELETE SET NULL,
    CONSTRAINT FK_EquipmentRequest_RetailStore FOREIGN KEY (StoreID) REFERENCES dbo.RetailStore(StoreID),
    CONSTRAINT FK_EquipmentRequest_Employee FOREIGN KEY (EmployeeID) REFERENCES dbo.Employee(EmployeeID),
    CONSTRAINT FK_EquipmentRequest_Inventory FOREIGN KEY (InventoryID) REFERENCES dbo.InventoryItem(InventoryID) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX IX_EquipmentRequest_Status ON dbo.EquipmentRequest(Status);
CREATE NONCLUSTERED INDEX IX_EquipmentRequest_StoreID ON dbo.EquipmentRequest(StoreID);
CREATE NONCLUSTERED INDEX IX_EquipmentRequest_EmployeeID ON dbo.EquipmentRequest(EmployeeID);
CREATE NONCLUSTERED INDEX IX_EquipmentRequest_OrderID ON dbo.EquipmentRequest(OrderID);

-- 2.12. CUSTOMER FEEDBACK TABLE (Ý kiến đóng góp & khiếu nại của khách hàng)
CREATE TABLE dbo.Feedback (
    FeedbackID             VARCHAR(30)      NOT NULL, -- e.g., 'fb-01'
    AccountID              VARCHAR(20)      NULL,
    OrderID                VARCHAR(11)      NULL,
    CustomerID             VARCHAR(20)      NULL,
    CustomerName           NVARCHAR(100)    NOT NULL,
    Rating                 TINYINT          NOT NULL DEFAULT 5,
    Category               VARCHAR(50)      NOT NULL, -- 'Service Quality', 'Installation', 'Billing', 'Support', 'Other'
    Message                NVARCHAR(MAX)    NOT NULL,
    Status                 VARCHAR(20)      NOT NULL DEFAULT 'Resolved',
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),
    Response               NVARCHAR(MAX)    NULL,
    RespondedBy            VARCHAR(20)      NULL,     -- Staff who replied
    RespondedAt            DATETIME         NULL,

    CONSTRAINT PK_Feedback PRIMARY KEY CLUSTERED (FeedbackID),
    CONSTRAINT FK_Feedback_CustomerConnection FOREIGN KEY (AccountID) REFERENCES dbo.CustomerConnection(AccountID) ON DELETE SET NULL,
    CONSTRAINT FK_Feedback_Orders FOREIGN KEY (OrderID) REFERENCES dbo.Orders(OrderID) ON DELETE SET NULL,
    CONSTRAINT FK_Feedback_Customer FOREIGN KEY (CustomerID) REFERENCES dbo.Customer(CustomerID) ON DELETE SET NULL,
    CONSTRAINT FK_Feedback_Employee FOREIGN KEY (RespondedBy) REFERENCES dbo.Employee(EmployeeID) ON DELETE SET NULL,
    CONSTRAINT CK_Feedback_Rating CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT CK_Feedback_Category CHECK (Category IN ('Service Quality', 'Installation', 'Billing', 'Support', 'Other')),
    CONSTRAINT CK_Feedback_Status CHECK (Status IN ('New', 'Under Review', 'Resolved', 'Closed'))
);
GO

-- 2.13. LIVE CHAT MESSAGE TABLE (Tin nhắn chat trực tuyến giữa khách trên trang index và Admin)
CREATE TABLE dbo.ChatMessage (
    MessageID              VARCHAR(30)      NOT NULL, -- e.g., 'msg-0001'
    SessionID              VARCHAR(30)      NOT NULL, -- e.g., 'chat-01' (một phiên chat của khách)
    SenderType             VARCHAR(10)      NOT NULL, -- 'guest' | 'admin'
    SenderName             NVARCHAR(100)    NOT NULL,
    Message                NVARCHAR(1000)   NOT NULL,
    IsReadByAdmin          BIT              NOT NULL DEFAULT 0,
    CreatedAt              DATETIME         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_ChatMessage PRIMARY KEY CLUSTERED (MessageID),
    CONSTRAINT CK_ChatMessage_SenderType CHECK (SenderType IN ('guest', 'admin'))
);
GO

CREATE NONCLUSTERED INDEX IX_ChatMessage_SessionID ON dbo.ChatMessage(SessionID, CreatedAt);
GO

-- 2.13. SYSTEM SETTINGS TABLE (Tham số cấu hình hệ thống)
CREATE TABLE dbo.SystemSettings (
    SettingKey             VARCHAR(50)      NOT NULL,
    SettingValue           NVARCHAR(255)    NOT NULL,
    Category               VARCHAR(50)      NOT NULL DEFAULT 'General',
    DataType               VARCHAR(20)      NOT NULL DEFAULT 'string',
    Description            NVARCHAR(255)    NULL,
    LastUpdated            DATETIME         NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_SystemSettings PRIMARY KEY CLUSTERED (SettingKey)
);
GO

-- 2.14. CONNECTION ACTIVITY LOG (Lịch sử hoạt động thuê bao - Audit Trail)
CREATE TABLE dbo.ConnectionActivityLog (
    LogID                  BIGINT IDENTITY(1,1) NOT NULL,
    AccountID              VARCHAR(20)          NOT NULL,
    ActionType             VARCHAR(50)          NOT NULL, -- 'Provisioning', 'StatusChange', 'PlanUpgrade', 'PlanDowngrade', 'DeviceReplacement', 'Relocation'
    OldValue               NVARCHAR(255)        NULL,
    NewValue               NVARCHAR(255)        NULL,
    Reason                 NVARCHAR(500)        NULL,
    PerformedBy            VARCHAR(20)          NULL,     -- Staff ID
    Timestamp              DATETIME             NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_ConnectionActivityLog PRIMARY KEY CLUSTERED (LogID),
    CONSTRAINT FK_ConnectionActivityLog_Account FOREIGN KEY (AccountID) REFERENCES dbo.CustomerConnection(AccountID) ON DELETE CASCADE,
    CONSTRAINT FK_ConnectionActivityLog_Employee FOREIGN KEY (PerformedBy) REFERENCES dbo.Employee(EmployeeID) ON DELETE SET NULL
);
GO

-- ===================================================================================
-- 3. OPTIMIZED PERFORMANCE INDEXES
-- ===================================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE NONCLUSTERED INDEX IX_Orders_CustomerID ON dbo.Orders(CustomerID);
CREATE NONCLUSTERED INDEX IX_Orders_StoreID ON dbo.Orders(StoreID);
CREATE NONCLUSTERED INDEX IX_Orders_Status ON dbo.Orders(Status);
CREATE NONCLUSTERED INDEX IX_CustomerConnection_OrderID ON dbo.CustomerConnection(OrderID);
CREATE NONCLUSTERED INDEX IX_CustomerConnection_Status ON dbo.CustomerConnection(Status);
-- Ràng buộc 1 Connection = 1 Router thiết bị: Mỗi Router thiết bị chỉ thuộc về tối đa 1 Connection đang kích hoạt
CREATE UNIQUE NONCLUSTERED INDEX UQ_CustomerConnection_EquipmentID ON dbo.CustomerConnection(EquipmentID) WHERE EquipmentID IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_Bill_AccountID ON dbo.Bill(AccountID);
CREATE NONCLUSTERED INDEX IX_Bill_Status ON dbo.Bill(Status);
CREATE NONCLUSTERED INDEX IX_Bill_DueDate ON dbo.Bill(DueDate);
CREATE NONCLUSTERED INDEX IX_Payment_BillID ON dbo.Payment(BillID);
CREATE NONCLUSTERED INDEX IX_InventoryItem_Category ON dbo.InventoryItem(Category);
CREATE NONCLUSTERED INDEX IX_Equipment_Status ON dbo.Equipment(Status);
CREATE NONCLUSTERED INDEX IX_Equipment_VendorID ON dbo.Equipment(VendorID);
CREATE NONCLUSTERED INDEX IX_Feedback_AccountID ON dbo.Feedback(AccountID);
CREATE NONCLUSTERED INDEX IX_ConnectionActivityLog_AccountID ON dbo.ConnectionActivityLog(AccountID);
GO

-- ===================================================================================
-- 4. DATABASE VIEWS FOR REPORTING & REAL-TIME ANALYTICS
-- ===================================================================================

-- 4.1. Active Subscribers View
CREATE OR ALTER VIEW dbo.vw_ActiveSubscribers
AS
SELECT 
    cc.AccountID,
    cc.OrderID,
    c.CustomerID,
    c.FullName AS CustomerName,
    c.CustomerType,
    c.ContactNumber AS CustomerPhone,
    c.Email AS CustomerEmail,
    o.InstallationAddress,
    p.Name AS PlanName,
    p.ConnectionType,
    p.MonthlyRental,
    p.SecurityDeposit,
    cc.Status AS ConnectionStatus,
    cc.IpAddress,
    cc.PortNumber,
    eq.SerialNumber AS DeviceSerial,
    eq.DeviceModel,
    rs.Name AS RetailStoreName,
    cc.InstalledDate,
    cc.LastUpdated
FROM dbo.CustomerConnection cc
INNER JOIN dbo.Orders o ON cc.OrderID = o.OrderID
INNER JOIN dbo.Customer c ON o.CustomerID = c.CustomerID
INNER JOIN dbo.ServicePlan p ON o.PlanID = p.PlanID
INNER JOIN dbo.RetailStore rs ON o.StoreID = rs.StoreID
LEFT JOIN dbo.Equipment eq ON cc.EquipmentID = eq.EquipmentID;
GO

-- 4.2. Invoices & Aging Report View
CREATE OR ALTER VIEW dbo.vw_BillingSummary
AS
SELECT 
    b.BillID,
    b.InvoiceNumber,
    b.AccountID,
    c.FullName AS CustomerName,
    c.CustomerType,
    b.BillingMonth,
    b.BillingDate,
    b.DueDate,
    b.Subtotal,
    b.ServiceTaxAmount,
    b.LateFeeAmount,
    b.TotalAmount,
    b.AmountPaid,
    b.DueAmount,
    b.Status AS BillStatus,
    CASE 
        WHEN b.Status = 'Paid' THEN 0
        WHEN DATEDIFF(DAY, b.DueDate, GETDATE()) > 0 THEN DATEDIFF(DAY, b.DueDate, GETDATE())
        ELSE 0
    END AS DaysOverdue
FROM dbo.Bill b
INNER JOIN dbo.CustomerConnection cc ON b.AccountID = cc.AccountID
INNER JOIN dbo.Orders o ON cc.OrderID = o.OrderID
INNER JOIN dbo.Customer c ON o.CustomerID = c.CustomerID;
GO

-- 4.3. Retail Store Performance Statistics View
CREATE OR ALTER VIEW dbo.vw_RetailStoreStats
AS
SELECT 
    rs.StoreID,
    rs.Name AS StoreName,
    rs.City,
    rs.CityCode,
    rs.ManagerName,
    rs.Status AS StoreStatus,
    COUNT(DISTINCT e.EmployeeID) AS ActualEmployeeCount,
    COUNT(DISTINCT o.OrderID) AS TotalOrdersCount,
    COUNT(DISTINCT cc.AccountID) AS TotalSubscribersCount
FROM dbo.RetailStore rs
LEFT JOIN dbo.Employee e ON rs.StoreID = e.StoreID AND e.Status = 'Active'
LEFT JOIN dbo.Orders o ON rs.StoreID = o.StoreID
LEFT JOIN dbo.CustomerConnection cc ON o.OrderID = cc.OrderID
GROUP BY rs.StoreID, rs.Name, rs.City, rs.CityCode, rs.ManagerName, rs.Status;
GO

-- 4.4. Inventory Stock & Hardware View
CREATE OR ALTER VIEW dbo.vw_InventoryStock
AS
SELECT 
    inv.InventoryID,
    inv.ItemCode,
    inv.Name AS ItemName,
    inv.Category,
    inv.StockQuantity,
    inv.ReorderLevel,
    inv.UnitCost,
    (inv.StockQuantity * inv.UnitCost) AS TotalStockValue,
    v.CompanyName AS SupplierName,
    inv.Location,
    CASE WHEN inv.StockQuantity <= inv.ReorderLevel THEN 1 ELSE 0 END AS IsLowStock
FROM dbo.InventoryItem inv
LEFT JOIN dbo.Vendor v ON inv.VendorID = v.VendorID;
GO

-- ===================================================================================
-- 5. COMPREHENSIVE SEED DATA (CLEAN UTF-8, NO SPECIAL CHARACTER MOJIBAKE)
-- ===================================================================================

PRINT '>> Inserting Clean Comprehensive Seed Data...';

-- 5.1. RETAIL OUTLETS (4 Cửa hàng bán lẻ)
INSERT INTO dbo.RetailStore (StoreID, Name, City, CityCode, Address, ManagerName, Phone, Email, OperatingHours, Status, ActiveEmployeesCount, TotalSubscribersServed)
VALUES
('SH-01', N'Downtown Nexus Flagship Store', N'New York', '064', N'452 Broadway, Manhattan, NY 10013', N'David Chen', '+1 (212) 555-0144', 'flagship.sh01@nexus.telecom', N'Mon-Sat: 08:30 - 20:00, Sun: 10:00 - 18:00', 'Active', 6, 1420),
('SH-02', N'Metro Uptown Tech Hub', N'New York', '064', N'2190 Broadway, Upper West Side, NY 10024', N'Aiden Brooks', '+1 (212) 555-0189', 'uptown.sh02@nexus.telecom', N'Mon-Sat: 09:00 - 19:30', 'Active', 4, 980),
('SH-03', N'Queens Central Service Center', N'Queens', '072', N'70-20 Austin St, Forest Hills, NY 11375', N'Kavita Patel', '+1 (718) 555-0199', 'queens.sh03@nexus.telecom', N'Mon-Fri: 09:00 - 18:00, Sat: 09:00 - 15:00', 'Active', 3, 750),
('SH-04', N'Brooklyn Nexus Connect Depot', N'Brooklyn', '081', N'320 Atlantic Ave, Boerum Hill, NY 11201', N'Robert Gomez', '+1 (718) 555-0210', 'brooklyn.sh04@nexus.telecom', N'Mon-Sat: 09:00 - 19:00', 'Active', 5, 1120);

-- 5.2. EMPLOYEES (5 Nhân viên nòng cốt các bộ phận)
INSERT INTO dbo.Employee (EmployeeID, EmployeeCode, FullName, Email, Phone, PasswordHash, Role, Department, StoreID, Status, DateOfJoining, AvatarUrl, Address, Gender, DateOfBirth, Bio)
VALUES
('emp-01', 'EMP-1001', N'Sarah Jenkins', 'sarah.jenkins@nexus.telecom', '+1 (555) 234-8901', '$2a$11$MQZaoLKrxeF1DJZMGT/PkONm.ppYEF8VCS4mYIbi8C/PNPsaPSaxK', 'Manager', N'Administration', NULL, 'Active', '2022-03-15', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', N'742 Evergreen Terrace, NY', N'Female', '1988-04-12', N'Senior Operations Manager leading overall telecommunication infrastructure and store network.'),
('emp-02', 'EMP-1042', N'David Chen', 'david.chen@nexus.telecom', '+1 (555) 456-1123', '$2a$11$MQZaoLKrxeF1DJZMGT/PkONm.ppYEF8VCS4mYIbi8C/PNPsaPSaxK', 'Retail Staff', N'Retail Outlets', 'SH-01', 'Active', '2023-06-10', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', N'120 Broadway, Manhattan, NY', N'Male', '1992-09-25', N'Flagship Store lead customer representative specialized in corporate bulk schemes.'),
('emp-03', 'EMP-1077', N'Marcus Ramirez', 'marcus.ramirez@nexus.telecom', '+1 (555) 789-3344', '$2a$11$MQZaoLKrxeF1DJZMGT/PkONm.ppYEF8VCS4mYIbi8C/PNPsaPSaxK', 'Field Engineer', N'Technical Operations', 'SH-01', 'Active', '2021-11-04', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', N'88 Bedford Ave, Brooklyn, NY', N'Male', '1990-12-05', N'Lead technical supervisor handling fiber splicing, line attenuation testing, and DP box routing.'),
('emp-04', 'EMP-1090', N'Elena Rostova', 'elena.rostova@nexus.telecom', '+1 (555) 901-5567', '$2a$11$MQZaoLKrxeF1DJZMGT/PkONm.ppYEF8VCS4mYIbi8C/PNPsaPSaxK', 'Senior Accountant', N'Finance & Accounts', NULL, 'Active', '2020-08-20', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', N'45 Wall Street, Suite 900, NY', N'Female', '1985-02-18', N'Head of Billing and Financial Accounts handling ledger audits, invoices, and service tax returns.'),
('emp-05', 'EMP-1105', N'Aiden Brooks', 'aiden.brooks@nexus.telecom', '+1 (555) 345-6789', '$2a$11$MQZaoLKrxeF1DJZMGT/PkONm.ppYEF8VCS4mYIbi8C/PNPsaPSaxK', 'Retail Staff', N'Retail Outlets', 'SH-02', 'Active', '2024-01-15', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', N'220 W 98th St, NY', N'Male', '1995-07-14', N'Customer support specialist and subscriber onboarding executive.');

-- 5.3. VENDORS (4 Nhà cung cấp thiết bị)
INSERT INTO dbo.Vendor (VendorID, VendorCode, CompanyName, ContactPerson, Category, Phone, Email, Address, TaxNumber, Rating, Status)
VALUES
('vnd-01', 'VND-401', N'Corning Optical Systems Ltd', N'Gregory Vance', N'Fiber Optics & Cabling', '+1 (800) 522-6789', 'sales@corning-telecom.com', N'800 Corning Way, Hickory, NC', 'US-TAX-99281', 5, 'Active'),
('vnd-02', 'VND-402', N'Cisco Systems Commercial Hardware', N'Linda Morrison', N'Modems & Routers', '+1 (800) 553-6387', 'enterprise-hw@cisco.com', N'170 West Tasman Dr, San Jose, CA', 'US-TAX-88192', 5, 'Active'),
('vnd-03', 'VND-403', N'Zyxel Communications Corp', N'Kenji Sato', N'Modems & Routers', '+1 (714) 632-0882', 'support-b2b@zyxel.com', N'1130 North Miller St, Anaheim, CA', 'US-TAX-77123', 4, 'Active'),
('vnd-04', 'VND-404', N'Amphenol Telecom Assemblies', N'Rachel Ward', N'Telecom Switches', '+1 (203) 265-8900', 'supply@amphenol-rf.com', N'358 Hall Avenue, Wallingford, CT', 'US-TAX-66512', 4, 'Active');

-- 5.4. SERVICE PLANS (16 Gói cước viễn thông tiêu chuẩn)
INSERT INTO dbo.ServicePlan (PlanID, PlanCode, Name, ConnectionType, SpeedOrBandwidth, MonthlyRental, HourlyCharge, SecurityDeposit, DataLimit, BillingCycle, Validity, IncludedHours, CallRates, Description, IsPopular, Status)
VALUES
('plan-du-h10', 'DU-H10', N'Dial-Up Hourly 10 Hrs', 'Dial-Up', '56 Kbps V.92', 50.00, 5.00, 325.00, '10 Hours', 'Hourly Pack', '1 Month', 10, NULL, N'Prepaid 10-hour dial-up pack, valid for one month.', 0, 'Active'),
('plan-du-h30', 'DU-H30', N'Dial-Up Hourly 30 Hrs', 'Dial-Up', '56 Kbps V.92', 130.00, 4.33, 325.00, '30 Hours', 'Hourly Pack', '3 Months', 30, NULL, N'Prepaid 30-hour dial-up pack, valid for three months.', 0, 'Active'),
('plan-du-h60', 'DU-H60', N'Dial-Up Hourly 60 Hrs', 'Dial-Up', '56 Kbps V.92', 260.00, 4.33, 325.00, '60 Hours', 'Hourly Pack', '6 Months', 60, NULL, N'Prepaid 60-hour dial-up pack, valid for six months.', 0, 'Active'),
('plan-du-h100', 'DU-H100', N'Dial-Up Hourly 100 Hrs', 'Dial-Up', '56 Kbps V.92', 400.00, 4.00, 325.00, '100 Hours', 'Hourly Pack', '1 Year', 100, NULL, N'Prepaid 100-hour dial-up pack, valid for one year.', 0, 'Active'),
('plan-du-28', 'DU-U28', N'Dial-Up Unlimited 28 Kbps', 'Dial-Up', '28 Kbps', 75.00, 0.00, 325.00, 'Unlimited', 'Monthly', '1 Month', 0, NULL, N'Unlimited dial-up access at 28 Kbps. Quarterly billing also available at $150.', 0, 'Active'),
('plan-du-56', 'DU-U56', N'Dial-Up Unlimited 56 Kbps', 'Dial-Up', '56 Kbps', 100.00, 0.00, 325.00, 'Unlimited', 'Monthly', '1 Month', 0, NULL, N'Unlimited dial-up access at 56 Kbps. Quarterly billing also available at $180.', 1, 'Active'),
('plan-bb-h30', 'BB-H30', N'Broadband Hourly 30 Hrs', 'Broadband', 'Broadband', 175.00, 5.83, 500.00, '30 Hours', 'Hourly Pack', '1 Month', 30, NULL, N'Prepaid 30-hour broadband pack, valid for one month.', 0, 'Active'),
('plan-bb-h60', 'BB-H60', N'Broadband Hourly 60 Hrs', 'Broadband', 'Broadband', 315.00, 5.25, 500.00, '60 Hours', 'Hourly Pack', '6 Months', 60, NULL, N'Prepaid 60-hour broadband pack, valid for six months.', 0, 'Active'),
('plan-bb-h120', 'BB-H120', N'Broadband Hourly 120 Hrs', 'Broadband', 'Broadband', 500.00, 4.17, 500.00, '120 Hours', 'Hourly Pack', '3 Months', 120, NULL, N'Prepaid 120-hour broadband pack, valid for three months.', 0, 'Active'),
('plan-bb-64', 'BB-U64', N'Broadband Unlimited 64 Kbps', 'Broadband', '64 Kbps', 225.00, 0.00, 500.00, 'Unlimited', 'Monthly', '1 Month', 0, NULL, N'Unlimited broadband access at 64 Kbps. Quarterly billing available at $400.', 1, 'Active'),
('plan-bb-128', 'BB-U128', N'Broadband Unlimited 128 Kbps', 'Broadband', '128 Kbps', 350.00, 0.00, 500.00, 'Unlimited', 'Monthly', '1 Month', 0, NULL, N'Unlimited broadband access at 128 Kbps. Quarterly billing available at $445.', 1, 'Active'),
('plan-ll-loc-a', 'LL-LOC-A', N'Landline Local Plan A', 'Landline', 'PSTN Voice', 25.00, 0.00, 250.00, 'Local Calling', 'Monthly', '1 Month', 0, N'Local: $1.00/min', N'Local plan, monthly rental. Call charges billed on top of rental.', 0, 'Active'),
('plan-ll-loc-u', 'LL-LOC-U', N'Landline Local Unlimited', 'Landline', 'PSTN Voice', 75.00, 0.00, 250.00, 'Local Calling', 'Yearly', '1 Year', 0, N'Local: 55c/min', N'Local plan, yearly rental per spec. Call charges billed on top of rental.', 0, 'Active'),
('plan-ll-loc-b', 'LL-LOC-B', N'Landline Local Plan B', 'Landline', 'PSTN Voice', 35.00, 0.00, 250.00, 'Local Calling', 'Monthly', '1 Month', 0, N'Local: 75c/min', N'Local plan with discounted call charges.', 0, 'Active'),
('plan-ll-std-m', 'LL-STD-M', N'Landline STD - Monthly', 'Landline', 'PSTN Voice', 125.00, 0.00, 250.00, 'Local + STD', 'Monthly', '1 Month', 0, N'Local: 70c/min | STD: $2.25/min | SMS to mobile: $1.00/min', N'STD plan, monthly rental with local, STD and mobile-messaging call charges.', 1, 'Active'),
('plan-ll-std-h', 'LL-STD-H', N'Landline STD - Half-Yearly', 'Landline', 'PSTN Voice', 420.00, 0.00, 250.00, 'Local + STD', 'Half-Yearly', '6 Months', 0, N'Local: 60c/min | STD: $2.00/min | SMS to mobile: $1.15/min', N'STD plan, half-yearly rental with reduced call charges.', 0, 'Active'),
('plan-ll-std-y', 'LL-STD-Y', N'Landline STD - Yearly', 'Landline', 'PSTN Voice', 780.00, 0.00, 250.00, 'Local + STD', 'Yearly', '1 Year', 0, N'Local: 60c/min | STD: $1.75/min | SMS to mobile: $1.25/min', N'STD plan, yearly rental with the lowest call charges.', 0, 'Active');

-- 5.5. INVENTORY ITEMS (5 Loại vật tư kho hàng - Tab Stock của Admin)
INSERT INTO dbo.InventoryItem (InventoryID, ItemCode, Name, Category, StockQuantity, ReorderLevel, UnitCost, Location, VendorID, Status)
VALUES
('inv-01', 'EQ-ONT-FBR',  N'Huawei EchoLife HG8245H5 GPON ONT',            'Fiber ONT',    145, 25, 55.00, N'Central Depot Bay 4A', 'vnd-02', 'In Stock'),
('inv-02', 'EQ-RTR-AX',   N'Nexus Wi-Fi 6 AX3000 Dual-Band Router',        'Router',        88, 20, 65.00, N'Central Depot Bay 2B', 'vnd-03', 'In Stock'),
('inv-03', 'EQ-MDM-V92',  N'USRobotics 56K V.92 Faxmodem USB/PSTN',        'Modem',         18, 10, 32.00, N'Central Depot Bay 7C', 'vnd-04', 'In Stock'),
('inv-04', 'EQ-ATA-VOIP', N'Grandstream HT802 2-Port Analog VoIP Adapter', 'VoIP Adapter',  42, 15, 28.00, N'Central Depot Bay 3C', 'vnd-04', 'In Stock'),
('inv-05', 'EQ-SPL-1X8',  N'Corning 1x8 PLC Optical Fiber Splitter',       'Splitter',       9, 15, 14.50, N'Central Depot Bay 1A', 'vnd-01', 'In Stock');

-- 5.6. CUSTOMERS (7 Khách hàng cá nhân & doanh nghiệp)
INSERT INTO dbo.Customer (CustomerID, FullName, CustomerType, Email, ContactNumber, Address, BillingAddress, TaxNumber, IdProofType, IdProofNumber, Status)
VALUES
('CUST-0001', N'Arthur Pendelton', 'Individual', 'arthur.p@classiccorp.net', '+1 (555) 902-1844', N'144 West 82nd St, Apt 4B, New York, NY 10024', NULL, NULL, 'National ID Card', 'ID-US-9918231', 'Active'),
('CUST-0002', N'Samantha Vance', 'Individual', 'samantha.vance@gmail.com', '+1 (555) 301-4477', N'78 Mercer St, Soho, New York, NY 10012', NULL, NULL, 'Passport', 'P-98827419', 'Active'),
('CUST-0003', N'Highline Consulting LLC', 'Corporate', 'office@highlineconsulting.com', '+1 (555) 777-8899', N'55 Hudson Yards, Fl 18, New York, NY 10001', N'55 Hudson Yards, Finance Dept, NY 10001', 'TAX-CORP-44910', 'Driver''s License', 'DL-NY-2940192', 'Active'),
('CUST-0004', N'Robert Lewandowski', 'Individual', 'robert.lewan@yahoo.com', '+1 (555) 621-9988', N'89-12 Far Rockaway Blvd, Queens, NY 11693', NULL, NULL, 'National ID Card', 'ID-US-8827391', 'Active'),
('CUST-0005', N'Victoria Sterling', 'Individual', 'v.sterling@apexlegal.org', '+1 (555) 441-2099', N'120 E 64th St, Manhattan, NY 10065', NULL, NULL, 'National ID Card', 'ID-US-7721890', 'Active'),
('CUST-0006', N'Retro Arcade Lounge LLC', 'Corporate', 'manager@retroarcadeny.com', '+1 (555) 332-9011', N'31 St Marks pl, East Village, NY 10003', N'31 St Marks pl, NY 10003', 'TAX-CORP-33109', 'Driver''s License', 'DL-NY-3391024', 'Active'),
('CUST-0007', N'Jonathan Meyer', 'Individual', 'j.meyer@brooklynloft.io', '+1 (555) 881-2300', N'175 Water St, Dumbo, Brooklyn, NY 11201', NULL, NULL, 'Passport', 'P-77123984', 'Active');

-- 5.7. ORDERS (7 Đơn hàng kèm kết quả khảo sát kỹ thuật)
INSERT INTO dbo.Orders (OrderID, CustomerID, PlanID, StoreID, EmployeeID, InstallationAddress, ApplicationDate, Status, CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes, FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason, BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible, AssignedAccountId)
VALUES
('D0000000001', 'CUST-0001', 'plan-du-56', 'SH-02', 'emp-02', N'144 West 82nd St, Apt 4B, New York, NY 10024', '2026-09-04 10:30:00', 'Pending', 420, N'Port 6 Available / DP-B12', -18.50, NULL, NULL, NULL, NULL, NULL, 1, 0.00, NULL, NULL, NULL, NULL),
('B0000000002', 'CUST-0002', 'plan-bb-128', 'SH-01', 'emp-02', N'78 Mercer St, Soho, New York, NY 10012', '2026-09-04 14:15:00', 'Feasible', 85, N'Port 2 Available / DP-S04', -16.20, N'Fiber termination box available within 85m. Signal strength -16.2 dBm (Excellent). Line tested OK.', 'emp-03', '2026-09-04 16:00:00', '2026-09-08', NULL, 1, 0.00, NULL, NULL, 1, 'B064-000000000005'),
('T0000000003', 'CUST-0003', 'plan-ll-std-m', 'SH-01', 'emp-02', N'55 Hudson Yards, Fl 18, New York, NY 10001', '2026-09-02 09:00:00', 'Connection Provided', 120, N'Port 8 Dedicated', -15.10, N'Copper loop line deployed. Line tested and audio quality verified.', 'emp-03', '2026-09-02 11:30:00', '2026-09-02', NULL, 50, 75.00, NULL, 1, NULL, 'T064-000000000001'),
('B0000000004', 'CUST-0004', 'plan-bb-64', 'SH-03', 'emp-05', N'89-12 Far Rockaway Blvd, Queens, NY 11693', '2026-09-03 11:45:00', 'Not Feasible', 1150, N'No Spare Ports', -34.00, N'Distance to nearest fiber distribution box exceeds 1,150 meters. Severe optical attenuation (-34 dBm). Requires main trunk extension.', 'emp-03', '2026-09-03 15:00:00', NULL, N'Distance > 1km and optical loss exceeds threshold (-34 dBm)', 50, 75.00, NULL, NULL, 0, NULL),
('B0000000005', 'CUST-0005', 'plan-bb-64', 'SH-01', 'emp-02', N'120 E 64th St, Manhattan, NY 10065', '2026-08-14 10:00:00', 'Connection Provided', 60, N'Port 1 Dedicated / DP-M01', -14.80, N'Direct splice into riser. Verified gigabit throughput.', 'emp-03', '2026-08-14 14:00:00', '2026-08-15', NULL, 50, 75.00, NULL, NULL, 1, 'B064-000000000002'),
('D0000000006', 'CUST-0006', 'plan-du-56', 'SH-01', 'emp-02', N'31 St Marks pl, East Village, NY 10003', '2026-07-08 15:30:00', 'Connection Provided', 150, N'PSTN Riser Port 3', -17.20, N'PSTN copper pair active.', 'emp-03', '2026-07-09 10:00:00', '2026-07-10', NULL, 50, 75.00, NULL, 1, 1, 'D064-000000000003'),
('B0000000007', 'CUST-0007', 'plan-bb-64', 'SH-04', 'emp-05', N'175 Water St, Dumbo, Brooklyn, NY 11201', '2026-05-15 11:00:00', 'Connection Provided', 90, N'DP-BK-11 Port 4', -15.50, N'Initial install verified.', 'emp-03', '2026-05-16 11:00:00', '2026-05-18', NULL, 50, 75.00, NULL, NULL, 1, 'B081-000000000004');

-- 5.8. EQUIPMENT (6 Thiết bị CPE gán thuê bao hoặc trong kho - mỗi router gán tối đa 1 connection)
INSERT INTO dbo.Equipment (EquipmentID, InventoryID, SerialNumber, MacAddress, DeviceModel, DeviceType, VendorID, StoreID, Status, FirmwareVersion, AssignedAccountId, AssignedTechnicianId, InstalledDate)
VALUES
('eq-01', 'inv-01', 'NX-HW-992810', 'BC:A9:93:21:44:8E', N'Huawei EchoLife HG8245H5 GPON ONT',            'Fiber ONT Modem',          'vnd-02', 'SH-01', 'In Service', 'V500R019C20SPC120', 'B064-000000000002', 'emp-03', '2026-08-15 11:20:00'),
('eq-02', 'inv-04', 'NX-ATA-881920', '00:0B:82:76:D4:11', N'Grandstream HT802 2-Port Analog VoIP Adapter',  'Analog Telephone Adapter', 'vnd-04', 'SH-01', 'In Service', '1.0.35.3',          'T064-000000000001', 'emp-03', '2026-09-02 16:30:00'),
('eq-03', 'inv-03', 'NX-MD-110294',  'F8:E4:FB:99:A2:03', N'USRobotics 56K V.92 Faxmodem USB/PSTN',         'VDSL2/ADSL Modem',         'vnd-04', 'SH-01', 'In Service', 'v2.1.8-PSTN',       'D064-000000000003', 'emp-03', '2026-07-10 14:00:00'),
('eq-04', 'inv-02', 'NX-HW-992811',  '00:1A:2B:3C:4D:5E', N'Nexus Wi-Fi 6 AX3000 Dual-Band Router',         'Gigabit Router',           'vnd-03', 'SH-01', 'In Stock',   'v3.2.4-BUILD-921',  NULL,                NULL,     NULL),
('eq-05', 'inv-01', 'NX-HW-992812',  '54:AF:97:88:B1:00', N'Huawei EchoLife HG8245H5 GPON ONT',             'Fiber ONT Modem',          'vnd-02', 'SH-01', 'In Stock',   'V500R019C20SPC120', NULL,                NULL,     NULL),
('eq-06', 'inv-02', 'NX-HW-992813',  'A0:B1:C2:D3:E4:F5', N'Nexus Wi-Fi 6 AX3000 Dual-Band Router',         'Gigabit Router',           'vnd-03', 'SH-01', 'In Service', 'v3.2.4-BUILD-921',  'T064-000000000008', 'emp-03', '2026-09-02 16:30:00');

-- 5.9. CUSTOMER CONNECTIONS (Thuê bao đường truyền: minh họa 1 Order T0000000003 gắn nhiều Connection, mỗi Connection 1 Router riêng)
INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, SuspensionStartDate, SuspensionEndDate, TerminatedDate, LastUpdated, LastStatusReason)
VALUES
('T064-000000000001', 'T0000000003', 'eq-02', 'Active', '198.51.100.42', 'VOIP-ETH-1', '2026-09-02 09:00:00', NULL, NULL, NULL, '2026-09-02 16:30:00', NULL),
('T064-000000000008', 'T0000000003', 'eq-06', 'Active', '198.51.100.43', 'VOIP-ETH-2', '2026-09-02 09:30:00', NULL, NULL, NULL, '2026-09-02 16:30:00', NULL),
('B064-000000000002', 'B0000000005', 'eq-01', 'Active', '203.0.113.88', 'GPON-0/1/4', '2026-08-15 10:00:00', NULL, NULL, NULL, '2026-08-15 11:20:00', NULL),
('D064-000000000003', 'D0000000006', 'eq-03', 'Temporarily Inactive', '192.0.2.14', 'PSTN-LINE-4', '2026-07-10 14:00:00', '2026-09-01', '2026-10-31', NULL, '2026-09-01 09:15:00', N'Customer requested seasonal suspension during venue renovation.'),
('B081-000000000004', 'B0000000007', NULL, 'Permanently Inactive', NULL, NULL, '2026-05-18 11:00:00', NULL, NULL, '2026-08-30 17:00:00', '2026-08-30 17:00:00', N'Tenant relocated outside coverage zone; equipment returned and de-provisioned.');

-- 5.10. BILLS & INVOICES (2 Hóa đơn cước)
INSERT INTO dbo.Bill (BillID, InvoiceNumber, AccountID, BillingMonth, BillingPeriodStart, BillingPeriodEnd, BillingDate, DueDate, SecurityDeposit, MonthlyRental, HourlyCharges, DiscountPercent, DiscountAmount, Subtotal, ServiceTaxRate, ServiceTaxAmount, LateFeeAmount, TotalAmount, AmountPaid, DueAmount, Status, GeneratedDate)
VALUES
('bill-01', 'NEX-INV-2026-001', 'B064-000000000002', 'August 2026', '2026-08-01', '2026-08-31', '2026-08-15', '2026-09-05', 500.00, 225.00, 0.00, 0.00, 0.00, 725.00, 12.24, 88.74, 0.00, 813.74, 813.74, 0.00, 'Paid', '2026-08-15 10:30:00'),
('bill-02', 'NEX-INV-2026-002', 'T064-000000000001', 'September 2026', '2026-09-01', '2026-09-30', '2026-09-02', '2026-09-22', 250.00, 125.00, 0.00, 25.00, 93.75, 281.25, 12.24, 34.43, 0.00, 315.68, 100.00, 215.68, 'Partially Paid', '2026-09-02 09:30:00');

-- 5.11. PAYMENTS (2 Biên lai thanh toán)
INSERT INTO dbo.Payment (PaymentID, ReceiptNumber, BillID, EmployeeID, AmountPaid, PaymentDate, PaymentMode, ReferenceNumber, Status, Notes)
VALUES
('PAY-89201', 'REC-2026-00891', 'bill-01', 'emp-04', 813.74, '2026-08-20 14:10:00', 'Credit/Debit Card', 'TXN-VISA-994821', 'Completed', N'Paid in full via Visa debit at counter.'),
('PAY-89205', 'REC-2026-00895', 'bill-02', 'emp-04', 100.00, '2026-09-03 11:20:00', 'Bank Transfer/NEFT', 'ACH-CITI-449102', 'Completed', N'Partial payment on corporate account.');

-- 5.12. CUSTOMER FEEDBACK (2 Phản hồi chất lượng dịch vụ)
INSERT INTO dbo.Feedback (FeedbackID, AccountID, OrderID, CustomerID, CustomerName, Rating, Category, Message, Status, CreatedAt, Response, RespondedBy, RespondedAt)
VALUES
('fb-01', 'B064-000000000002', 'B0000000005', 'CUST-0005', N'Victoria Sterling', 5, 'Installation', N'Field engineer arrived on time and the fibre line was live within an hour. Very smooth.', 'Resolved', '2026-08-16 09:12:00', N'Thank you for the kind words - we have shared this with the SH-01 install team.', 'emp-01', '2026-08-16 15:40:00'),
('fb-02', 'D064-000000000003', 'D0000000006', 'CUST-0006', N'Retro Arcade Lounge LLC', 3, 'Support', N'Took two calls to get the seasonal suspension applied. Please make this self-service.', 'Under Review', '2026-09-01 11:05:00', NULL, NULL, NULL);

-- 5.13. SYSTEM SETTINGS (6 Tham số hệ thống)
INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Category, DataType, Description, LastUpdated)
VALUES
('ServiceTaxRate', '12.24', 'Billing', 'number', N'Statutory telecommunication service tax rate (12.24%)', GETDATE()),
('LatePaymentFeePercent', '5.00', 'Billing', 'number', N'Late payment surcharge rate applied after invoice due date', GETDATE()),
('DepositBroadband', '500.00', 'Technical', 'number', N'Standard security deposit for Broadband connections ($)', GETDATE()),
('DepositDialUp', '325.00', 'Technical', 'number', N'Standard security deposit for Dial-Up connections ($)', GETDATE()),
('DepositLandline', '250.00', 'Technical', 'number', N'Standard security deposit for Landline telephone connections ($)', GETDATE()),
('InstallationGracePeriodDays', '7', 'Technical', 'number', N'Number of days allotted for field installation after feasibility approval', GETDATE());

-- 5.14. CONNECTION ACTIVITY LOGS (4 Nhật ký biến động thuê bao)
INSERT INTO dbo.ConnectionActivityLog (AccountID, ActionType, OldValue, NewValue, Reason, PerformedBy, Timestamp)
VALUES
('T064-000000000001', 'Provisioning', NULL, 'Active', N'Initial copper loop connection provisioned.', 'emp-03', '2026-09-02 09:00:00'),
('B064-000000000002', 'Provisioning', NULL, 'Active', N'Gigabit fiber drop installed with Huawei ONT.', 'emp-03', '2026-08-15 10:00:00'),
('D064-000000000003', 'StatusChange', 'Active', 'Temporarily Inactive', N'Customer requested temporary suspension for venue renovation.', 'emp-02', '2026-09-01 09:15:00'),
('B081-000000000004', 'StatusChange', 'Active', 'Permanently Inactive', N'Customer relocated outside franchise zone; de-provisioned and equipment retrieved.', 'emp-03', '2026-08-30 17:00:00');
GO

PRINT '>> [NexusSystem] Database upgraded successfully with 3NF Zero-Redundancy schema, Audit Logs, and Views!';
GO

-- 5.13. PURCHASE ORDERS (2 đơn đặt mua thiết bị mẫu)
INSERT INTO dbo.PurchaseOrder (PurchaseOrderID, VendorID, StoreID, ItemCode, ItemName, Category, Quantity, UnitCost, TotalCost, OrderDate, ExpectedDate, ReceivedDate, Status, Notes, CreatedBy)
VALUES
('PO-20260910-0001', (SELECT TOP 1 VendorID FROM dbo.Vendor WHERE Category LIKE '%Modem%'), 'SH-01', 'EQ-MDM-100', N'AX-100 Fiber Modem', N'Modem', 50, 18.50, 925.00, '2026-09-10', '2026-09-20', '2026-09-18', 'Received', N'Nhập lô modem cho gói cước mới tháng 9', 'emp-01'),
('PO-20260922-0002', (SELECT TOP 1 VendorID FROM dbo.Vendor WHERE Category LIKE '%Router%'), 'SH-02', 'EQ-RTR-200', N'RT-2600 Gigabit Router', N'Router', 25, 42.00, 1050.00, '2026-09-22', '2026-10-05', NULL, 'Submitted', N'Đặt thêm router cho các đơn broadband cuối tháng', 'emp-01');

-- 5.15. EQUIPMENT REQUESTS (Yêu cầu nhập hàng từ kỹ thuật viên gửi Admin)
INSERT INTO dbo.EquipmentRequest (RequestID, OrderID, StoreID, EmployeeID, InventoryID, ItemName, DeviceType, Quantity, Urgency, Status, Reason, AdminNotes, CreatedAt)
VALUES
('REQ-20260928-0001', 'B0000000002', 'SH-01', 'emp-03', 'inv-01', N'Huawei EchoLife HG8245H5 GPON ONT', 'Fiber ONT Modem', 5, 'High', 'Pending', N'Kho chi nhánh hết thiết bị Fiber ONT để cấp kết nối cho đơn hàng mới.', NULL, DATEADD(HOUR, -4, GETDATE())),
('REQ-20260928-0002', NULL, 'SH-02', 'emp-03', 'inv-02', N'Nexus Wi-Fi 6 AX3000 Dual-Band Router', 'Gigabit Router', 10, 'Normal', 'Approved', N'Bổ sung tồn kho dự phòng Router Wi-Fi 6 cho chi nhánh SH-02.', N'Đã duyệt, chuẩn bị điều phối hàng về kho.', DATEADD(DAY, -1, GETDATE()));

-- 5.16. SEED ORDERS FOR ALL 17 PLANS (10 ORDERS PER PLAN)

-- ============================================================================
-- SEED SCRIPT: Bổ sung đơn hàng (Orders) cho tất cả 17 gói cước khi đăng ký
-- Mỗi gói cước có chính xác 10 bản ghi đơn hàng (Tổng cộng 170 đơn hàng)
-- ============================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '1. Thêm khách hàng mẫu vào dbo.Customer...';

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0008')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0008', N'Nguyễn Hoàng Nam', 'Individual', 'nam.nguyen88@gmail.com', '+84 903 112 445', N'124 Phố Huế, Hai Bà Trưng, Hà Nội',
        'National ID Card', '001088019234', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0009')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0009', N'Trần Thị Mai Phương', 'Individual', 'phuong.tran.mai@outlook.com', '+84 912 445 667', N'45 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM',
        'National ID Card', '079194002819', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0010')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0010', N'Lê Quang Huy', 'Individual', 'huy.lequang@fpt.edu.vn', '+84 988 776 554', N'78 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội',
        'National ID Card', '001092003817', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0011')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0011', N'Vũ Thu Trang', 'Individual', 'trang.vuthu@gmail.com', '+84 934 556 789', N'210 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM',
        'Passport', 'C9921820', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0012')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0012', N'Đặng Quốc Tuấn', 'Individual', 'tuan.dangquoc@yahoo.com', '+84 976 123 456', N'15 Trần Phú, Hải Châu 1, Hải Châu, Đà Nẵng',
        'National ID Card', '048085001928', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0013')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0013', N'Bùi Ngọc Lan', 'Individual', 'ngoclan.bui@gmail.com', '+84 945 678 901', N'88 Lạch Tray, Ngô Quyền, Hải Phòng',
        'Driver''s License', 'DL-HP-99218', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0014')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0014', N'Hoàng Văn Phong', 'Individual', 'phong.hoangvan@techvn.io', '+84 908 998 877', N'32 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
        'National ID Card', '079090001234', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0015')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0015', N'Đỗ Hải Yến', 'Individual', 'haiyen.do@vnu.edu.vn', '+84 918 223 344', N'144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
        'Passport', 'B8871920', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0016')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0016', N'Công ty CP Công Nghệ Sao Việt', 'Corporate', 'contact@saoviet-tech.vn', '+84 28 3822 9988', N'Tòa nhà Bitexco, 2 Hải Triều, Bến Nghé, Quận 1, TP.HCM',
        'Driver''s License', 'DL-CORP-0192', '0312998811', 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0017')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0017', N'Tập đoàn Logistics Á Châu', 'Corporate', 'procurement@achau-logistics.com', '+84 24 3799 1122', N'Tầng 12 Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội',
        'Passport', 'P-VN-99281', '0105882910', 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0018')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0018', N'Marcus Vance', 'Individual', 'marcus.vance@vancemedia.com', '+1 (555) 301-4491', N'350 5th Ave, Fl 42, New York, NY 10118',
        'Passport', 'P-US-991203', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0019')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0019', N'Emily Watson', 'Individual', 'emily.watson@designlab.org', '+1 (555) 772-9910', N'224 W 30th St, Chelsea, New York, NY 10001',
        'Driver''s License', 'DL-NY-88271', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0020')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0020', N'Michael Chang', 'Individual', 'm.chang@apexquant.com', '+1 (555) 819-0022', N'100 Wall St, Fl 15, New York, NY 10005',
        'National ID Card', 'ID-US-77192', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0021')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0021', N'Sophia Rossi', 'Individual', 'sophia.rossi@milanocoffee.us', '+1 (555) 991-2345', N'182 Mulberry St, Little Italy, New York, NY 10012',
        'Driver''s License', 'DL-NY-33910', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0022')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0022', N'Alexander Wright', 'Individual', 'a.wright@architectsny.com', '+1 (555) 440-8811', N'550 W 34th St, Hudson Yards, NY 10001',
        'Passport', 'P-US-440192', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0023')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0023', N'Chloe Bennett', 'Individual', 'chloe.bennett@brooklyngallery.art', '+1 (555) 234-9090', N'45 Main St, Dumbo, Brooklyn, NY 11201',
        'National ID Card', 'ID-US-55190', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0024')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0024', N'Daniel Miller', 'Individual', 'd.miller@financestudio.com', '+1 (555) 662-7711', N'120 Broadway, Manhattan, NY 10271',
        'Driver''s License', 'DL-NY-66271', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0025')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0025', N'Olivia Davis', 'Individual', 'olivia.davis@columbia.edu', '+1 (555) 883-2211', N'116th and Broadway, Morningside, NY 10027',
        'National ID Card', 'ID-US-88322', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0026')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0026', N'Lucas Martin', 'Individual', 'lucas.martin@astoriabistro.com', '+1 (555) 331-8899', N'30-10 Broadway, Astoria, Queens, NY 11106',
        'Driver''s License', 'DL-NY-33188', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0027')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0027', N'Isabella Garcia', 'Individual', 'isabella.g@flushingmed.org', '+1 (555) 449-0123', N'136-20 38th Ave, Flushing, Queens, NY 11354',
        'Passport', 'P-US-449012', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0028')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0028', N'Nexus Cloud Innovations LLC', 'Corporate', 'ops@nexuscloud.io', '+1 (555) 900-8800', N'1 World Trade Center, Fl 68, NY 10007',
        'Driver''s License', 'DL-CORP-9008', 'TAX-US-99182', 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0029')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0029', N'Gotham Creative Media Corp', 'Corporate', 'admin@gothamcreative.tv', '+1 (555) 551-0987', N'500 7th Ave, Fl 10, New York, NY 10018',
        'Driver''s License', 'DL-CORP-5510', 'TAX-US-55109', 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0030')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0030', N'Lê Văn Thắng', 'Individual', 'thang.le@vinaphone.com.vn', '+84 913 889 900', N'57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội',
        'National ID Card', '001083002918', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0031')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0031', N'Phạm Minh Tuấn', 'Individual', 'tuan.pm@saigontech.com', '+84 909 334 455', N'12 Quang Trung, Phường 10, Gò Vấp, TP.HCM',
        'National ID Card', '079089001928', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0032')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0032', N'Trịnh Khánh Vy', 'Individual', 'vy.trinh@fashionhub.vn', '+84 938 112 233', N'98 Nguyễn Đình Chiểu, Đa Kao, Quận 1, TP.HCM',
        'Passport', 'C8819201', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0033')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0033', N'Nguyễn Thành Long', 'Individual', 'long.nt@hust.edu.vn', '+84 966 554 433', N'1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội',
        'National ID Card', '001096001293', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0034')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0034', N'Vũ Đức Anh', 'Individual', 'anh.vuduc@vietinbank.vn', '+84 982 778 899', N'108 Trần Hưng Đạo, Cửa Nam, Hoàn Kiếm, Hà Nội',
        'Driver''s License', 'DL-HN-88291', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0035')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0035', N'Dương Mỹ Linh', 'Individual', 'linh.duong@danangresort.vn', '+84 905 443 322', N'280 Võ Nguyên Giáp, Mỹ An, Ngũ Hành Sơn, Đà Nẵng',
        'National ID Card', '048092001827', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0036')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0036', N'Trần Bảo Ngọc', 'Individual', 'ngoc.tranbao@cinemavn.com', '+84 919 667 788', N'68 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1, TP.HCM',
        'Passport', 'C7719283', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0037')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0037', N'Lâm Chí Dũng', 'Individual', 'dung.lam@canthoagri.vn', '+84 979 221 100', N'12 Hòa Bình, Tân An, Ninh Kiều, Cần Thơ',
        'National ID Card', '092087001928', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0038')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0038', N'Chu Đình Trọng', 'Individual', 'trong.chudinh@haiphongport.vn', '+84 948 119 922', N'5 Hoàng Diệu, Minh Khai, Hồng Bàng, Hải Phòng',
        'National ID Card', '031089002819', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0039')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0039', N'Công ty TNHH Thương Mại Dịch Vụ Nam Á', 'Corporate', 'info@nama-trading.vn', '+84 28 3930 1122', N'40 Phạm Ngọc Thạch, Phường 6, Quận 3, TP.HCM',
        'Driver''s License', 'DL-CORP-4011', '0314882910', 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0040')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0040', N'David Kim', 'Individual', 'david.kim@koreatown.ny', '+1 (555) 234-5544', N'32 W 32nd St, Koreatown, New York, NY 10001',
        'Passport', 'P-KR-992182', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0041')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0041', N'Hannah Schmidt', 'Individual', 'hannah.schmidt@berlin-tech.de', '+1 (555) 887-1122', N'72 Franklin St, Greenpoint, Brooklyn, NY 11222',
        'National ID Card', 'ID-DE-88271', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0042')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0042', N'Ethan Walker', 'Individual', 'ethan.walker@williamsburg.io', '+1 (555) 345-9876', N'240 Bedford Ave, Williamsburg, Brooklyn, NY 11211',
        'Driver''s License', 'DL-NY-24011', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0043')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0043', N'Mia Taylor', 'Individual', 'mia.taylor@longislandcity.net', '+1 (555) 901-2233', N'44-02 23rd St, Long Island City, Queens, NY 11101',
        'Passport', 'P-US-901223', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0044')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0044', N'Noah Wilson', 'Individual', 'noah.wilson@bushwickcraft.com', '+1 (555) 432-8877', N'119 Ingraham St, Bushwick, Brooklyn, NY 11237',
        'National ID Card', 'ID-US-11928', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0045')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0045', N'Ava Thomas', 'Individual', 'ava.thomas@parkslope.org', '+1 (555) 678-1122', N'315 7th Ave, Park Slope, Brooklyn, NY 11215',
        'Driver''s License', 'DL-NY-31577', NULL, 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0046')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0046', N'Brooklyn Roasting Company LLC', 'Corporate', 'orders@brooklynroasting.com', '+1 (555) 888-4422', N'25 Jay St, Dumbo, Brooklyn, NY 11201',
        'Driver''s License', 'DL-CORP-2511', 'TAX-US-25119', 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerID = 'CUST-0047')
BEGIN
    INSERT INTO dbo.Customer (
        CustomerID, FullName, CustomerType, Email, ContactNumber, Address,
        IdProofType, IdProofNumber, TaxNumber, Status, PasswordHash, CreatedAt, UpdatedAt
    ) VALUES (
        'CUST-0047', N'Manhattan Medical Associates PC', 'Corporate', 'admin@manhattanmedical.org', '+1 (555) 212-9900', N'654 Madison Ave, Suite 800, New York, NY 10065',
        'Passport', 'P-CORP-6540', 'TAX-US-65401', 'Active',
        '$2a$10$KOB51khRySpHpsNDdQDOGunAsrc2N4uY335NNDH04Pf85lkQdcQ1q', '2026-09-01 08:00:00', '2026-09-01 08:00:00'
    );
END;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '2. Thêm đơn hàng mẫu vào dbo.Orders...';

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000016')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000016', 'CUST-0001', 'plan-bb-h30', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 122, Đường số 17, Chi nhánh SH-01', '2026-09-22 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-22 08:10:00', '2026-09-22 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000017')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000017', 'CUST-0002', 'plan-bb-h30', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 129, Đường số 18, Chi nhánh SH-03', '2026-09-27 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-27 09:17:00', '2026-09-27 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000018')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000018', 'CUST-0003', 'plan-bb-h30', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 136, Đường số 19, Chi nhánh SH-01', '2026-09-14 10:24:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-14 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-14 13:00:00',
        '2026-09-14 10:24:00', '2026-09-14 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000019')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000019', 'CUST-0004', 'plan-bb-h30', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 143, Đường số 20, Chi nhánh SH-03', '2026-09-19 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-19 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-19 13:00:00',
        '2026-09-19 11:31:00', '2026-09-19 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000020')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000020', 'CUST-0005', 'plan-bb-h30', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 150, Đường số 1, Chi nhánh SH-01', '2026-09-24 12:38:00', 'Feasible',
        290, N'DP-SH-01-P5', -16.00, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-24 14:00:00', '2026-09-26', NULL,
        5, 5.00, NULL, NULL, 1,
        'B064-000000000011', N'David Chen', '2026-09-23 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-24 12:38:00', '2026-09-24 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000021')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000021', 'CUST-0006', 'plan-bb-h30', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 157, Đường số 2, Chi nhánh SH-03', '2026-09-11 13:45:00', 'Feasible',
        301, N'DP-SH-03-P6', -16.10, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-11 14:00:00', '2026-09-13', NULL,
        1, 0.00, NULL, NULL, 1,
        'B072-000000000012', N'David Chen', '2026-09-10 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-11 13:45:00', '2026-09-11 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000022')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000022', 'CUST-0007', 'plan-bb-h30', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 164, Đường số 3, Chi nhánh SH-01', '2026-09-16 14:52:00', 'Connection Provided',
        248, N'DP-SH-01-MAIN-3', -15.70, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-22 10:00:00', '2026-08-24', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000013', N'Aiden Brooks', '2026-08-21 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-16 14:52:00', '2026-09-16 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000023')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000023', 'CUST-0008', 'plan-bb-h30', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 171, Đường số 4, Chi nhánh SH-03', '2026-09-21 15:59:00', 'Connection Provided',
        57, N'DP-SH-03-MAIN-4', -15.80, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, NULL, 1,
        'B072-000000000014', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-21 15:59:00', '2026-09-21 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000024')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000024', 'CUST-0009', 'plan-bb-h30', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 178, Đường số 5, Chi nhánh SH-01', '2026-09-26 16:16:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-26 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-25 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-26 16:16:00', '2026-09-26 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000025')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000025', 'CUST-0010', 'plan-bb-64', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 185, Đường số 6, Chi nhánh SH-02', '2026-09-13 08:10:00', 'Feasible',
        95, N'DP-SH-02-P2', -16.50, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-13 14:00:00', '2026-09-15', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000015', N'David Chen', '2026-09-12 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-13 08:10:00', '2026-09-13 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000026')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000026', 'CUST-0011', 'plan-bb-64', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 192, Đường số 7, Chi nhánh SH-04', '2026-09-18 09:17:00', 'Connection Provided',
        84, N'DP-SH-04-MAIN-3', -16.10, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-17 10:00:00', '2026-08-19', NULL,
        1, 0.00, NULL, NULL, 1,
        'B081-000000000016', N'Aiden Brooks', '2026-08-16 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-18 09:17:00', '2026-09-18 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000027')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000027', 'CUST-0012', 'plan-bb-64', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 199, Đường số 8, Chi nhánh SH-02', '2026-09-23 10:24:00', 'Connection Provided',
        93, N'DP-SH-02-MAIN-4', -16.20, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-18 10:00:00', '2026-08-20', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000017', N'Aiden Brooks', '2026-08-17 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-23 10:24:00', '2026-09-23 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000028')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000028', 'CUST-0013', 'plan-bb-64', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 206, Đường số 9, Chi nhánh SH-04', '2026-09-10 11:31:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-10 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-09 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-10 11:31:00', '2026-09-10 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000029')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000029', 'CUST-0014', 'plan-bb-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 213, Đường số 10, Chi nhánh SH-02', '2026-09-25 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-25 08:10:00', '2026-09-25 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000030')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000030', 'CUST-0015', 'plan-bb-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 220, Đường số 11, Chi nhánh SH-04', '2026-09-12 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-12 09:17:00', '2026-09-12 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000031')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000031', 'CUST-0016', 'plan-bb-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 227, Đường số 12, Chi nhánh SH-02', '2026-09-17 10:24:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-17 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-17 13:00:00',
        '2026-09-17 10:24:00', '2026-09-17 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000032')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000032', 'CUST-0017', 'plan-bb-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 234, Đường số 13, Chi nhánh SH-04', '2026-09-22 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-22 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-22 13:00:00',
        '2026-09-22 11:31:00', '2026-09-22 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000033')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000033', 'CUST-0018', 'plan-bb-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 241, Đường số 14, Chi nhánh SH-02', '2026-09-27 12:38:00', 'Feasible',
        183, N'DP-SH-02-P2', -17.30, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-27 14:00:00', '2026-09-28', NULL,
        5, 5.00, NULL, NULL, 1,
        'B064-000000000018', N'David Chen', '2026-09-26 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-27 12:38:00', '2026-09-27 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000034')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000034', 'CUST-0019', 'plan-bb-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 248, Đường số 15, Chi nhánh SH-04', '2026-09-14 13:45:00', 'Feasible',
        194, N'DP-SH-04-P3', -17.40, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-14 14:00:00', '2026-09-16', NULL,
        1, 0.00, NULL, NULL, 1,
        'B081-000000000019', N'David Chen', '2026-09-13 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-14 13:45:00', '2026-09-14 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000035')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000035', 'CUST-0020', 'plan-bb-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 255, Đường số 16, Chi nhánh SH-02', '2026-09-19 14:52:00', 'Connection Provided',
        165, N'DP-SH-02-MAIN-4', -17.00, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-22 10:00:00', '2026-08-24', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000020', N'Aiden Brooks', '2026-08-21 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-19 14:52:00', '2026-09-19 14:52:00'
    );
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000036')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000036', 'CUST-0021', 'plan-bb-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 262, Đường số 17, Chi nhánh SH-04', '2026-09-24 15:59:00', 'Connection Provided',
        174, N'DP-SH-04-MAIN-1', -17.10, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, NULL, 1,
        'B081-000000000021', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-24 15:59:00', '2026-09-24 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000037')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000037', 'CUST-0022', 'plan-bb-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 269, Đường số 18, Chi nhánh SH-02', '2026-09-11 16:16:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-11 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-10 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-11 16:16:00', '2026-09-11 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000038')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000038', 'CUST-0023', 'plan-bb-128', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 276, Đường số 19, Chi nhánh SH-03', '2026-09-16 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-16 08:10:00', '2026-09-16 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000039')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000039', 'CUST-0024', 'plan-bb-128', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 283, Đường số 20, Chi nhánh SH-01', '2026-09-21 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-21 09:17:00', '2026-09-21 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000040')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000040', 'CUST-0025', 'plan-bb-128', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 290, Đường số 1, Chi nhánh SH-03', '2026-09-26 10:24:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-26 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-26 13:00:00',
        '2026-09-26 10:24:00', '2026-09-26 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000041')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000041', 'CUST-0026', 'plan-bb-128', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 297, Đường số 2, Chi nhánh SH-01', '2026-09-13 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-13 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-13 13:00:00',
        '2026-09-13 11:31:00', '2026-09-13 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000042')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000042', 'CUST-0027', 'plan-bb-128', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 304, Đường số 3, Chi nhánh SH-03', '2026-09-18 12:38:00', 'Feasible',
        282, N'DP-SH-03-P3', -18.20, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-18 14:00:00', '2026-09-20', NULL,
        5, 5.00, NULL, NULL, 1,
        'B072-000000000022', N'David Chen', '2026-09-17 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-18 12:38:00', '2026-09-18 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000043')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000043', 'CUST-0028', 'plan-bb-128', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 11, Đường số 4, Chi nhánh SH-01', '2026-09-23 13:45:00', 'Feasible',
        293, N'DP-SH-01-P4', -18.30, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-23 14:00:00', '2026-09-25', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000023', N'David Chen', '2026-09-22 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-23 13:45:00', '2026-09-23 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000044')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000044', 'CUST-0029', 'plan-bb-128', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 18, Đường số 5, Chi nhánh SH-03', '2026-09-10 14:52:00', 'Connection Provided',
        246, N'DP-SH-03-MAIN-1', -17.90, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-22 10:00:00', '2026-08-24', NULL,
        1, 0.00, NULL, NULL, 1,
        'B072-000000000024', N'Aiden Brooks', '2026-08-21 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-10 14:52:00', '2026-09-10 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000045')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000045', 'CUST-0030', 'plan-bb-128', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 25, Đường số 6, Chi nhánh SH-01', '2026-09-15 15:59:00', 'Connection Provided',
        55, N'DP-SH-01-MAIN-2', -18.00, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000025', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-15 15:59:00', '2026-09-15 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000046')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000046', 'CUST-0031', 'plan-bb-128', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 32, Đường số 7, Chi nhánh SH-03', '2026-09-20 16:16:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-20 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-19 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-20 16:16:00', '2026-09-20 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000047')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000047', 'CUST-0032', 'plan-bb-h120', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 39, Đường số 8, Chi nhánh SH-04', '2026-09-25 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-25 08:10:00', '2026-09-25 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000048')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000048', 'CUST-0033', 'plan-bb-h120', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 46, Đường số 9, Chi nhánh SH-02', '2026-09-12 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-12 09:17:00', '2026-09-12 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000049')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000049', 'CUST-0034', 'plan-bb-h120', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 53, Đường số 10, Chi nhánh SH-04', '2026-09-17 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-17 10:24:00', '2026-09-17 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000050')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000050', 'CUST-0035', 'plan-bb-h120', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 60, Đường số 11, Chi nhánh SH-02', '2026-09-22 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-22 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-22 13:00:00',
        '2026-09-22 11:31:00', '2026-09-22 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000051')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000051', 'CUST-0036', 'plan-bb-h120', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 67, Đường số 12, Chi nhánh SH-04', '2026-09-27 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        5, 5.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-27 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-27 13:00:00',
        '2026-09-27 12:38:00', '2026-09-27 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000052')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000052', 'CUST-0037', 'plan-bb-h120', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 74, Đường số 13, Chi nhánh SH-02', '2026-09-14 13:45:00', 'Feasible',
        142, N'DP-SH-02-P5', -19.20, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-14 14:00:00', '2026-09-16', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000026', N'David Chen', '2026-09-13 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-14 13:45:00', '2026-09-14 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000053')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000053', 'CUST-0038', 'plan-bb-h120', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 81, Đường số 14, Chi nhánh SH-04', '2026-09-19 14:52:00', 'Feasible',
        153, N'DP-SH-04-P6', -19.30, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-19 14:00:00', '2026-09-21', NULL,
        1, 0.00, NULL, NULL, 1,
        'B081-000000000027', N'David Chen', '2026-09-18 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-19 14:52:00', '2026-09-19 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000054')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000054', 'CUST-0039', 'plan-bb-h120', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 88, Đường số 15, Chi nhánh SH-02', '2026-09-24 15:59:00', 'Connection Provided',
        136, N'DP-SH-02-MAIN-3', -13.90, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, NULL, 1,
        'B064-000000000028', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-24 15:59:00', '2026-09-24 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000055')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000055', 'CUST-0040', 'plan-bb-h120', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 95, Đường số 16, Chi nhánh SH-04', '2026-09-11 16:16:00', 'Connection Provided',
        145, N'DP-SH-04-MAIN-4', -14.00, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, NULL, 1,
        'B081-000000000029', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-11 16:16:00', '2026-09-11 16:16:00'
    );
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'B0000000056')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'B0000000056', 'CUST-0041', 'plan-bb-h120', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 102, Đường số 17, Chi nhánh SH-02', '2026-09-16 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-16 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-15 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-16 08:23:00', '2026-09-16 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000007')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000007', 'CUST-0042', 'plan-du-h10', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 59, Đường số 8, Chi nhánh SH-04', '2026-09-13 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-13 08:10:00', '2026-09-13 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000008')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000008', 'CUST-0043', 'plan-du-h10', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 66, Đường số 9, Chi nhánh SH-02', '2026-09-18 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-18 09:17:00', '2026-09-18 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000009')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000009', 'CUST-0044', 'plan-du-h10', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 73, Đường số 10, Chi nhánh SH-04', '2026-09-23 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-23 10:24:00', '2026-09-23 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000010')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000010', 'CUST-0045', 'plan-du-h10', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 80, Đường số 11, Chi nhánh SH-02', '2026-09-10 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-10 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-10 13:00:00',
        '2026-09-10 11:31:00', '2026-09-10 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000011')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000011', 'CUST-0046', 'plan-du-h10', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 87, Đường số 12, Chi nhánh SH-04', '2026-09-15 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-15 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-15 13:00:00',
        '2026-09-15 12:38:00', '2026-09-15 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000012')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000012', 'CUST-0047', 'plan-du-h10', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 94, Đường số 13, Chi nhánh SH-02', '2026-09-20 13:45:00', 'Feasible',
        202, N'DP-SH-02-P5', -15.20, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-20 14:00:00', '2026-09-22', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000030', N'David Chen', '2026-09-19 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-20 13:45:00', '2026-09-20 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000013')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000013', 'CUST-0001', 'plan-du-h10', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 101, Đường số 14, Chi nhánh SH-04', '2026-09-25 14:52:00', 'Feasible',
        213, N'DP-SH-04-P6', -15.30, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-25 14:00:00', '2026-09-27', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000031', N'David Chen', '2026-09-24 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-25 14:52:00', '2026-09-25 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000014')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000014', 'CUST-0002', 'plan-du-h10', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 108, Đường số 15, Chi nhánh SH-02', '2026-09-12 15:59:00', 'Connection Provided',
        176, N'DP-SH-02-MAIN-3', -14.90, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000032', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-12 15:59:00', '2026-09-12 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000015')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000015', 'CUST-0003', 'plan-du-h10', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 115, Đường số 16, Chi nhánh SH-04', '2026-09-17 16:16:00', 'Connection Provided',
        185, N'DP-SH-04-MAIN-4', -15.00, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000033', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-17 16:16:00', '2026-09-17 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000016')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000016', 'CUST-0004', 'plan-du-h10', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 122, Đường số 17, Chi nhánh SH-02', '2026-09-22 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-22 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-21 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-22 08:23:00', '2026-09-22 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000017')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000017', 'CUST-0005', 'plan-du-28', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 129, Đường số 18, Chi nhánh SH-02', '2026-09-25 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-25 08:10:00', '2026-09-25 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000018')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000018', 'CUST-0006', 'plan-du-28', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 136, Đường số 19, Chi nhánh SH-04', '2026-09-12 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-12 09:17:00', '2026-09-12 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000019')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000019', 'CUST-0007', 'plan-du-28', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 143, Đường số 20, Chi nhánh SH-02', '2026-09-17 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-17 10:24:00', '2026-09-17 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000020')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000020', 'CUST-0008', 'plan-du-28', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 150, Đường số 1, Chi nhánh SH-04', '2026-09-22 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-22 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-22 13:00:00',
        '2026-09-22 11:31:00', '2026-09-22 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000021')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000021', 'CUST-0009', 'plan-du-28', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 157, Đường số 2, Chi nhánh SH-02', '2026-09-27 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-27 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-27 13:00:00',
        '2026-09-27 12:38:00', '2026-09-27 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000022')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000022', 'CUST-0010', 'plan-du-28', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 164, Đường số 3, Chi nhánh SH-04', '2026-09-14 13:45:00', 'Feasible',
        312, N'DP-SH-04-P7', -16.20, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-14 14:00:00', '2026-09-16', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000034', N'David Chen', '2026-09-13 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-14 13:45:00', '2026-09-14 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000023')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000023', 'CUST-0011', 'plan-du-28', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 171, Đường số 4, Chi nhánh SH-02', '2026-09-19 14:52:00', 'Feasible',
        73, N'DP-SH-02-P8', -16.30, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-19 14:00:00', '2026-09-21', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000035', N'David Chen', '2026-09-18 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-19 14:52:00', '2026-09-19 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000024')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000024', 'CUST-0012', 'plan-du-28', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 178, Đường số 5, Chi nhánh SH-04', '2026-09-24 15:59:00', 'Connection Provided',
        66, N'DP-SH-04-MAIN-1', -15.90, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000036', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-24 15:59:00', '2026-09-24 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000025')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000025', 'CUST-0013', 'plan-du-28', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 185, Đường số 6, Chi nhánh SH-02', '2026-09-11 16:16:00', 'Connection Provided',
        75, N'DP-SH-02-MAIN-2', -16.00, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000037', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-11 16:16:00', '2026-09-11 16:16:00'
    );
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000026')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000026', 'CUST-0014', 'plan-du-28', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 192, Đường số 7, Chi nhánh SH-04', '2026-09-16 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-16 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-15 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-16 08:23:00', '2026-09-16 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000027')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000027', 'CUST-0015', 'plan-du-56', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 199, Đường số 8, Chi nhánh SH-04', '2026-09-19 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-19 08:10:00', '2026-09-19 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000028')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000028', 'CUST-0016', 'plan-du-56', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 206, Đường số 9, Chi nhánh SH-02', '2026-09-24 09:17:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-24 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-24 13:00:00',
        '2026-09-24 09:17:00', '2026-09-24 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000029')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000029', 'CUST-0017', 'plan-du-56', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 213, Đường số 10, Chi nhánh SH-04', '2026-09-11 10:24:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-11 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-11 13:00:00',
        '2026-09-11 10:24:00', '2026-09-11 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000030')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000030', 'CUST-0018', 'plan-du-56', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 220, Đường số 11, Chi nhánh SH-02', '2026-09-16 11:31:00', 'Feasible',
        150, N'DP-SH-02-P7', -17.00, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-16 14:00:00', '2026-09-18', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000038', N'David Chen', '2026-09-15 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-16 11:31:00', '2026-09-16 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000031')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000031', 'CUST-0019', 'plan-du-56', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 227, Đường số 12, Chi nhánh SH-04', '2026-09-21 12:38:00', 'Feasible',
        161, N'DP-SH-04-P8', -17.10, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-21 14:00:00', '2026-09-23', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000039', N'David Chen', '2026-09-20 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-21 12:38:00', '2026-09-21 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000032')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000032', 'CUST-0020', 'plan-du-56', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 234, Đường số 13, Chi nhánh SH-02', '2026-09-26 13:45:00', 'Connection Provided',
        138, N'DP-SH-02-MAIN-1', -16.70, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-21 10:00:00', '2026-08-23', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000040', N'Aiden Brooks', '2026-08-20 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-26 13:45:00', '2026-09-26 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000033')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000033', 'CUST-0021', 'plan-du-56', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 241, Đường số 14, Chi nhánh SH-04', '2026-09-13 14:52:00', 'Connection Provided',
        147, N'DP-SH-04-MAIN-2', -16.80, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-22 10:00:00', '2026-08-24', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000041', N'Aiden Brooks', '2026-08-21 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-13 14:52:00', '2026-09-13 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000034')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000034', 'CUST-0022', 'plan-du-56', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 248, Đường số 15, Chi nhánh SH-02', '2026-09-18 15:59:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-18 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-17 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-18 15:59:00', '2026-09-18 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000035')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000035', 'CUST-0023', 'plan-du-h30', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 255, Đường số 16, Chi nhánh SH-04', '2026-09-25 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-25 08:10:00', '2026-09-25 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000036')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000036', 'CUST-0024', 'plan-du-h30', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 262, Đường số 17, Chi nhánh SH-02', '2026-09-12 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-12 09:17:00', '2026-09-12 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000037')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000037', 'CUST-0025', 'plan-du-h30', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 269, Đường số 18, Chi nhánh SH-04', '2026-09-17 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-17 10:24:00', '2026-09-17 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000038')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000038', 'CUST-0026', 'plan-du-h30', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 276, Đường số 19, Chi nhánh SH-02', '2026-09-22 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-22 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-22 13:00:00',
        '2026-09-22 11:31:00', '2026-09-22 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000039')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000039', 'CUST-0027', 'plan-du-h30', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 283, Đường số 20, Chi nhánh SH-04', '2026-09-27 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-27 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-27 13:00:00',
        '2026-09-27 12:38:00', '2026-09-27 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000040')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000040', 'CUST-0028', 'plan-du-h30', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 290, Đường số 1, Chi nhánh SH-02', '2026-09-14 13:45:00', 'Feasible',
        260, N'DP-SH-02-P1', -18.00, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-14 14:00:00', '2026-09-16', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000042', N'David Chen', '2026-09-13 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-14 13:45:00', '2026-09-14 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000041')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000041', 'CUST-0029', 'plan-du-h30', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 297, Đường số 2, Chi nhánh SH-04', '2026-09-19 14:52:00', 'Feasible',
        271, N'DP-SH-04-P2', -18.10, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-19 14:00:00', '2026-09-21', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000043', N'David Chen', '2026-09-18 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-19 14:52:00', '2026-09-19 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000042')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000042', 'CUST-0030', 'plan-du-h30', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 304, Đường số 3, Chi nhánh SH-02', '2026-09-24 15:59:00', 'Connection Provided',
        228, N'DP-SH-02-MAIN-3', -17.70, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000044', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-24 15:59:00', '2026-09-24 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000043')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000043', 'CUST-0031', 'plan-du-h30', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 11, Đường số 4, Chi nhánh SH-04', '2026-09-11 16:16:00', 'Connection Provided',
        237, N'DP-SH-04-MAIN-4', -17.80, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000045', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-11 16:16:00', '2026-09-11 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000044')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000044', 'CUST-0032', 'plan-du-h30', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 18, Đường số 5, Chi nhánh SH-02', '2026-09-16 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-16 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-15 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-16 08:23:00', '2026-09-16 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000045')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000045', 'CUST-0033', 'plan-du-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 25, Đường số 6, Chi nhánh SH-02', '2026-09-19 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-19 08:10:00', '2026-09-19 08:10:00'
    );
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000046')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000046', 'CUST-0034', 'plan-du-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 32, Đường số 7, Chi nhánh SH-04', '2026-09-24 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-24 09:17:00', '2026-09-24 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000047')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000047', 'CUST-0035', 'plan-du-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 39, Đường số 8, Chi nhánh SH-02', '2026-09-11 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-11 10:24:00', '2026-09-11 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000048')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000048', 'CUST-0036', 'plan-du-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 46, Đường số 9, Chi nhánh SH-04', '2026-09-16 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-16 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-16 13:00:00',
        '2026-09-16 11:31:00', '2026-09-16 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000049')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000049', 'CUST-0037', 'plan-du-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 53, Đường số 10, Chi nhánh SH-02', '2026-09-21 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-21 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-21 13:00:00',
        '2026-09-21 12:38:00', '2026-09-21 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000050')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000050', 'CUST-0038', 'plan-du-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 60, Đường số 11, Chi nhánh SH-04', '2026-09-26 13:45:00', 'Feasible',
        120, N'DP-SH-04-P3', -19.00, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-26 14:00:00', '2026-09-28', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000046', N'David Chen', '2026-09-25 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-26 13:45:00', '2026-09-26 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000051')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000051', 'CUST-0039', 'plan-du-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 67, Đường số 12, Chi nhánh SH-02', '2026-09-13 14:52:00', 'Feasible',
        131, N'DP-SH-02-P4', -19.10, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-13 14:00:00', '2026-09-15', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000047', N'David Chen', '2026-09-12 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-13 14:52:00', '2026-09-13 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000052')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000052', 'CUST-0040', 'plan-du-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 74, Đường số 13, Chi nhánh SH-04', '2026-09-18 15:59:00', 'Connection Provided',
        118, N'DP-SH-04-MAIN-1', -13.70, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000048', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-18 15:59:00', '2026-09-18 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000053')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000053', 'CUST-0041', 'plan-du-h60', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 81, Đường số 14, Chi nhánh SH-02', '2026-09-23 16:16:00', 'Connection Provided',
        127, N'DP-SH-02-MAIN-2', -13.80, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000049', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-23 16:16:00', '2026-09-23 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000054')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000054', 'CUST-0042', 'plan-du-h60', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 88, Đường số 15, Chi nhánh SH-04', '2026-09-10 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-10 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-09 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-10 08:23:00', '2026-09-10 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000055')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000055', 'CUST-0043', 'plan-du-h100', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 95, Đường số 16, Chi nhánh SH-04', '2026-09-13 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-13 08:10:00', '2026-09-13 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000056')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000056', 'CUST-0044', 'plan-du-h100', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 102, Đường số 17, Chi nhánh SH-02', '2026-09-18 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-18 09:17:00', '2026-09-18 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000057')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000057', 'CUST-0045', 'plan-du-h100', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 109, Đường số 18, Chi nhánh SH-04', '2026-09-23 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-23 10:24:00', '2026-09-23 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000058')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000058', 'CUST-0046', 'plan-du-h100', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 116, Đường số 19, Chi nhánh SH-02', '2026-09-10 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-10 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-10 13:00:00',
        '2026-09-10 11:31:00', '2026-09-10 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000059')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000059', 'CUST-0047', 'plan-du-h100', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 123, Đường số 20, Chi nhánh SH-04', '2026-09-15 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-15 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-15 13:00:00',
        '2026-09-15 12:38:00', '2026-09-15 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000060')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000060', 'CUST-0001', 'plan-du-h100', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 130, Đường số 1, Chi nhánh SH-02', '2026-09-20 13:45:00', 'Feasible',
        230, N'DP-SH-02-P5', -14.00, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-20 14:00:00', '2026-09-22', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000050', N'David Chen', '2026-09-19 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-20 13:45:00', '2026-09-20 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000061')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000061', 'CUST-0002', 'plan-du-h100', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 137, Đường số 2, Chi nhánh SH-04', '2026-09-25 14:52:00', 'Feasible',
        241, N'DP-SH-04-P6', -14.10, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-25 14:00:00', '2026-09-27', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000051', N'David Chen', '2026-09-24 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-25 14:52:00', '2026-09-25 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000062')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000062', 'CUST-0003', 'plan-du-h100', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 144, Đường số 3, Chi nhánh SH-02', '2026-09-12 15:59:00', 'Connection Provided',
        208, N'DP-SH-02-MAIN-3', -14.70, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, 1,
        'D064-000000000052', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-12 15:59:00', '2026-09-12 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000063')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000063', 'CUST-0004', 'plan-du-h100', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 151, Đường số 4, Chi nhánh SH-04', '2026-09-17 16:16:00', 'Connection Provided',
        217, N'DP-SH-04-MAIN-4', -14.80, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, 1,
        'D081-000000000053', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-17 16:16:00', '2026-09-17 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'D0000000064')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'D0000000064', 'CUST-0005', 'plan-du-h100', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 158, Đường số 5, Chi nhánh SH-02', '2026-09-22 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-22 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-21 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-22 08:23:00', '2026-09-22 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000012')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000012', 'CUST-0006', 'plan-ll-loc-a', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 94, Đường số 13, Chi nhánh SH-01', '2026-09-10 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-10 08:10:00', '2026-09-10 08:10:00'
    );
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000013')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000013', 'CUST-0007', 'plan-ll-loc-a', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 101, Đường số 14, Chi nhánh SH-03', '2026-09-15 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-15 09:17:00', '2026-09-15 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000014')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000014', 'CUST-0008', 'plan-ll-loc-a', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 108, Đường số 15, Chi nhánh SH-01', '2026-09-20 10:24:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-20 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-20 13:00:00',
        '2026-09-20 10:24:00', '2026-09-20 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000015')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000015', 'CUST-0009', 'plan-ll-loc-a', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 115, Đường số 16, Chi nhánh SH-03', '2026-09-25 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        5, 5.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-25 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-25 13:00:00',
        '2026-09-25 11:31:00', '2026-09-25 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000016')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000016', 'CUST-0010', 'plan-ll-loc-a', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 122, Đường số 17, Chi nhánh SH-01', '2026-09-12 12:38:00', 'Feasible',
        246, N'DP-SH-01-P1', -15.60, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-12 14:00:00', '2026-09-14', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000054', N'David Chen', '2026-09-11 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-12 12:38:00', '2026-09-12 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000017')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000017', 'CUST-0011', 'plan-ll-loc-a', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 129, Đường số 18, Chi nhánh SH-03', '2026-09-17 13:45:00', 'Feasible',
        257, N'DP-SH-03-P2', -15.70, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-17 14:00:00', '2026-09-19', NULL,
        1, 0.00, NULL, 1, NULL,
        'T072-000000000055', N'David Chen', '2026-09-16 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-17 13:45:00', '2026-09-17 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000018')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000018', 'CUST-0012', 'plan-ll-loc-a', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 136, Đường số 19, Chi nhánh SH-01', '2026-09-22 14:52:00', 'Connection Provided',
        212, N'DP-SH-01-MAIN-3', -15.30, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-22 10:00:00', '2026-08-24', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000056', N'Aiden Brooks', '2026-08-21 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-22 14:52:00', '2026-09-22 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000019')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000019', 'CUST-0013', 'plan-ll-loc-a', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 143, Đường số 20, Chi nhánh SH-03', '2026-09-27 15:59:00', 'Connection Provided',
        221, N'DP-SH-03-MAIN-4', -15.40, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, NULL,
        'T072-000000000057', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-27 15:59:00', '2026-09-27 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000020')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000020', 'CUST-0014', 'plan-ll-loc-a', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 150, Đường số 1, Chi nhánh SH-01', '2026-09-14 16:16:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-14 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-13 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-14 16:16:00', '2026-09-14 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000021')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000021', 'CUST-0015', 'plan-ll-loc-b', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 157, Đường số 2, Chi nhánh SH-02', '2026-09-19 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-19 08:10:00', '2026-09-19 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000022')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000022', 'CUST-0016', 'plan-ll-loc-b', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 164, Đường số 3, Chi nhánh SH-04', '2026-09-24 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-24 09:17:00', '2026-09-24 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000023')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000023', 'CUST-0017', 'plan-ll-loc-b', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 171, Đường số 4, Chi nhánh SH-02', '2026-09-11 10:24:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-11 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-11 13:00:00',
        '2026-09-11 10:24:00', '2026-09-11 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000024')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000024', 'CUST-0018', 'plan-ll-loc-b', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 178, Đường số 5, Chi nhánh SH-04', '2026-09-16 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        5, 5.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-16 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-16 13:00:00',
        '2026-09-16 11:31:00', '2026-09-16 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000025')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000025', 'CUST-0019', 'plan-ll-loc-b', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 185, Đường số 6, Chi nhánh SH-02', '2026-09-21 12:38:00', 'Feasible',
        95, N'DP-SH-02-P2', -16.50, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-21 14:00:00', '2026-09-23', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000058', N'David Chen', '2026-09-20 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-21 12:38:00', '2026-09-21 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000026')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000026', 'CUST-0020', 'plan-ll-loc-b', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 192, Đường số 7, Chi nhánh SH-04', '2026-09-26 13:45:00', 'Feasible',
        106, N'DP-SH-04-P3', -16.60, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-26 14:00:00', '2026-09-28', NULL,
        1, 0.00, NULL, 1, NULL,
        'T081-000000000059', N'David Chen', '2026-09-25 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-26 13:45:00', '2026-09-26 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000027')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000027', 'CUST-0021', 'plan-ll-loc-b', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 199, Đường số 8, Chi nhánh SH-02', '2026-09-13 14:52:00', 'Connection Provided',
        93, N'DP-SH-02-MAIN-4', -16.20, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-22 10:00:00', '2026-08-24', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000060', N'Aiden Brooks', '2026-08-21 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-13 14:52:00', '2026-09-13 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000028')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000028', 'CUST-0022', 'plan-ll-loc-b', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 206, Đường số 9, Chi nhánh SH-04', '2026-09-18 15:59:00', 'Connection Provided',
        102, N'DP-SH-04-MAIN-1', -16.30, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, NULL,
        'T081-000000000061', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-18 15:59:00', '2026-09-18 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000029')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000029', 'CUST-0023', 'plan-ll-loc-b', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 213, Đường số 10, Chi nhánh SH-02', '2026-09-23 16:16:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-23 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-22 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-23 16:16:00', '2026-09-23 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000030')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000030', 'CUST-0024', 'plan-ll-loc-u', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 220, Đường số 11, Chi nhánh SH-03', '2026-09-10 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-10 08:10:00', '2026-09-10 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000031')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000031', 'CUST-0025', 'plan-ll-loc-u', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 227, Đường số 12, Chi nhánh SH-01', '2026-09-15 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-15 09:17:00', '2026-09-15 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000032')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000032', 'CUST-0026', 'plan-ll-loc-u', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 234, Đường số 13, Chi nhánh SH-03', '2026-09-20 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-20 10:24:00', '2026-09-20 10:24:00'
    );
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000033')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000033', 'CUST-0027', 'plan-ll-loc-u', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 241, Đường số 14, Chi nhánh SH-01', '2026-09-25 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        5, 5.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-25 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-25 13:00:00',
        '2026-09-25 11:31:00', '2026-09-25 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000034')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000034', 'CUST-0028', 'plan-ll-loc-u', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 248, Đường số 15, Chi nhánh SH-03', '2026-09-12 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-12 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-12 13:00:00',
        '2026-09-12 12:38:00', '2026-09-12 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000035')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000035', 'CUST-0029', 'plan-ll-loc-u', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 255, Đường số 16, Chi nhánh SH-01', '2026-09-17 13:45:00', 'Feasible',
        205, N'DP-SH-01-P4', -17.50, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-17 14:00:00', '2026-09-19', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000062', N'David Chen', '2026-09-16 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-17 13:45:00', '2026-09-17 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000036')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000036', 'CUST-0030', 'plan-ll-loc-u', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 262, Đường số 17, Chi nhánh SH-03', '2026-09-22 14:52:00', 'Feasible',
        216, N'DP-SH-03-P5', -17.60, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-22 14:00:00', '2026-09-24', NULL,
        1, 0.00, NULL, 1, NULL,
        'T072-000000000063', N'David Chen', '2026-09-21 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-22 14:52:00', '2026-09-22 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000037')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000037', 'CUST-0031', 'plan-ll-loc-u', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 269, Đường số 18, Chi nhánh SH-01', '2026-09-27 15:59:00', 'Connection Provided',
        183, N'DP-SH-01-MAIN-2', -17.20, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000064', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-27 15:59:00', '2026-09-27 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000038')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000038', 'CUST-0032', 'plan-ll-loc-u', 'SH-03', 'emp-02',
        N'Địa chỉ lắp đặt: Số 276, Đường số 19, Chi nhánh SH-03', '2026-09-14 16:16:00', 'Connection Provided',
        192, N'DP-SH-03-MAIN-3', -17.30, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, NULL,
        'T072-000000000065', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-14 16:16:00', '2026-09-14 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000039')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000039', 'CUST-0033', 'plan-ll-loc-u', 'SH-01', 'emp-05',
        N'Địa chỉ lắp đặt: Số 283, Đường số 20, Chi nhánh SH-01', '2026-09-19 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-19 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-18 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-19 08:23:00', '2026-09-19 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000040')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000040', 'CUST-0034', 'plan-ll-std-m', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 290, Đường số 1, Chi nhánh SH-01', '2026-09-22 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-22 08:10:00', '2026-09-22 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000041')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000041', 'CUST-0035', 'plan-ll-std-m', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 297, Đường số 2, Chi nhánh SH-03', '2026-09-27 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-27 09:17:00', '2026-09-27 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000042')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000042', 'CUST-0036', 'plan-ll-std-m', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 304, Đường số 3, Chi nhánh SH-01', '2026-09-14 10:24:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-14 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-14 13:00:00',
        '2026-09-14 10:24:00', '2026-09-14 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000043')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000043', 'CUST-0037', 'plan-ll-std-m', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 11, Đường số 4, Chi nhánh SH-03', '2026-09-19 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        5, 5.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-19 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-19 13:00:00',
        '2026-09-19 11:31:00', '2026-09-19 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000044')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000044', 'CUST-0038', 'plan-ll-std-m', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 18, Đường số 5, Chi nhánh SH-01', '2026-09-24 12:38:00', 'Feasible',
        304, N'DP-SH-01-P5', -18.40, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-24 14:00:00', '2026-09-26', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000066', N'David Chen', '2026-09-23 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-24 12:38:00', '2026-09-24 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000045')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000045', 'CUST-0039', 'plan-ll-std-m', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 25, Đường số 6, Chi nhánh SH-03', '2026-09-11 13:45:00', 'Feasible',
        315, N'DP-SH-03-P6', -18.50, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-11 14:00:00', '2026-09-13', NULL,
        1, 0.00, NULL, 1, NULL,
        'T072-000000000067', N'David Chen', '2026-09-10 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-11 13:45:00', '2026-09-11 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000046')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000046', 'CUST-0040', 'plan-ll-std-m', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 32, Đường số 7, Chi nhánh SH-01', '2026-09-16 14:52:00', 'Connection Provided',
        64, N'DP-SH-01-MAIN-3', -18.10, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-22 10:00:00', '2026-08-24', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000068', N'Aiden Brooks', '2026-08-21 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-16 14:52:00', '2026-09-16 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000047')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000047', 'CUST-0041', 'plan-ll-std-m', 'SH-03', 'emp-05',
        N'Địa chỉ lắp đặt: Số 39, Đường số 8, Chi nhánh SH-03', '2026-09-21 15:59:00', 'Connection Provided',
        73, N'DP-SH-03-MAIN-4', -18.20, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, NULL,
        'T072-000000000069', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-21 15:59:00', '2026-09-21 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000048')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000048', 'CUST-0042', 'plan-ll-std-m', 'SH-01', 'emp-02',
        N'Địa chỉ lắp đặt: Số 46, Đường số 9, Chi nhánh SH-01', '2026-09-26 16:16:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-26 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-25 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-26 16:16:00', '2026-09-26 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000049')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000049', 'CUST-0043', 'plan-ll-std-h', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 53, Đường số 10, Chi nhánh SH-02', '2026-09-13 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-13 08:10:00', '2026-09-13 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000050')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000050', 'CUST-0044', 'plan-ll-std-h', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 60, Đường số 11, Chi nhánh SH-04', '2026-09-18 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-18 09:17:00', '2026-09-18 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000051')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000051', 'CUST-0045', 'plan-ll-std-h', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 67, Đường số 12, Chi nhánh SH-02', '2026-09-23 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-23 10:24:00', '2026-09-23 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000052')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000052', 'CUST-0046', 'plan-ll-std-h', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 74, Đường số 13, Chi nhánh SH-04', '2026-09-10 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        5, 5.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-10 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-10 13:00:00',
        '2026-09-10 11:31:00', '2026-09-10 11:31:00'
    );
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000053')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000053', 'CUST-0047', 'plan-ll-std-h', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 81, Đường số 14, Chi nhánh SH-02', '2026-09-15 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-15 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-15 13:00:00',
        '2026-09-15 12:38:00', '2026-09-15 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000054')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000054', 'CUST-0001', 'plan-ll-std-h', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 88, Đường số 15, Chi nhánh SH-04', '2026-09-20 13:45:00', 'Feasible',
        164, N'DP-SH-04-P7', -19.40, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-20 14:00:00', '2026-09-22', NULL,
        1, 0.00, NULL, 1, NULL,
        'T081-000000000070', N'David Chen', '2026-09-19 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-20 13:45:00', '2026-09-20 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000055')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000055', 'CUST-0002', 'plan-ll-std-h', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 95, Đường số 16, Chi nhánh SH-02', '2026-09-25 14:52:00', 'Feasible',
        175, N'DP-SH-02-P8', -19.50, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-25 14:00:00', '2026-09-27', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000071', N'David Chen', '2026-09-24 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-25 14:52:00', '2026-09-25 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000056')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000056', 'CUST-0003', 'plan-ll-std-h', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 102, Đường số 17, Chi nhánh SH-04', '2026-09-12 15:59:00', 'Connection Provided',
        154, N'DP-SH-04-MAIN-1', -14.10, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, NULL,
        'T081-000000000072', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-12 15:59:00', '2026-09-12 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000057')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000057', 'CUST-0004', 'plan-ll-std-h', 'SH-02', 'emp-02',
        N'Địa chỉ lắp đặt: Số 109, Đường số 18, Chi nhánh SH-02', '2026-09-17 16:16:00', 'Connection Provided',
        163, N'DP-SH-02-MAIN-2', -14.20, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000073', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-17 16:16:00', '2026-09-17 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000058')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000058', 'CUST-0005', 'plan-ll-std-h', 'SH-04', 'emp-05',
        N'Địa chỉ lắp đặt: Số 116, Đường số 19, Chi nhánh SH-04', '2026-09-22 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-22 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-21 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-22 08:23:00', '2026-09-22 08:23:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000059')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000059', 'CUST-0006', 'plan-ll-std-y', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 123, Đường số 20, Chi nhánh SH-04', '2026-09-25 08:10:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-25 08:10:00', '2026-09-25 08:10:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000060')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000060', 'CUST-0007', 'plan-ll-std-y', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 130, Đường số 1, Chi nhánh SH-02', '2026-09-12 09:17:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-12 09:17:00', '2026-09-12 09:17:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000061')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000061', 'CUST-0008', 'plan-ll-std-y', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 137, Đường số 2, Chi nhánh SH-04', '2026-09-17 10:24:00', 'PendingRetail',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, NULL, NULL, N'Khách hàng đăng ký trực tuyến qua cổng Self-Service, đang chờ duyệt hồ sơ tại quầy.',
        NULL, NULL, NULL,
        '2026-09-17 10:24:00', '2026-09-17 10:24:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000062')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000062', 'CUST-0009', 'plan-ll-std-y', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 144, Đường số 3, Chi nhánh SH-02', '2026-09-22 11:31:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        5, 5.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-22 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-22 13:00:00',
        '2026-09-22 11:31:00', '2026-09-22 11:31:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000063')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000063', 'CUST-0010', 'plan-ll-std-y', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 151, Đường số 4, Chi nhánh SH-04', '2026-09-27 12:38:00', 'Pending',
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        1, 0.00, NULL, NULL, NULL,
        NULL, N'David Chen', '2026-09-27 11:30:00', N'Đã xác minh hồ sơ và thanh toán tiền cọc, chuyển giao Kỹ thuật viên khảo sát tuyến cáp.',
        N'Marcus Ramirez', '+1 (555) 456-7890', '2026-09-27 13:00:00',
        '2026-09-27 12:38:00', '2026-09-27 12:38:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000064')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000064', 'CUST-0011', 'plan-ll-std-y', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 158, Đường số 5, Chi nhánh SH-02', '2026-09-14 13:45:00', 'Feasible',
        274, N'DP-SH-02-P1', -14.40, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-14 14:00:00', '2026-09-16', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000074', N'David Chen', '2026-09-13 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-14 13:45:00', '2026-09-14 13:45:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000065')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000065', 'CUST-0012', 'plan-ll-std-y', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 165, Đường số 6, Chi nhánh SH-04', '2026-09-19 14:52:00', 'Feasible',
        285, N'DP-SH-04-P2', -14.50, N'Tuyến cáp đạt tiêu chuẩn suy hao. Hộp chia cổng còn vị trí trống, đủ điều kiện thi công.',
        'emp-03', '2026-09-19 14:00:00', '2026-09-21', NULL,
        1, 0.00, NULL, 1, NULL,
        'T081-000000000075', N'David Chen', '2026-09-18 10:00:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-19 14:52:00', '2026-09-19 14:52:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000066')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000066', 'CUST-0013', 'plan-ll-std-y', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 172, Đường số 7, Chi nhánh SH-02', '2026-09-24 15:59:00', 'Connection Provided',
        244, N'DP-SH-02-MAIN-3', -15.10, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-23 10:00:00', '2026-08-25', NULL,
        1, 0.00, NULL, 1, NULL,
        'T064-000000000076', N'Aiden Brooks', '2026-08-22 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-24 15:59:00', '2026-09-24 15:59:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000067')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000067', 'CUST-0014', 'plan-ll-std-y', 'SH-04', 'emp-02',
        N'Địa chỉ lắp đặt: Số 179, Đường số 8, Chi nhánh SH-04', '2026-09-11 16:16:00', 'Connection Provided',
        53, N'DP-SH-04-MAIN-4', -15.20, N'Đã đấu nối riser quang, kiểm tra tốc độ băng thông ổn định đạt chỉ tiêu gói.',
        'emp-03', '2026-08-24 10:00:00', '2026-08-26', NULL,
        1, 0.00, NULL, 1, NULL,
        'T081-000000000077', N'Aiden Brooks', '2026-08-23 09:00:00', N'Đã hoàn tất duyệt hồ sơ và thanh toán.',
        NULL, NULL, NULL,
        '2026-09-11 16:16:00', '2026-09-11 16:16:00'
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderID = 'T0000000068')
BEGIN
    INSERT INTO dbo.Orders (
        OrderID, CustomerID, PlanID, StoreID, EmployeeID,
        InstallationAddress, ApplicationDate, Status,
        CableDistanceMeters, DpBoxCapacity, SignalLossDbm, FeasibilityNotes,
        FeasibilityCheckedBy, FeasibilityCheckedDate, ScheduledInstallDate, RejectionReason,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, LandlineFeasible, InternetFeasible,
        AssignedAccountId, RetailApprovedBy, RetailApprovedDate, RetailApprovalNotes,
        AssignedTechnicianName, AssignedTechnicianPhone, AssignedTechnicianDate,
        CreatedAt, UpdatedAt
    ) VALUES (
        'T0000000068', 'CUST-0015', 'plan-ll-std-y', 'SH-02', 'emp-05',
        N'Địa chỉ lắp đặt: Số 186, Đường số 9, Chi nhánh SH-02', '2026-09-16 08:23:00', 'Not Feasible',
        1250, N'No Spare Ports / OLT Saturated', -35.50, N'Khoảng cách từ trạm DP tới địa chỉ lắp đặt vượt quá 1.2km, suy hao quang đo được -35.5 dBm vượt ngưỡng quy định.',
        'emp-03', '2026-09-16 16:30:00', NULL, N'Khoảng cách cáp > 1.2km và suy hao tín hiệu quang vượt ngưỡng cho phép (-35.5 dBm). Cần mở rộng trạm lặp.',
        1, 0.00, NULL, 0, 0,
        NULL, N'David Chen', '2026-09-15 09:30:00', N'Hồ sơ hợp lệ, đã duyệt chuyển khảo sát.',
        NULL, NULL, NULL,
        '2026-09-16 08:23:00', '2026-09-16 08:23:00'
    );
END;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '3. Thêm tài khoản kết nối cho các đơn đã cấp kết nối vào dbo.CustomerConnection...';

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B064-000000000013')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B064-000000000013', 'B0000000022', NULL, 'Active', '103.21.23.92', 'PORT-SH-01-14', '2026-08-24 14:00:00', '2026-08-24 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B072-000000000014')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B072-000000000014', 'B0000000023', NULL, 'Active', '103.21.24.99', 'PORT-SH-03-15', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B081-000000000016')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B081-000000000016', 'B0000000026', NULL, 'Active', '103.21.26.113', 'PORT-SH-04-1', '2026-08-19 14:00:00', '2026-08-19 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B064-000000000017')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B064-000000000017', 'B0000000027', NULL, 'Active', '103.21.27.120', 'PORT-SH-02-2', '2026-08-20 14:00:00', '2026-08-20 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B064-000000000020')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B064-000000000020', 'B0000000035', NULL, 'Active', '103.21.30.141', 'PORT-SH-02-5', '2026-08-24 14:00:00', '2026-08-24 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B081-000000000021')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B081-000000000021', 'B0000000036', NULL, 'Active', '103.21.31.148', 'PORT-SH-04-6', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B072-000000000024')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B072-000000000024', 'B0000000044', NULL, 'Active', '103.21.34.169', 'PORT-SH-03-9', '2026-08-24 14:00:00', '2026-08-24 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B064-000000000025')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B064-000000000025', 'B0000000045', NULL, 'Active', '103.21.35.176', 'PORT-SH-01-10', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B064-000000000028')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B064-000000000028', 'B0000000054', NULL, 'Active', '103.21.38.197', 'PORT-SH-02-13', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'B081-000000000029')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('B081-000000000029', 'B0000000055', NULL, 'Active', '103.21.39.204', 'PORT-SH-04-14', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D064-000000000032')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D064-000000000032', 'D0000000014', NULL, 'Active', '192.168.32.97', 'PORT-SH-02-1', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D081-000000000033')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D081-000000000033', 'D0000000015', NULL, 'Active', '192.168.33.100', 'PORT-SH-04-2', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D081-000000000036')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D081-000000000036', 'D0000000024', NULL, 'Active', '192.168.36.109', 'PORT-SH-04-5', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D064-000000000037')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D064-000000000037', 'D0000000025', NULL, 'Active', '192.168.37.112', 'PORT-SH-02-6', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D064-000000000040')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D064-000000000040', 'D0000000032', NULL, 'Active', '192.168.40.121', 'PORT-SH-02-9', '2026-08-23 14:00:00', '2026-08-23 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D081-000000000041')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D081-000000000041', 'D0000000033', NULL, 'Active', '192.168.41.124', 'PORT-SH-04-10', '2026-08-24 14:00:00', '2026-08-24 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D064-000000000044')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D064-000000000044', 'D0000000042', NULL, 'Active', '192.168.44.133', 'PORT-SH-02-13', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D081-000000000045')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D081-000000000045', 'D0000000043', NULL, 'Active', '192.168.45.136', 'PORT-SH-04-14', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D081-000000000048')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D081-000000000048', 'D0000000052', NULL, 'Active', '192.168.48.145', 'PORT-SH-04-1', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D064-000000000049')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D064-000000000049', 'D0000000053', NULL, 'Active', '192.168.49.148', 'PORT-SH-02-2', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D064-000000000052')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D064-000000000052', 'D0000000062', NULL, 'Active', '192.168.52.157', 'PORT-SH-02-5', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'D081-000000000053')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('D081-000000000053', 'D0000000063', NULL, 'Active', '192.168.53.160', 'PORT-SH-04-6', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T064-000000000056')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T064-000000000056', 'T0000000018', NULL, 'Active', '198.51.100.57', 'PORT-SH-01-9', '2026-08-24 14:00:00', '2026-08-24 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T072-000000000057')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T072-000000000057', 'T0000000019', NULL, 'Active', '198.51.100.58', 'PORT-SH-03-10', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T064-000000000060')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T064-000000000060', 'T0000000027', NULL, 'Active', '198.51.100.61', 'PORT-SH-02-13', '2026-08-24 14:00:00', '2026-08-24 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T081-000000000061')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T081-000000000061', 'T0000000028', NULL, 'Active', '198.51.100.62', 'PORT-SH-04-14', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T064-000000000064')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T064-000000000064', 'T0000000037', NULL, 'Active', '198.51.100.65', 'PORT-SH-01-1', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T072-000000000065')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T072-000000000065', 'T0000000038', NULL, 'Active', '198.51.100.66', 'PORT-SH-03-2', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T064-000000000068')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T064-000000000068', 'T0000000046', NULL, 'Active', '198.51.100.69', 'PORT-SH-01-5', '2026-08-24 14:00:00', '2026-08-24 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T072-000000000069')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T072-000000000069', 'T0000000047', NULL, 'Active', '198.51.100.70', 'PORT-SH-03-6', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T081-000000000072')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T081-000000000072', 'T0000000056', NULL, 'Active', '198.51.100.73', 'PORT-SH-04-9', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T064-000000000073')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T064-000000000073', 'T0000000057', NULL, 'Active', '198.51.100.74', 'PORT-SH-02-10', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T064-000000000076')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T064-000000000076', 'T0000000066', NULL, 'Active', '198.51.100.77', 'PORT-SH-02-13', '2026-08-25 14:00:00', '2026-08-25 15:00:00');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection WHERE AccountID = 'T081-000000000077')
BEGIN
    INSERT INTO dbo.CustomerConnection (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated)
    VALUES ('T081-000000000077', 'T0000000067', NULL, 'Active', '198.51.100.78', 'PORT-SH-04-14', '2026-08-26 14:00:00', '2026-08-26 15:00:00');
END;
GO

PRINT '4. Kiểm tra số lượng đơn hàng theo từng gói cước trong dbo.Orders:';
SELECT 
    sp.PlanID,
    sp.ConnectionType,
    sp.Name AS PlanName,
    COUNT(o.OrderID) AS OrderCount
FROM dbo.ServicePlan sp
LEFT JOIN dbo.Orders o ON sp.PlanID = o.PlanID
GROUP BY sp.PlanID, sp.ConnectionType, sp.Name
ORDER BY sp.ConnectionType, sp.PlanID;
GO

