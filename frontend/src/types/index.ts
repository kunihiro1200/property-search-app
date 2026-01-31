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
  inquiryYear: number;
  inquiryDate?: string | Date; // 反響日付（camelCase）
  inquiry_date?: string | null; // 反響日付（snake_case）- ステータス計算用
  inquiryDetailedDateTime?: string | Date;
  inquiryDetailedDatetime?: string | Date; // バックエンド互換用（小文字t）
  inquirySite?: string; // サイト（ウ、L等）
  inquiryReason?: string; // 査定理由
  siteUrl?: string;
  numberOfCompanies?: number; // 送信社数
  
  // 物件情報
  address: string; // 物件所在地
  propertyAddressForIeulMansion?: string; // イエウール・マンション専用
  
  // 査定情報
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  postVisitValuationAmount1?: number;
  valuationMethod?: string;
  valuation_method?: string | null; // 査定方法 - snake_case版
  valuationText?: string; // I列「査定額」テキスト形式（例: "1900～2200万円"）
  valuation_text?: string | null; // I列「査定額」テキスト形式 - snake_case版
  valuationPdfUrl?: string;
  fixedAssetTaxRoadPrice?: number;
  
  // 追客・連絡情報
  nextCallDate?: string | Date;
  next_call_date?: string | null; // スプレッドシートD列（次電日）
  unreachable?: boolean; // 不通（旧フィールド名）
  is_unreachable?: boolean; // 不通（データベースのフィールド名）
  not_reachable?: string | null; // スプレッドシートJ列（不通）- 文字列形式
  emailSentDate?: string | Date; // E/日付
  mailSentDate?: string | Date; // 郵/日付
  firstCallInitials?: string; // 一番TEL
  firstCallPerson?: string; // 1番電話
  secondCallAfterUnreachable?: boolean;
  phoneContactPerson?: string; // 電話担当（任意）
  phone_contact_person?: string | null; // 電話担当（任意）- snake_case版
  preferredContactTime?: string; // 連絡取りやすい日、時間帯
  preferred_contact_time?: string | null; // 連絡取りやすい日、時間帯 - snake_case版
  contactMethod?: string; // 連絡方法
  contact_method?: string | null; // 連絡方法 - snake_case版
  mailingStatus?: string; // 郵送（未、済）
  alternativeMailingAddress?: string;
  
  // 訪問査定情報
  visitAcquisitionDate?: string | Date;
  visitDate?: string | Date;
  visit_date?: string | null; // スプレッドシートAB列（訪問日 Y/M/D）
  visitTime?: string;
  visitDayOfWeek?: string;
  visitAssignee?: string; // 営担
  visitAcquiredBy?: string; // 訪問査定取得者（旧フィールド名）
  visitValuationAcquirer?: string; // 訪問査定取得者（visit_valuation_acquirer）
  visitNotes?: string;
  visitRatio?: number;
  
  // ステータス・進捗
  status: SellerStatus | string; // スプレッドシートから同期された日本語の値も許可
  situation_company?: string | null; // スプレッドシートAH列（状況（当社））
  assignedTo?: string;
  appointmentDate?: string | Date; // 訪問予定日時
  appointmentNotes?: string; // 訪問予約メモ
  valuationAssignee?: string; // 査定担当
  phoneAssignee?: string; // 電話担当
  phone_person?: string | null; // スプレッドシートCQ列（電話担当（任意））
  contractYearMonth?: string | Date;
  exclusiveOtherDecisionMeeting?: string; // 専任他決打合せ
  comments?: string;
  
  // 競合・他決情報
  competitorNameAndReason?: string;
  competitorName?: string;
  exclusiveOtherDecisionFactor?: string;
  exclusiveOtherDecisionFactors?: string[]; // 専任・他決要因（複数選択）
  otherDecisionCountermeasure?: string;
  
  // Pinrich
  pinrichStatus?: string;
  pinrich?: string | null; // スプレッドシートBF列（Pinrich）
  pinrich_status?: string | null; // Pinrichステータス - snake_case版
  
  // ステータス（計算されたもの）
  statusList?: string[]; // 計算されたステータスの配列
  
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
  exclusionDate?: string | Date;
  exclusionAction?: string;
  
  // その他
  cancelNoticeAssignee?: string;
  exclusiveScript?: string;
  priceLossListEntered?: boolean;
  companyIntroduction?: string;
  propertyIntroduction?: string;
  site?: string; // サイト（問い合わせ元）
  
  // 内覧前伝達事項と最新状況
  viewingNotes?: string; // 内覧前伝達事項
  latestStatus?: string; // 最新状況
  
  // システム管理
  createdAt: string;
  updatedAt: string;
  
  // 関連データ
  property?: PropertyInfo; // 物件情報（APIレスポンスに含まれる場合）
  
  // Phase 1 backward compatibility
  inquirySource?: string; // alias for inquirySite
  inquiryDatetime?: string | Date; // alias for inquiryDetailedDateTime
  isUnreachable?: boolean; // alias for unreachable
  unreachableSince?: string | Date;
  firstCallerInitials?: string; // alias for firstCallInitials
  firstCallerEmployeeId?: string;
  confidenceLevel?: ConfidenceLevel | string; // alias for confidence
  duplicateConfirmed?: boolean;
  duplicateConfirmedAt?: string | Date;
  duplicateConfirmedBy?: string;
  lastCallDate?: string;
  
  // 物件関連フィールド（sellersテーブルに直接保存）
  propertyAddress?: string; // 物件所在地
  property_address?: string | null; // 物件所在地 - snake_case版
  propertyType?: string; // 種別（土地、戸建、マンション等）
  property_type?: string | null; // 種別 - snake_case版
  landArea?: number; // 土地面積（㎡）
  land_area?: number | null; // 土地面積 - snake_case版
  buildingArea?: number; // 建物面積（㎡）
  building_area?: number | null; // 建物面積 - snake_case版
  buildYear?: number; // 築年
  build_year?: number | null; // 築年 - snake_case版
  structure?: string; // 構造
  floorPlan?: string; // 間取り
  floor_plan?: string | null; // 間取り - snake_case版
}

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

