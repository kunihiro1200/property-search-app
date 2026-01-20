import { useState, useEffect } from 'react';

/**
 * 物件画像を非同期で取得するカスタムフック
 * 初回表示を高速化するため、画像は後から読み込む
 */
export function usePropertyImages(propertyId: string, initialImages?: string[]) {
  const [images, setImages] = useState<string[]>(initialImages || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 既に画像がある場合はスキップ
    if (initialImages && initialImages.length > 0) {
      return;
    }

    // 画像を非同期で取得
    const fetchImages = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(
          `${apiUrl}/api/public/properties/${propertyId}/images`
        );

        if (!response.ok) {
          throw new Error('画像の取得に失敗しました');
        }

        const data = await response.json();
        setImages(data.images || []);
      } catch (err: any) {
        setError(err.message);
        console.error('画像取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [propertyId, initialImages]);

  return { images, loading, error };
}
