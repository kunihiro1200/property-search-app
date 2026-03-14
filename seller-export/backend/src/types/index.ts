// Enums
export enum SellerStatus {
  FOLLOWING_UP = 'following_up',
  APPOINTMENT_SCHEDULED = 'appointment_scheduled',
  VISITED = 'visited',
  EXCLUSIVE_CONTRACT = 'exclusive_contract',
  GENERAL_CONTRACT = 'general_contract',
  CONTRACTED = 'contracted',
  OTHER_DECISION = 'other_decision',
  FOLLOW_UP_NOT_NEEDED = 'follow_up_not_needed',
  LOST = 'lost',
}

export enum ConfidenceLevel {
  A = 'A', // 売る気あり
  B = 'B', // 売る気あるがまだ先の話
  B_PRIME = 'B_PRIME', // 売る気は全く無い
  C = 'C', // 電話が繋がらない
  D = 'D', // 再建築不可
  E = 'E', // 収益物件（アパート１棟等）
  DUPLICATE = 'DUPLICATE', // ダブり（重複している）
}

export enum PropertyType {
  DETACHED_HOUSE = 'detached_house',
  APARTMENT = 'apartment',
  LAND = 'land',
  COMMERCIAL = 'commercial',
}

export enum ActivityType {
  PHONE_CALL = 'phone_call',
  EMAIL = 'email',
  SMS = 'sms',
  HEARING = 'hearing',
  APPOINTMENT = 'appointment',
}

export enum EmployeeRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  VIEWER = 'viewer',
}

export enum InquirySource {
  IEUL = 'ウ',
  LIFULL = 'L',
  // Add more as needed
}

// Interfaces
export interface Seller {
  // 基本情報
  id: string;
  sellerNumber: string; // 売主番号（AA + 5桁数字）
  name: string;
  phoneNumber: string;
  email?: string;
  requestorAddress?: string; // 依頼者住所
  
  // 反響情報
  inquiryYear?: number;
  // inquiry_date カラムは存在しないため削除
  inquiryDetailedDateTime?: Date;
  inquirySite?: string; // サイト（ウ、L等）
  inquiryReason?: string; // 査定理由
  siteUrl?: string;
  numberOfCompanies?: number; // 送信社数
  
  // 物件情報（PropertyInfoとして別管理）
  address: string; // 物件所在地
  propertyAddressForIeulMansion?: string; // イエウール・マンション専用
  
  // 査定情報
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  valuationAssignedBy?: string; // 査定担当者名
  postVisitValuationAmount1?: number;
  valuationMethod?: string;
  valuationText?: string; // I列「査定額」テキスト形式（例: "1900～2200万円"）
  valuationPdfUrl?: string;
  fixedAssetTaxRoadPrice?: number;
  
  // 追客・連絡情報
  nextCallDate?: Date;
  unreachable?: boolean; // 不通
  unreachableStatus?: string | null; // 不通ステータス（「不通」など）
  emailSentDate?: Date; // E/日付
  mailSentDate?: Date; // 郵/日付
  firstCallInitials?: string; // 一番TEL
  firstCallPerson?: string; // 1番電話
  secondCallAfterUnreachable?: boolean;
  phoneContactPerson?: string; // 電話担当（任意）
  preferredContactTime?: string; // 連絡取りやすい日、時間帯
  contactMethod?: string; // 連絡方法
  mailingStatus?: string; // 郵送（未、済）
  alternativeMailingAddress?: string;
  
  // 訪問査定情報
  visitAcquisitionDate?: Date;
  visitDate?: Date;
  visitTime?: string;
  visitDayOfWeek?: string;
  visitAssignee?: string; // 営担
  visitValuationAcquirer?: string; // 訪問査定取得者（visit_valuation_acquirer）
  visitNotes?: string;
  visitRatio?: number;
  appointmentDate?: Date; // 訪問予約日時
  appointmentNotes?: string; // 訪問予約メモ
  viewingNotes?: string; // 内覧前伝達事項
  
  // 最新状況
  latestStatus?: string; // 最新状況
  