export interface CreateSellerResponse {
  seller: Seller;
  duplicateWarning?: DuplicateWarning;
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
  sellerSituation?: string; // 居住中、空き家、賃貸中、古屋あり、更地（後方互換性のため残す）
  currentStatus?: string; // 現況（新しいフィールド）: '空き家', '居住中', '賃貸中', '古屋あり', '更地'
  parking?: boolean;
  additionalInfo?: string;
}

export interface ValuationResult {
  id?: string;
  sellerId: string;
  estimatedPrice: number;
  priceMin: number;
  priceMax: number;
  calculationBasis: string;
  isAnomalous: boolean;
  warnings?: string[];
  calculatedAt: string;
}

export interface Activity {
  id: string;
  sellerId: string;
  employeeId: string;
  type: ActivityType;
  content: string;
  result?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  employee?: {
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
  createdAt: string;
  lastLoginAt?: string;
  initials?: string;
  lastName?: string;
  firstName?: string;
  chatWebhookUrl?: string;
  phoneNumber?: string;
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

// 新しい型定義
export interface InquiryInfo {
  inquiryYear: number;
  // inquiry_date は削除（DBに存在しない）
  inquiryDetailedDateTime?: Date | string;
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
  visitAcquisitionDate?: Date | string;
  visitDate?: Date | string;
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
  contractYearMonth?: Date | string;
  exclusiveOtherDecisionMeeting?: string;
}

export interface ExclusionInfo {
  exclusionSite?: string;
  exclusionCriteria?: string;
  exclusionDate?: Date | string;
  exclusionAction?: string;
}

// 画像添付機能用の型定義
export enum ImageCategory {
  EXTERIOR = 'exterior', // 建物外観
  INTERIOR = 'interior', // メイン室内
  OTHER = 'other', // その他
}

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  category?: ImageCategory;
}

export interface SelectedImages {
  exterior: DriveImage | null; // 建物外観画像
  interior: DriveImage | null; // メイン室内画像
  other: string[]; // その他の画像のファイルID配列
}

export interface CategorizedImages {
  exterior: DriveImage[];
  interior: DriveImage[];
  other: DriveImage[];
}

export interface EmailImageAttachment {
  sellerId: string;
  sellerNumber: string;
  to: string;
  subject: string;
  body: string;
  selectedImages?: SelectedImages;
}

export interface ImageAttachmentError {
  code: 'FOLDER_NOT_FOUND' | 'NO_IMAGES' | 'INSUFFICIENT_IMAGES' | 'SIZE_EXCEEDED' | 'API_ERROR';
  message: string;
  retryable: boolean;
}

// クリップボード画像貼り付け機能用の型定義
export interface PastedImage {
  id: string;                    // Unique identifier
  name: string;                  // Generated name (e.g., "pasted-image-1.png")
  dataUrl: string;               // Base64 data URL
  size: number;                  // File size in bytes
  mimeType: string;              // e.g., "image/png"
  width: number;                 // Image width in pixels
  height: number;                // Image height in pixels
  timestamp: number;             // When pasted (Date.now())
}

// 画像サイズ制限の定数
export const MAX_SINGLE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TOTAL_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Inquiry History types
export interface InquiryHistory {
  id: string;
  sellerId: string;
  inquiryDate: Date | string;
  inquirySite?: string;
  inquiryReason?: string;
  isCurrentStatus: boolean;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateInquiryHistoryRequest {
  sellerId: string;
  inquiryDate: Date | string;
  inquirySite?: string;
  inquiryReason?: string;
  isCurrentStatus?: boolean;
  notes?: string;
}

export interface UpdateInquiryHistoryRequest {
  inquiryDate?: Date | string;
  inquirySite?: string;
  inquiryReason?: string;
  isCurrentStatus?: boolean;
  notes?: string;
}

// Buyer types
export interface Buyer {
  // 基本情報
  buyer_id: string;
  buyer_number?: string;
  name: string;
  nickname?: string;
  phone_number?: string;
  email?: string;
  line_id?: string;
  current_residence?: string;
  company_name?: string;
  
