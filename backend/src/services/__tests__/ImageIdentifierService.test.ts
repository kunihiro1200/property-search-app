import { ImageIdentifierService, ImageCategory } from '../ImageIdentifierService';
import { DriveFile } from '../GoogleDriveService';

describe('ImageIdentifierService', () => {
  let service: ImageIdentifierService;

  beforeEach(() => {
    service = new ImageIdentifierService();
  });

  describe('identifyImageCategory', () => {
    describe('高優先度パターン - 外観', () => {
      it('「外観」を含むファイル名を外観として識別する', () => {
        const result = service.identifyImageCategory('建物外観.jpg');
        expect(result).toEqual({
          category: ImageCategory.EXTERIOR,
          confidence: 1.0
        });
      });

      it('「exterior」を含むファイル名を外観として識別する', () => {
        const result = service.identifyImageCategory('house_exterior.jpg');
        expect(result).toEqual({
          category: ImageCategory.EXTERIOR,
          confidence: 1.0
        });
      });

      it('大文字小文字を区別しない', () => {
        const result = service.identifyImageCategory('EXTERIOR_VIEW.JPG');
        expect(result).toEqual({
          category: ImageCategory.EXTERIOR,
          confidence: 1.0
        });
      });
    });

    describe('高優先度パターン - 室内', () => {
      it('「リビング」を含むファイル名を室内として識別する', () => {
        const result = service.identifyImageCategory('リビング.jpg');
        expect(result).toEqual({
          category: ImageCategory.INTERIOR,
          confidence: 1.0
        });
      });

      it('「LDK」を含むファイル名を室内として識別する', () => {
        const result = service.identifyImageCategory('LDK写真.jpg');
        expect(result).toEqual({
          category: ImageCategory.INTERIOR,
          confidence: 1.0
        });
      });

      it('「living」を含むファイル名を室内として識別する', () => {
        const result = service.identifyImageCategory('living_room.jpg');
        expect(result).toEqual({
          category: ImageCategory.INTERIOR,
          confidence: 1.0
        });
      });
    });

    describe('中優先度パターン - 外観', () => {
      it('「外」を含むファイル名を外観として識別する', () => {
        const result = service.identifyImageCategory('建物外.jpg');
        expect(result).toEqual({
          category: ImageCategory.EXTERIOR,
          confidence: 0.7
        });
      });

      it('「outside」を含むファイル名を外観として識別する', () => {
        const result = service.identifyImageCategory('outside_view.jpg');
        expect(result).toEqual({
          category: ImageCategory.EXTERIOR,
          confidence: 0.7
        });
      });

      it('「facade」を含むファイル名を外観として識別する', () => {
        const result = service.identifyImageCategory('building_facade.jpg');
        expect(result).toEqual({
          category: ImageCategory.EXTERIOR,
          confidence: 0.7
        });
      });
    });

    describe('中優先度パターン - 室内', () => {
      it('「キッチン」を含むファイル名を室内として識別する', () => {
        const result = service.identifyImageCategory('キッチン.jpg');
        expect(result).toEqual({
          category: ImageCategory.INTERIOR,
          confidence: 0.7
        });
      });

      it('「kitchen」を含むファイル名を室内として識別する', () => {
        const result = service.identifyImageCategory('kitchen_area.jpg');
        expect(result).toEqual({
          category: ImageCategory.INTERIOR,
          confidence: 0.7
        });
      });
    });

    describe('低優先度パターン - 室内', () => {
      it('「main」を含むファイル名を室内として識別する', () => {
        const result = service.identifyImageCategory('main_room.jpg');
        expect(result).toEqual({
          category: ImageCategory.INTERIOR,
          confidence: 0.5
        });
      });

      it('「メイン」を含むファイル名を室内として識別する', () => {
        const result = service.identifyImageCategory('メイン部屋.jpg');
        expect(result).toEqual({
          category: ImageCategory.INTERIOR,
          confidence: 0.5
        });
      });
    });

    describe('パターンに一致しない場合', () => {
      it('nullを返す', () => {
        const result = service.identifyImageCategory('random_photo.jpg');
        expect(result).toBeNull();
      });
    });

    describe('優先度の順序', () => {
      it('高優先度パターンが優先される', () => {
        // 「外観」（高）と「外」（中）の両方を含む場合
        const result = service.identifyImageCategory('建物外観_外.jpg');
        expect(result).toEqual({
          category: ImageCategory.EXTERIOR,
          confidence: 1.0
        });
      });
    });
  });

  describe('categorizeImages', () => {
    const mockImages: DriveFile[] = [
      {
        id: '1',
        name: '外観.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-01T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/1/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=1'
      },
      {
        id: '2',
        name: 'リビング.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-01T11:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/2/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=2'
      },
      {
        id: '3',
        name: 'キッチン.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/3/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=3'
      },
      {
        id: '4',
        name: 'その他.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-01T13:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/4/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=4'
      }
    ];

    it('画像を正しく分類する', () => {
      const result = service.categorizeImages(mockImages);
      
      expect(result.exterior).toHaveLength(1);
      expect(result.exterior[0].name).toBe('外観.jpg');
      
      expect(result.interior).toHaveLength(2);
      expect(result.interior.map(img => img.name)).toContain('リビング.jpg');
      expect(result.interior.map(img => img.name)).toContain('キッチン.jpg');
      
      expect(result.uncategorized).toHaveLength(1);
      expect(result.uncategorized[0].name).toBe('その他.jpg');
    });

    it('空の配列を処理できる', () => {
      const result = service.categorizeImages([]);
      
      expect(result.exterior).toHaveLength(0);
      expect(result.interior).toHaveLength(0);
      expect(result.uncategorized).toHaveLength(0);
    });
  });

  describe('selectBestImage', () => {
    const mockImages: DriveFile[] = [
      {
        id: '1',
        name: '外観_古い.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-01T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/1/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=1'
      },
      {
        id: '2',
        name: '外観_新しい.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-02T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/2/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=2'
      },
      {
        id: '3',
        name: 'リビング.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-03T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/3/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=3'
      }
    ];

    it('最新の外観画像を選択する', () => {
      const result = service.selectBestImage(mockImages, ImageCategory.EXTERIOR);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('外観_新しい.jpg');
      expect(result?.id).toBe('2');
    });

    it('最新の室内画像を選択する', () => {
      const result = service.selectBestImage(mockImages, ImageCategory.INTERIOR);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('リビング.jpg');
      expect(result?.id).toBe('3');
    });

    it('該当する画像がない場合はnullを返す', () => {
      const emptyImages: DriveFile[] = [];
      const result = service.selectBestImage(emptyImages, ImageCategory.EXTERIOR);
      
      expect(result).toBeNull();
    });

    it('指定されたカテゴリの画像がない場合はnullを返す', () => {
      const interiorOnlyImages: DriveFile[] = [
        {
          id: '1',
          name: 'リビング.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          modifiedTime: '2025-01-01T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/1/view',
          webContentLink: 'https://drive.google.com/uc?export=download&id=1'
        }
      ];
      
      const result = service.selectBestImage(interiorOnlyImages, ImageCategory.EXTERIOR);
      expect(result).toBeNull();
    });
  });

  describe('isImageFile', () => {
    it('JPEGファイルを画像として認識する', () => {
      expect(service.isImageFile('image/jpeg')).toBe(true);
      expect(service.isImageFile('image/jpg')).toBe(true);
    });

    it('PNGファイルを画像として認識する', () => {
      expect(service.isImageFile('image/png')).toBe(true);
    });

    it('GIFファイルを画像として認識する', () => {
      expect(service.isImageFile('image/gif')).toBe(true);
    });

    it('大文字小文字を区別しない', () => {
      expect(service.isImageFile('IMAGE/JPEG')).toBe(true);
    });

    it('画像以外のファイルを認識しない', () => {
      expect(service.isImageFile('application/pdf')).toBe(false);
      expect(service.isImageFile('text/plain')).toBe(false);
      expect(service.isImageFile('video/mp4')).toBe(false);
    });
  });

  describe('filterImageFiles', () => {
    const mockFiles: DriveFile[] = [
      {
        id: '1',
        name: '画像1.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-01T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/1/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=1'
      },
      {
        id: '2',
        name: 'ドキュメント.pdf',
        mimeType: 'application/pdf',
        size: 1000000,
        modifiedTime: '2025-01-01T11:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/2/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=2'
      },
      {
        id: '3',
        name: '画像2.png',
        mimeType: 'image/png',
        size: 1000000,
        modifiedTime: '2025-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/3/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=3'
      }
    ];

    it('画像ファイルのみをフィルタリングする', () => {
      const result = service.filterImageFiles(mockFiles);
      
      expect(result).toHaveLength(2);
      expect(result.map(f => f.name)).toContain('画像1.jpg');
      expect(result.map(f => f.name)).toContain('画像2.png');
      expect(result.map(f => f.name)).not.toContain('ドキュメント.pdf');
    });

    it('空の配列を処理できる', () => {
      const result = service.filterImageFiles([]);
      expect(result).toHaveLength(0);
    });

    it('画像ファイルがない場合は空の配列を返す', () => {
      const nonImageFiles: DriveFile[] = [
        {
          id: '1',
          name: 'ドキュメント.pdf',
          mimeType: 'application/pdf',
          size: 1000000,
          modifiedTime: '2025-01-01T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/1/view',
          webContentLink: 'https://drive.google.com/uc?export=download&id=1'
        }
      ];
      
      const result = service.filterImageFiles(nonImageFiles);
      expect(result).toHaveLength(0);
    });
  });
});
