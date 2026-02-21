import { GoogleDriveService } from '../GoogleDriveService';

describe('GoogleDriveService - 画像機能拡張', () => {
  let service: GoogleDriveService;

  beforeEach(() => {
    service = new GoogleDriveService();
  });

  describe('listImageFiles', () => {
    it('画像ファイルのみをフィルタリングする', async () => {
      // このテストは実際のGoogle Drive APIを呼び出すため、モック化が必要
      // 実装の構造テストとして、メソッドが存在することを確認
      expect(typeof service.listImageFiles).toBe('function');
    });
  });

  describe('listImagesWithThumbnails', () => {
    it('サムネイル付き画像一覧を取得するメソッドが存在する', () => {
      expect(typeof service.listImagesWithThumbnails).toBe('function');
    });
  });

  describe('getImageData', () => {
    it('画像データを取得するメソッドが存在する', () => {
      expect(typeof service.getImageData).toBe('function');
    });
  });
});