  // 日付情報
  created_datetime?: string | Date;
  reception_date?: string | Date;
  latest_viewing_date?: string | Date;
  next_call_date?: string | Date;
  campaign_date?: string | Date;
  
  // 物件・住所フィールド
  building_name_price?: string;
  property_address?: string;
  property_number?: string;
  property_assignee?: string;
  display_address?: string;
  location?: string;
  athome_url?: string;
  google_map_url?: string;
  pdf_url?: string;
  image_url?: string;
  
  // 担当者・連絡フィールド
  initial_assignee?: string;
  follow_up_assignee?: string;
  assignee_work_days?: string;
  email_confirmation_assignee?: string;
  viewing_promotion_sender?: string;
  notification_sender?: string;
  
  // ステータス・タイプフィールド
  distribution_type?: string;
  inquiry_source?: string;
  inquiry_confidence?: string;
  offer_status?: string;
  email_type?: string;
  viewing_type?: string;
  viewing_type_general?: string;
  property_type?: string;
  current_status?: string;
  structure?: string;
  
  // 希望条件フィールド
  desired_area?: string;
  desired_property_type?: string;
  desired_building_age?: string;
  desired_floor_plan?: string;
  desired_timing?: string;
  
  // 要望フィールド
  hot_spring_required?: string;
  parking_spaces?: string;
  monthly_parking_ok?: string;
  garden_required?: string;
  good_view_required?: string;
  pet_allowed_required?: string;
  high_floor_required?: string;
  corner_room_required?: string;
  
  // 参照・リンクフィールド
  pinrich?: string;
  pinrich_link?: string;
  viewing_sheet?: string;
  offer_property_sheet?: string;
  past_viewing_1?: string;
  past_viewing_2?: string;
  past_viewing_3?: string;
  past_buyer_list?: string;
  past_latest_confidence?: string;
  
  // 連絡・コミュニケーションフィールド
  re_inquiry_viewing?: string;
  post_viewing_seller_contact?: string;
  seller_viewing_contact?: string;
  buyer_viewing_contact?: string;
  post_offer_lost_contact?: string;
  seller_viewing_date_contact?: string;
  seller_cancel_contact?: string;
  
