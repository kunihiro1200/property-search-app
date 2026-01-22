import { ImageProcessorService, SelectedImages } from '../ImageProcessorService';
import { DriveFile } from '../GoogleDriveService';

describe('ImageProcessorService', () => {
  let service: ImageProcessorService;

  beforeEach(() => {
    service = new ImageProcessorService();
  });

  describe('detectImageAttachmentKeyword', () => {
    it('「画像添付」キーワードを検出する', () => {
      const emailBody = 'お世話になっております。\n\n画像添付\n\nよろしくお願いします。';
      expect(service.detectImageAttachmentKeyword(emailBody)).toBe(true);
    });

    it('キーワードがない場合はfalseを返す', () => {
      const emailBody = 'お世話になっております。\n\nよろしくお願いします。';
      expect(service.detectImageAttachmentKeyword(emailBody)).toBe(false);
    });

    it('キーワードが複数ある場合も検出する', () => {
      const emailBody = '画像添付\n\n画像添付';
      expect(service.detectImageAttachmentKeyword(emailBody)).toBe(true);
    });
  });

  describe('encodeImageToBase64', () => {
    it('バッファをBase64エンコードする', () => {
      const buffer = Buffer.from('test data');
      const result = service.encodeImageToBase64(buffer);
      
      expect(result).toBe(buffer.toString('base64'));
      expect(typeof result).toBe('string');
    });

    it('空のバッファをエンコードできる', () => {
      const buffer = Buffer.from('');
      const result = service.encodeImageToBase64(buffer);
      
      expect(result).toBe('');
    });
  });

  describe('removeImageAttachmentKeyword', () => {
    it('「画像添付」キーワードを削除する', () => {
      const emailBody = 'お世話になっております。\n\n画像添付\n\nよろしくお願いします。';
      const result = service.removeImageAttachmentKeyword(emailBody);
      
      expect(result).toBe('お世話になっております。\n\n\n\nよろしくお願いします。');
      expect(result).not.toContain('画像添付');
    });

    it('複数のキーワードを全て削除する', () => {
      const emailBody = '画像添付\n\nテスト\n\n画像添付';
      const result = service.removeImageAttachmentKeyword(emailBody);
      
      expect(result).toBe('\n\nテスト\n\n');
      expect(result).not.toContain('画像添付');
    });

    it('キーワードがない場合は元の文字列を返す', () => {
      const emailBody = 'お世話になっております。';
      const result = service.removeImageAttachmentKeyword(emailBody);
      
      expect(result).toBe(emailBody);
    });
  });

  describe('autoSelectImages', () => {
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
        name: 'ドキュメント.pdf',
        mimeType: 'application/pdf',
        size: 1000000,
        modifiedTime: '2025-01-01T12:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/3/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=3'
      }
    ];

    it('外観と室内の画像を自動選択する', () => {
      const result = service.autoSelectImages(mockImages);
      
      expect(result.exterior).not.toBeNull();
      expect(result.exterior?.name).toBe('外観.jpg');
      expect(result.interior).not.toBeNull();
      expect(result.interior?.name).toBe('リビング.jpg');
      expect(result.selectionMethod).toBe('auto');
    });

    it('画像ファイルのみを対象とする', () => {
      const result = service.autoSelectImages(mockImages);
      
      // PDFファイルは選択されない
      expect(result.exterior?.mimeType).toContain('image');
      expect(result.interior?.mimeType).toContain('image');
    });

    it('パターンに一致しない場合は最初の2つの画像を使用する', () => {
      const randomImages: DriveFile[] = [
        {
          id: '1',
          name: 'photo1.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          modifiedTime: '2025-01-02T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/1/view',
          webContentLink: 'https://drive.google.com/uc?export=download&id=1'
        },
        {
          id: '2',
          name: 'photo2.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          modifiedTime: '2025-01-01T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/2/view',
          webContentLink: 'https://drive.google.com/uc?export=download&id=2'
        }
      ];

      const result = service.autoSelectImages(randomImages);
      
      expect(result.exterior).not.toBeNull();
      expect(result.interior).not.toBeNull();
      // 最新のものが選択される
      expect(result.exterior?.name).toBe('photo1.jpg');
      expect(result.interior?.name).toBe('photo2.jpg');
    });

    it('画像が1枚しかない場合は外観として使用する', () => {
      const singleImage: DriveFile[] = [
        {
          id: '1',
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          modifiedTime: '2025-01-01T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/1/view',
          webContentLink: 'https://drive.google.com/uc?export=download&id=1'
        }
      ];

      const result = service.autoSelectImages(singleImage);
      
      expect(result.exterior).not.toBeNull();
      expect(result.exterior?.name).toBe('photo.jpg');
      expect(result.interior).toBeNull();
    });

    it('画像がない場合は両方nullを返す', () => {
      const result = service.autoSelectImages([]);
      
      expect(result.exterior).toBeNull();
      expect(result.interior).toBeNull();
      expect(result.selectionMethod).toBe('auto');
    });
  });

  describe('processImageAttachment', () => {
    const mockImages: DriveFile[] = [
      {
        id: '1',
        name: '外観.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        modifiedTime: '2025-01-01T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/1/view',
        webContentLink: 'https://drive.google.com/uc?export=download&id=1'
      }
    ];

    it('キーワードがない場合は元のメール本文を返す', async () => {
      const emailBody = 'お世話になっております。';
      const result = await service.processImageAttachment(emailBody, mockImages);
      
      expect(result.body).toBe(emailBody);
      expect(result.hasImages).toBe(false);
      expect(result.images).toBeNull();
      expect(result.originalBody).toBe(emailBody);
    });

    it('画像がない場合はキーワードを削除して返す', async () => {
      const emailBody = 'お世話になっております。\n\n画像添付\n\nよろしくお願いします。';
      const result = await service.processImageAttachment(emailBody, []);
      
      expect(result.body).not.toContain('画像添付');
      expect(result.hasImages).toBe(false);
      expect(result.images).toBeNull();
    });

    it('元のメール本文を保持する', async () => {
      const emailBody = 'お世話になっております。\n\n画像添付\n\nよろしくお願いします。';
      const result = await service.processImageAttachment(emailBody, []);
      
      expect(result.originalBody).toBe(emailBody);
    });
  });

  describe('embedImagesInEmail', () => {
    it('キーワードの位置に画像を挿入する', async () => {
      const emailBody = '前の文章\n\n画像添付\n\n後の文章';
      const mockImages: SelectedImages = {
        exterior: null,
        interior: null,
        selectionMethod: 'auto'
      };

      const result = await service.embedImagesInEmail(emailBody, mockImages);
      
      expect(result).toContain('前の文章');
      expect(result).toContain('後の文章');
      expect(result).not.toContain('画像添付');
    });

    it('キーワードがない場合は末尾に追加する', async () => {
      const emailBody = 'メール本文';
      const mockImages: SelectedImages = {
        exterior: null,
        interior: null,
        selectionMethod: 'auto'
      };

      const result = await service.embedImagesInEmail(emailBody, mockImages);
      
      expect(result).toContain('メール本文');
    });
  });
});