  // ステータス・進捗
  status: SellerStatus;
  assignedTo?: string;
  valuationAssignee?: string; // 査定担当
  phoneAssignee?: string; // 電話担当
  contractYearMonth?: Date;
  exclusiveOtherDecisionMeeting?: string; // 専任他決打合せ
  
  // 競合・他決情報
  competitorNameAndReason?: string;
  competitorName?: string;
  exclusiveOtherDecisionFactor?: string;
  exclusiveOtherDecisionFactors?: string[]; // 専任・他決要因（複数選択）
  otherDecisionCountermeasure?: string;
  
  // Pinrich
  pinrichStatus?: string;
  
  // 重複管理
  pastOwnerInfo?: string;
  pastPropertyInfo?: string;
  requiresDuplicateCheck?: boolean;
  sellerCopy?: string;
  buyerCopy?: string;
  purchaseInfo?: string;
  
  // 除外管理
  exclusionSite?: string;
  exclusionCriteria?: string;
  exclusionDate?: Date;
  exclusionAction?: string;
  
  // その他
  cancelNoticeAssignee?: string;
  exclusiveScript?: string;
  priceLossListEntered?: boolean;
  companyIntroduction?: string;
  propertyIntroduction?: string;
  site?: string; // サイト（問い合わせ元）
  
  // システム管理
  createdAt: Date;
  updatedAt: Date;
  
  // Phase 1 backward compatibility
  inquirySource?: string; // alias for inquirySite
  inquiryDatetime?: Date; // alias for inquiryDetailedDateTime
  // inquiry_date は削除（DBに存在しない）
  isUnreachable?: boolean; // alias for unreachable
  unreachableSince?: Date;
  firstCallerInitials?: string; // alias for firstCallInitials
  firstCallerEmployeeId?: string;
  confidenceLevel?: ConfidenceLevel; // alias for confidence
  duplicateConfirmed?: boolean;
  duplicateConfirmedAt?: Date;
  duplicateConfirmedBy?: string;
  duplicateMatches?: DuplicateMatch[];
  
  // 物件情報（オプション）
  property?: PropertyInfo;
  
  // 物件関連フィールド（sellersテーブルに直接保存）
  propertyAddress?: string; // 物件所在地
  propertyType?: string; // 種別（土地、戸建、マンション等）
  landArea?: number; // 土地面積（㎡）
  buildingArea?: number; // 建物面積（㎡）
  buildYear?: number; // 築年
  structure?: string; // 構造
  floorPlan?: string; // 間取り
}

export interface PropertyInfo {
  id?: string;
  sellerId: string;
  address: string;
  prefecture: string;
  city: string;
  propertyType: PropertyType;
  landArea?: number;
  buildingArea?: number;
  landAreaVerified?: number; // 土地（当社調べ）
  buildingAreaVerified?: number; // 建物（当社調べ）
  buildYear?: number;
  structure?: string;
  floorPlan?: string; // 間取り
  floors?: number;
  rooms?: number;
  sellerSituation?: string; // 居住中、空き家、賃貸中、古屋あり、更地
  parking?: boolean;
  additionalInfo?: string;
}

export interface ValuationResult {
  id?: string;
  sellerId: string;
  valuation1: number; // 査定額1（最低額）
  valuation2: number; // 査定額2（中間額）
  valuation3: number; // 査定額3（最高額）
  calculationBasis: string;
  isAnomalous: boolean;
  warnings?: string[];
  calculatedAt: Date;
}

