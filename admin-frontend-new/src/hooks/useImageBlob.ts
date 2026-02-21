import { useQuery } from '@tanstack/react-query';
import publicApi from '../services/publicApi';

/**
 * 画像をBlobとして取得してObject URLを作成するカスタムフック
 * CORSの問題を回避するため、fetchでBlobを取得してからObject URLを生成
 */
export const useImageBlob = (imageUrl: string | undefined, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['imageBlob', imageUrl],
    queryFn: async () => {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      // fetchでBlobとして取得
      const response = await fetch(imageUrl, {
        method: 'GET',
        credentials: 'omit', // 認証情報を送信しない
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      return objectUrl;
    },
    enabled: enabled && !!imageUrl,
    staleTime: 60 * 60 * 1000, // 1時間キャッシュ
    gcTime: 2 * 60 * 60 * 1000, // 2時間キャッシュを保持
  });
};

/**
 * 複数の画像をBlobとして取得するカスタムフック
 */
export const useImageBlobs = (imageUrls: string[], enabled: boolean = true) => {
  return useQuery({
    queryKey: ['imageBlobs', imageUrls],
    queryFn: async () => {
      if (!imageUrls || imageUrls.length === 0) {
        return [];
      }

      // 全ての画像を並列で取得
      const blobPromises = imageUrls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
          });

          if (!response.ok) {
            console.error(`Failed to fetch image: ${url}`);
            return null;
          }

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          return {
            originalUrl: url,
            objectUrl,
          };
        } catch (error) {
          console.error(`Error fetching image: ${url}`, error);
          return null;
        }
      });

      const results = await Promise.all(blobPromises);
      return results.filter((result): result is { originalUrl: string; objectUrl: string } => result !== null);
    },
    enabled: enabled && imageUrls.length > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
};
