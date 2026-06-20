import { RecommendedCommentService } from '../RecommendedCommentService';
import { GoogleSheetsClient } from '../GoogleSheetsClient';

// GoogleSheetsClientをモック
jest.mock('../GoogleSheetsClient');

describe('RecommendedCommentService', () => {
  let service: RecommendedCommentService;
  let mockGoogleSheetsClient: jest.Mocked<GoogleSheetsClient>;

  beforeEach(() => {
    // 環境変数を設定
    process.env.GYOMU_LIST_SPREADSHEET_ID = 'test-spreadsheet-id';
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = 'test-key-path';

    // モックをリセット
    jest.clearAllMocks();

    // サービスインスタンスを作成
    service = new RecommendedCommentService();
    
    // モックインスタンスを取得
    mockGoogleSheetsClient = (service as any).googleSheetsClient;
  });

  afterEach(() => {
    delete process.env.GYOMU_LIST_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  });

  describe('getRecommendedComment', () => {
    it('土地の場合、B53セルからコメントを取得する', async () => {
      const propertyNumber = 'AA12345';
      const propertyType = '土地';
      const expectedComment = 'この土地は日当たりが良く、閑静な住宅街にあります。';

      // モックの設定
      mockGoogleSheetsClient.authenticate = jest.fn().mockResolvedValue(undefined);
      mockGoogleSheetsClient.getSpreadsheetMetadata = jest.fn().mockResolvedValue({
        sheets: [
          { properties: { title: propertyNumber } }
        ]
      });

      // Google Sheets APIのモック
      const mockSheets = {
        spreadsheets: {
          values: {
            get: jest.fn().mockResolvedValue({
              data: {
                values: [[expectedComment]]
              }
            })
          }
        }
      };
      (mockGoogleSheetsClient as any).sheets = mockSheets;

      const result = await service.getRecommendedComment(propertyNumber, propertyType);

      expect(result.comment).toBe(expectedComment);
      expect(result.propertyType).toBe(propertyType);
      expect(mockGoogleSheetsClient.authenticate).toHaveBeenCalled();
    });

    it('戸建ての場合、B142セルからコメントを取得する', async () => {
      const propertyNumber = 'AA12346';
      const propertyType = '戸建て';
      const expectedComment = '広々とした庭付きの一戸建てです。';

      mockGoogleSheetsClient.authenticate = jest.fn().mockResolvedValue(undefined);
      mockGoogleSheetsClient.getSpreadsheetMetadata = jest.fn().mockResolvedValue({
        sheets: [
          { properties: { title: propertyNumber } }
        ]
      });

      const mockSheets = {
        spreadsheets: {
          values: {
            get: jest.fn().mockResolvedValue({
              data: {
                values: [[expectedComment]]
              }
            })
          }
        }
      };
      (mockGoogleSheetsClient as any).sheets = mockSheets;

      const result = await service.getRecommendedComment(propertyNumber, propertyType);

      expect(result.comment).toBe(expectedComment);
      expect(result.propertyType).toBe(propertyType);
    });

    it('マンションの場合、B150セルからコメントを取得する', async () => {
      const propertyNumber = 'AA12347';
      const propertyType = 'マンション';
      const expectedComment = '駅近で利便性抜群のマンションです。';

      mockGoogleSheetsClient.authenticate = jest.fn().mockResolvedValue(undefined);
      mockGoogleSheetsClient.getSpreadsheetMetadata = jest.fn().mockResolvedValue({
        sheets: [
          { properties: { title: propertyNumber } }
        ]
      });

      const mockSheets = {
        spreadsheets: {
          values: {
            get: jest.fn().mockResolvedValue({
              data: {
                values: [[expectedComment]]
              }
            })
          }
        }
      };
      (mockGoogleSheetsClient as any).sheets = mockSheets;

      const result = await service.getRecommendedComment(propertyNumber, propertyType);

      expect(result.comment).toBe(expectedComment);
      expect(result.propertyType).toBe(propertyType);
    });

    it('コメントが空の場合、nullを返す', async () => {
      const propertyNumber = 'AA12348';
      const propertyType = '土地';

      mockGoogleSheetsClient.authenticate = jest.fn().mockResolvedValue(undefined);
      mockGoogleSheetsClient.getSpreadsheetMetadata = jest.fn().mockResolvedValue({
        sheets: [
          { properties: { title: propertyNumber } }
        ]
      });

      const mockSheets = {
        spreadsheets: {
          values: {
            get: jest.fn().mockResolvedValue({
              data: {
                values: [['']]
              }
            })
          }
        }
      };
      (mockGoogleSheetsClient as any).sheets = mockSheets;

      const result = await service.getRecommendedComment(propertyNumber, propertyType);

      expect(result.comment).toBeNull();
      expect(result.propertyType).toBe(propertyType);
    });

    it('物件タイプが不明な場合、nullを返す', async () => {
      const propertyNumber = 'AA12349';
      const propertyType = '不明なタイプ';

      const result = await service.getRecommendedComment(propertyNumber, propertyType);

      expect(result.comment).toBeNull();
      expect(result.propertyType).toBe(propertyType);
    });

    it('スプレッドシートアクセスエラー時、nullを返す', async () => {
      const propertyNumber = 'AA12350';
      const propertyType = '土地';

      mockGoogleSheetsClient.authenticate = jest.fn().mockRejectedValue(
        new Error('Authentication failed')
      );

      const result = await service.getRecommendedComment(propertyNumber, propertyType);

      expect(result.comment).toBeNull();
      expect(result.propertyType).toBe(propertyType);
    });

    it('物件シートが見つからない場合、nullを返す', async () => {
      const propertyNumber = 'AA12351';
      const propertyType = '土地';

      mockGoogleSheetsClient.authenticate = jest.fn().mockResolvedValue(undefined);
      mockGoogleSheetsClient.getSpreadsheetMetadata = jest.fn().mockResolvedValue({
        sheets: [
          { properties: { title: 'OtherProperty' } }
        ]
      });

      const result = await service.getRecommendedComment(propertyNumber, propertyType);

      expect(result.comment).toBeNull();
      expect(result.propertyType).toBe(propertyType);
    });
  });
});
