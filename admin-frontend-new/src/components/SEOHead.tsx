import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article';
  keywords?: string[];
}

/**
 * SEOHeadコンポーネント
 * 
 * ページのメタタグ、Open Graphタグ、Twitter Cardタグを設定します。
 * 
 * @param title - ページタイトル（サイト名は自動的に追加されます）
 * @param description - ページの説明文
 * @param ogImage - OGP画像のURL（オプション）
 * @param canonicalUrl - 正規URL（オプション、現在のURLが使用されます）
 * @param type - ページタイプ（デフォルト: 'website'）
 * @param keywords - キーワード配列（オプション）
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  ogImage,
  canonicalUrl,
  type = 'website',
  keywords = [],
}) => {
  const siteName = '不動産物件サイト';
  const fullTitle = `${title} | ${siteName}`;
  const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');
  
  // デフォルトのOG画像（サイトのロゴやデフォルト画像）
  const defaultOgImage = '/og-image-default.jpg';
  const ogImageUrl = ogImage || defaultOgImage;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="ja_JP" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="Japanese" />
    </Helmet>
  );
};

/**
 * デフォルトのSEO設定
 */
export const DefaultSEOHead: React.FC = () => {
  return (
    <SEOHead
      title="物件一覧"
      description="大分県の不動産物件を検索できます。戸建て、マンション、土地など、様々な物件情報を掲載しています。"
      keywords={['不動産', '物件', '大分', '戸建て', 'マンション', '土地', '売買']}
    />
  );
};