  // チャット・通知フィールド
  chat_to_yamamoto?: string;
  chat_to_ura?: string;
  chat_to_kunihiro?: string;
  offer_lost_chat?: string;
  image_chat_sent?: string;
  email_to_takeuchi?: string;
  email_to_kadoi?: string;
  hirose_to_office?: string;
  
  // メール・問合せフィールド
  inquiry_email_phone?: string;
  inquiry_email_reply?: string;
  broker_inquiry?: string;
  inflow_source_phone?: string;
  
  // 内覧・オファーフィールド
  viewing_calendar_note?: string;
  viewing_unconfirmed?: string;
  offer_exists_viewing_ng?: string;
  offer_exists_viewing_ok?: string;
  viewing_comment_confirmed?: string;
  viewing_promotion_result?: string;
  viewing_promotion_not_needed?: string;
  
  // 物件詳細フィールド
  parking?: string;
  viewing_parking?: string;
  parking_valuation?: string;
  land_area?: string;
  building_area?: string;
  floor_plan?: string;
  build_year?: string;
  floor_count?: string;
  owner_name?: string;
  loan_balance?: string;
  
  // 価格・予算フィールド
  budget?: string;
  price?: string;
  price_range_house?: string;
  price_range_apartment?: string;
  price_range_land?: string;
  
  // 調査・確認フィールド
  viewing_survey_confirmed?: string;
  valuation_survey?: string;
  valuation_survey_confirmed?: string;
  email_confirmed?: string;
  email_effect_verification?: string;
  
  // 長文フィールド
  inquiry_hearing?: string;
  past_inquiry_comment_property?: string;
  past_viewing_properties?: string;
  past_personal_info?: string;
  past_desired_conditions?: string;
  no_response_after_inquiry?: string;
  viewing_result_follow_up?: string; // 内覧結果・後続対応
  latest_status?: string; // 最新状況
  special_notes?: string;
  viewing_survey_response?: string;
  message_to_assignee?: string;
  confirmation_to_assignee?: string;
  offer_comment?: string;
  offer_lost_comment?: string;
  pre_viewing_notes?: string; // 内覧前伝達事項
  key_info?: string;
  sale_reason?: string;
  price_reduction_history?: string;
  viewing_notes?: string; // 内覧時伝達事項
  viewing_inquiry_progress?: string;
  no_response_offer_exists?: string;
  no_property_inquiry_pinrich?: string;
  email_confirmation_mail?: string;
  minpaku_inquiry?: string;
  document_request_email_house?: string;
  document_request_email_land_no_permission?: string;
  document_request_email_land_permission?: string;
  viewing_reason?: string;
  family_composition?: string;
  must_have_points?: string;
  liked_points?: string;
  disliked_points?: string;
  purchase_obstacles?: string;
  closing?: string;
  preferred_contact_time?: string;
  next_action?: string;
  pre_approval?: string;
  viewing_survey_result?: string;
  b_customer_follow_up?: string;
  renovation_history?: string;
  other_property_hearing?: string;
  owned_home_hearing_inquiry?: string;
  owned_home_hearing_result?: string;
  valuation_not_needed_reason?: string;
  pre_viewing_hearing?: string;
  
  // その他フィールド
  panorama_deleted?: string;
  column_a?: string;
  public_private?: string;
  day_of_week?: string;
  sale_chance?: string;
  campaign_applicable?: string;
  data_updated?: string;
  viewing_time?: string;
  first_view?: string;
  other_company_property?: string;
  other_company_name?: string;
  other_valuation_done?: string;
  visit_desk?: string;
  seller_list_copy?: string;
  seller_copy?: string;
  buyer_copy?: string;
  three_calls_confirmed?: string;
  property_search_reference?: string;
  first_come_first_served?: string;
  market_reference?: string;
  smooth_process?: string;
  pre_release_decision_text?: string;
  owned_home_hearing?: string;
  pre_viewing_hearing_send?: string;
  valuation_required?: string;
  phone_duplicate_count?: string;
  
  // 配信エリア
  distribution_areas?: number[];
  
  // ソフトデリート
  is_deleted?: boolean;
  deleted_at?: string | Date;
  
  // システムフィールド
  created_at?: string | Date;
  updated_at?: string | Date;
  last_synced_at?: string | Date;
  
  // 動的フィールド用
  [key: string]: any;
}
