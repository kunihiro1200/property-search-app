import React, { useState, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  priority?: boolean; // 優先読み込み（lazy loadingを無効化）
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImageコンポーネント
 * 
 * 画像の遅延読み込み（lazy loading）、プレースホルダー表示、エラーハンドリングを提供します。
 * 
 * @param src - 画像のURL
 * @param alt - 画像の代替テキスト（SEO/アクセシビリティ）
 * @param width - 画像の幅
 * @param height - 画像の高さ
 * @param className - CSSクラス名
 * @param style - インラインスタイル
 * @param objectFit - 画像のフィット方法（デフォルト: 'cover'）
 * @param priority - 優先読み込み（デフォルト: false）
 * @param onLoad - 画像読み込み完了時のコールバック
 * @param onError - 画像読み込みエラー時のコールバック
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  objectFit = 'cover',
  priority = false,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // priorityがtrueの場合は即座に読み込み

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 画面に入る50px前から読み込み開始
      }
    );

    const element = document.getElementById(`img-${src}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  return (
    <Box
      id={`img-${src}`}
      sx={{
        position: 'relative',
        width: width || '100%',
        height: height || '100%',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      {/* Loading Placeholder */}
      {!isLoaded && !hasError && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bgcolor: 'grey.200',
          }}
        />
      )}

      {/* Error Placeholder */}
      {hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            color: 'grey.500',
          }}
        >
          <BrokenImageIcon sx={{ fontSize: 48, mb: 1 }} />
          <Box sx={{ fontSize: 12 }}>画像を読み込めません</Box>
        </Box>
      )}

      {/* Actual Image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      )}
    </Box>
  );
};

/**
 * 背景画像として最適化された画像を表示するコンポーネント
 */
export const OptimizedBackgroundImage: React.FC<
  OptimizedImageProps & { children?: React.ReactNode }
> = ({ children, ...props }) => {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <OptimizedImage {...props} />
      {children && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
};