export interface Activity {
  id: string;
  sellerId: string;
  employeeId: string;
  type: ActivityType;
  content: string;
  result?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  employee?: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export interface ActivityWithEmployee extends Activity {
  employee: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export interface Employee {
  id: string;
  googleId: string;
  email: string;
  name: string;
  role: EmployeeRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  initials?: string;
  lastName?: string;
  firstName?: string;
  chatWebhookUrl?: string;
  phoneNumber?: string;
}

export interface ActivityLog {
  id: string;
  employeeId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  sellerId: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  location: string;
  calendarEventId?: string;
  assignedTo?: string; // 営担イニシャル
  notes?: string;
  createdByName?: string; // 予約作成者の名前
  createdAt: Date;
}

// 新しい型定義
export interface InquiryInfo {
  inquiryYear: number;
  // inquiry_date は削除（DBに存在しない）
  inquiryDetailedDateTime?: Date;
  inquirySite?: string;
  inquiryReason?: string;
  siteUrl?: string;
  numberOfCompanies?: number;
}

export interface ValuationInfo {
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  postVisitValuationAmount1?: number;
  valuationMethod?: string;
  valuationText?: string; // I列「査定額」テキスト形式（例: "1900～2200万円"）
  valuationPdfUrl?: string;
  fixedAssetTaxRoadPrice?: number;
}

export interface VisitInfo {
  visitAcquisitionDate?: Date;
  visitDate?: Date;
  visitTime?: string;
  visitDayOfWeek?: string;
  visitAssignee?: string;
  visitAcquiredBy?: string;
  visitNotes?: string;
  visitRatio?: number;
}

export interface CompetitorInfo {
  competitorNameAndReason?: string;
  competitorName?: string;
  exclusiveOtherDecisionFactor?: string;
  exclusiveOtherDecisionFactors?: string[]; // 専任・他決要因（複数選択）
  otherDecisionCountermeasure?: string;
  contractYearMonth?: Date;
  exclusiveOtherDecisionMeeting?: string;
}

export interface ExclusionInfo {
  exclusionSite?: string;
  exclusionCriteria?: string;
  exclusionDate?: Date;
  exclusionAction?: string;
}

// Phase 1 Duplicate Detection
export interface DuplicateMatch {
  sellerId: string;
  matchType: 'phone' | 'email' | 'both';
  sellerInfo: {
    name: string;
    phoneNumber: string;
    email?: string;
    inquiryDate?: Date;
    sellerNumber?: string;
  };
  propertyInfo?: {
    address: string;
    propertyType: string;
  };
}

export interface DuplicateWarning {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
  canProceed: boolean;
}

// Request/Response types
export interface CreateSellerRequest {
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  property: Omit<PropertyInfo, 'id' | 'sellerId'>;
  // Phase 1 fields
  sellerNumber?: string;
  inquirySource: string;
  inquiryYear: number;
  // inquiry_date は削除（DBに存在しない）
  inquiryDatetime?: Date;
  confidenceLevel?: ConfidenceLevel;
  firstCallerInitials?: string;
  firstCallerEmployeeId?: string;
  site?: string; // サイト（問い合わせ元）
}

export interface UpdateSellerRequest {
  name?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  status?: SellerStatus;
  assignedTo?: string;
  nextCallDate?: Date;
  appointmentDate?: Date | string | null;
  appointmentNotes?: string | null;
  visitValuationAcquirer?: string | null; // 訪問査定取得者
  fixedAssetTaxRoadPrice?: number;
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  valuationAssignedBy?: string;
  site?: string; // サイト（問い合わせ元）
  exclusionAction?: string; // 除外アクション
  viewingNotes?: string; // 内覧前伝達事項
  latestStatus?: string; // 最新状況
  phoneContactPerson?: string; // 電話担当（任意）
  preferredContactTime?: string; // 連絡取りやすい日、時間帯
  contactMethod?: string; // 連絡方法
  // Phase 1 fields
  inquirySource?: string;
  inquiryYear?: number;
  // inquiry_date は削除（DBに存在しない）
  isUnreachable?: boolean;
  confidenceLevel?: ConfidenceLevel;
  firstCallerInitials?: string;
  duplicateConfirmed?: boolean;
}

export interface ListSellersParams {
  page: number;
  pageSize: number;
  status?: SellerStatus;
  assignedTo?: string;
  nextCallDateFrom?: Date;
  nextCallDateTo?: Date;
  searchQuery?: string; // 名前、住所、電話番号、売主番号での検索
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Phase 1 filters
  inquirySource?: string;
  inquiryYearFrom?: number;
  inquiryYearTo?: number;
  isUnreachable?: boolean;
  confidenceLevel?: ConfidenceLevel;
  firstCaller?: string;
  duplicateConfirmed?: boolean;
  // Deletion sync filter
  includeDeleted?: boolean; // Default: false (exclude deleted sellers)
  // サイドバーカテゴリフィルター
  statusCategory?: 'all' | 'todayCall' | 'todayCallWithInfo' | 'todayCallAssigned' | 'visitScheduled' | 'visitCompleted' | 'unvaluated' | 'mailingPending';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}

export interface AuthResult {
  employee: Employee;
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// Phase 1 API Response types
export interface CreateSellerResponse {
  seller: Seller;
  duplicateWarning?: DuplicateWarning;
}


// Viewing Result types
export interface ViewingResult {
  id: string;
  buyer_id: string;
  buyer_number: string;  // Current or past buyer number
  property_number: string;
  viewing_date: Date;
  assignee?: string;
  calendar_event_id?: string;
  status: string;
  result?: string;
  feedback?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateViewingResultRequest {
  buyer_id: string;
  buyer_number: string;
  property_number: string;
  viewing_date: Date;
  assignee?: string;
  status?: string;
  result?: string;
  feedback?: string;
}

export interface ViewingResultsByBuyerNumber {
  buyerNumber: string;
  viewingResults: ViewingResult[];
}

// Inquiry History types
export interface InquiryHistory {
  id: string;
  sellerId: string;
  inquiryDate: Date;
  inquirySite?: string;
  inquiryReason?: string;
  isCurrentStatus: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInquiryHistoryRequest {
  sellerId: string;
  inquiryDate: Date;
  inquirySite?: string;
  inquiryReason?: string;
  isCurrentStatus?: boolean;
  notes?: string;
}

export interface UpdateInquiryHistoryRequest {
  inquiryDate?: Date;
  inquirySite?: string;
  inquiryReason?: string;
  isCurrentStatus?: boolean;
  notes?: string;
}

// ============================================================================
// Phase 2: Properties & Valuations Types
// ============================================================================

// Property Types
export interface Property {
  id: string;
  seller_id: string;
  property_type: '戸建て' | '土地' | 'マンション';
  land_area: number | null;
  building_area: number | null;
  land_area_verified: number | null;
  building_area_verified: number | null;
  construction_year: number | null;
  structure: '木造' | '軽量鉄骨' | '鉄骨' | '他' | null;
  property_address: string;
  property_address_ieul_apartment: string | null;
  current_status: '居住中' | '空き家' | '賃貸中' | '古屋あり' | '更地' | null;
  fixed_asset_tax_road_price: number | null;
  floor_plan: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  version: number;
}

export interface CreatePropertyRequest {
  seller_id: string;
  property_type: '戸建て' | '土地' | 'マンション';
  land_area?: number;
  building_area?: number;
  land_area_verified?: number;
  building_area_verified?: number;
  construction_year?: number;
  structure?: '木造' | '軽量鉄骨' | '鉄骨' | '他';
  property_address: string;
  property_address_ieul_apartment?: string;
  current_status?: '居住中' | '空き家' | '賃貸中' | '古屋あり' | '更地';
  fixed_asset_tax_road_price?: number;
  floor_plan?: string;
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  version: number; // For optimistic locking
}

// Valuation Types
export interface Valuation {
  id: string;
  property_id: string;
  valuation_type: 'automatic' | 'manual' | 'post_visit';
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  calculation_method: string | null;
  calculation_parameters: object | null;
  valuation_report_url: string | null;
  valuation_date: Date;
  created_by: string | null;
  notes: string | null;
  created_at: Date;
}

export interface CreateValuationRequest {
  property_id: string;
  valuation_type: 'automatic' | 'manual' | 'post_visit';
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  calculation_method?: string;
  calculation_parameters?: object;
  valuation_report_url?: string;
  notes?: string;
}

export interface ValuationCalculationResult {
  amount1: number;
  amount2: number;
  amount3: number;
  method: string;
  parameters: {
    landArea?: number;
    buildingArea?: number;
    constructionYear?: number;
    structure?: string;
    landValue: number;
    buildingValue: number;
    totalValue: number;
  };
}

export interface ValuationComparison {
  valuation1: Valuation;
  valuation2: Valuation;
  differences: {
    amount1: number;
    amount2: number;
    amount3: number;
  };
  percentageChanges: {
    amount1: number;
    amount2: number;
    amount3: number;
  };
}
