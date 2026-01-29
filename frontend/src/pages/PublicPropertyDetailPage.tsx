import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PrintIcon from '@mui/icons-material/Print';
import { usePublicProperty } from '../hooks/usePublicProperties';
import publicApi from '../services/publicApi';
import PublicInquiryForm from '../components/PublicInquiryForm';
import PropertyImageGallery from '../components/PropertyImageGallery';
import PublicPropertyHeader from '../components/PublicPropertyHeader';
import { RefreshButtons } from '../components/RefreshButtons';
import { formatConstructionDate, shouldShowConstructionDate } from '../utils/constructionDateFormatter';
import { getBadgeType } from '../utils/propertyStatusUtils';
import { SEOHead } from '../components/SEOHead';
import { StructuredData } from '../components/StructuredData';
import { generatePropertyStructuredData } from '../utils/structuredData';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { useAuthStore } from '../store/authStore';
import '../styles/print.css';

/**
 * Google Map URLから座標を抽出する関数
 * 対応フォーマット:
 * - https://maps.google.com/maps?q=33.2820604,131.4869034
 * - https://www.google.com/maps/search/33.231233,+131.576897
 * - https://www.google.com/maps/place/33.2820604,131.4869034
 * - https://www.google.com/maps/@33.2820604,131.4869034,15z
 * - https://maps.app.goo.gl/xxxxx (短縮URL - バックエンド経由でリダイレクト先を取得)
 */
async function extractCoordinatesFromGoogleMapUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  
  try {
    // 短縮URL（goo.gl）の場合、バックエンド経由でリダイレクト先を取得
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.log('🔗 Detected shortened URL, fetching redirect via backend...');
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(
          `${apiUrl}/api/url-redirect/resolve?url=${encodeURIComponent(url)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔗 Redirected URL:', data.redirectedUrl);
          url = data.redirectedUrl;
        } else {
          console.warn('⚠️ Failed to fetch redirect URL from backend, trying to extract from original URL');
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch redirect URL from backend:', error);
        // リダイレクト取得に失敗した場合、元のURLから抽出を試みる
      }
    }
    
    // パターン1: ?q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
      };
    }
    
    // パターン2: /search/lat,lng
    const searchMatch = url.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
    if (searchMatch) {
      return {
        lat: parseFloat(searchMatch[1]),
        lng: parseFloat(searchMatch[2]),
      };
    }
    
    // パターン3: /place/lat,lng
    const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2]),
      };
    }
    
    // パターン4: /@lat,lng,zoom
    const atMatch = url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }
    
    console.warn('⚠️ Could not extract coordinates from Google Map URL:', url);
    return null;
  } catch (error) {
    console.error('❌ Error extracting coordinates from Google Map URL:', error);
    return null;
  }
}

const PublicPropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // スマホ判定（600px未満）
  
  // 認証状態を取得（管理者モード判定用）
  const { isAuthenticated } = useAuthStore();
  
  // URLクエリパラメータから管理者モードを判定（location.searchが変わるたびに再計算）
  const isAdminMode = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const canHideParam = searchParams.get('canHide') === 'true';
    return isAuthenticated && canHideParam;
  }, [location.search, isAuthenticated]);
  
  // Google Maps API読み込み
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  console.log('🗺️ [Google Maps] API Key:', GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.substring(0, 10)}...` : 'NOT SET');
  
  const { isLoaded: isMapLoaded, loadError } = useGoogleMaps();
  
  console.log('🗺️ [Google Maps] isLoaded:', isMapLoaded, 'loadError:', loadError);
  
  // 全データの状態管理
  const [completeData, setCompleteData] = useState<any>(null);
  
  // パノラマURLの状態管理
  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);
  
  // 概算書PDF生成の状態管理
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // 地図表示用の座標（Google Map URLまたは住所から取得）
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const { data: property, isLoading, isError, error } = usePublicProperty(id);

  // デバッグログ
  console.log('PublicPropertyDetailPage - id:', id);
  console.log('PublicPropertyDetailPage - property:', property);
  console.log('PublicPropertyDetailPage - property.property_number:', property?.property_number);

  // 成約済み判定
  const isSold = property ? getBadgeType(property.atbb_status) === 'sold' : false;

  // 全データを一度に取得
  useEffect(() => {
    if (!id) return;
    
    const fetchCompleteData = async () => {
      try {
        // publicApiインスタンスを使用（ベースURLが自動的に追加される）
        console.log(`[publicProperty:"${property?.property_number || id}"] Fetching complete data from: /api/public/properties/${id}/complete`);
        const response = await publicApi.get(`/api/public/properties/${id}/complete`);
        console.log(`[publicProperty:"${property?.property_number || id}"] Complete data response:`, response.data);
        console.log(`[publicProperty:"${property?.property_number || id}"] favoriteComment:`, response.data?.favoriteComment);
        console.log(`[publicProperty:"${property?.property_number || id}"] recommendedComments:`, response.data?.recommendedComments);
        console.log(`[publicProperty:"${property?.property_number || id}"] propertyAbout:`, response.data?.propertyAbout);
        console.log(`[publicProperty:"${property?.property_number || id}"] athomeData:`, response.data?.athomeData);
        console.log(`[publicProperty:"${property?.property_number || id}"] panoramaUrl:`, response.data?.panoramaUrl);
        
        setCompleteData(response.data);
        
        // パノラマURLを/completeレスポンスから取得（別途APIを呼ばない）
        if (response.data?.panoramaUrl) {
          setPanoramaUrl(response.data.panoramaUrl);
          console.log('Panorama URL loaded from /complete:', response.data.panoramaUrl);
        }
      } catch (error) {
        console.error(`[publicProperty:"${property?.property_number || id}"] Failed to fetch complete data:`, error);
      }
    };
    
    fetchCompleteData();
  }, [id]); // idのみに依存（property?.property_numberを削除して無限ループを防ぐ）
  
  // 地図表示用の座標を取得（Google Map URLまたはデータベースの座標から）
  useEffect(() => {
    if (!property) return;
    
    const fetchMapCoordinates = async () => {
      console.log('🗺️ [Map Coordinates] Starting coordinate extraction...');
      
      // 1. データベースに座標がある場合はそれを使用（最優先）
      if (property.latitude && property.longitude) {
        console.log('🗺️ [Map Coordinates] Using coordinates from database:', {
          lat: property.latitude,
          lng: property.longitude,
        });
        setMapCoordinates({
          lat: property.latitude,
          lng: property.longitude,
        });
        return;
      }
      
      // 2. Google Map URLから座標を抽出
      if (property.google_map_url) {
        console.log('🗺️ [Map Coordinates] Extracting from Google Map URL:', property.google_map_url);
        const coords = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
        if (coords) {
          console.log('🗺️ [Map Coordinates] Successfully extracted:', coords);
          setMapCoordinates(coords);
          return;
        }
      }
      
      // 3. 住所から座標を取得（Geocoding API - 未実装）
      // TODO: 必要に応じて実装
      console.log('🗺️ [Map Coordinates] No coordinates available for this property');
      setMapCoordinates(null);
    };
    
    fetchMapCoordinates();
  }, [property?.property_number, property?.google_map_url, property?.latitude, property?.longitude]);
  // パノラマURLを取得（削除：/completeから取得するため不要）
  // useEffect(() => {
  //   if (!property?.property_number) return;
  //   
  //   const fetchPanoramaUrl = async () => {
  //     setIsLoadingPanorama(true);
  //     try {
  //       // publicApiインスタンスを使用
  //       const response = await publicApi.get(`/api/public/properties/${property.property_number}/panorama-url`);
  //       if (response.data.success && response.data.panoramaUrl) {
  //         setPanoramaUrl(response.data.panoramaUrl);
  //         console.log('Panorama URL loaded:', response.data.panoramaUrl);
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch panorama URL:', error);
  //     } finally {
  //       setIsLoadingPanorama(false);
  //     }
  //   };
  //   
  //   fetchPanoramaUrl();
  // }, [property?.property_number]);
  
  const handleGenerateEstimatePdf = async (mode: 'preview' | 'download' = 'preview') => {
    console.log('🔘 [Estimate PDF] Button clicked!', { property: property?.property_number, mode });
    
    if (!property) {
      console.error('❌ [Estimate PDF] No property data available');
      return;
    }
    
    setIsGeneratingPdf(true);
    console.log('⏳ [Estimate PDF] Generating PDF...');
    
    try {
      // publicApiインスタンスを使用
      console.log('📡 [Estimate PDF] Sending request to:', `/api/public/properties/${property.property_number}/estimate-pdf`);
      const response = await publicApi.post(`/api/public/properties/${property.property_number}/estimate-pdf`);
      
      console.log('✅ [Estimate PDF] Response received:', response.data);
      
      if (mode === 'preview') {
        // プレビュー：同じタブでPDFを開く（ポップアップブロッカー回避）
        console.log('🌐 [Estimate PDF] Opening PDF in same tab:', response.data.pdfUrl);
        window.location.href = response.data.pdfUrl;
      } else {
        // ダウンロード：ファイルとしてダウンロード
        console.log('💾 [Estimate PDF] Downloading PDF:', response.data.pdfUrl);
        const link = document.createElement('a');
        link.href = response.data.pdfUrl;
        link.download = `概算書_${property.property_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      console.error('❌ [Estimate PDF] Failed to generate estimate PDF:', error);
      console.error('❌ [Estimate PDF] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      alert(error.response?.data?.message || '概算書の生成に失敗しました');
    } finally {
      setIsGeneratingPdf(false);
      console.log('🏁 [Estimate PDF] Process completed');
    }
  };

  const handleBackClick = () => {
    // ブラウザの戻るボタンと同じ動作（location.stateを保持）
    navigate(-1);
  };

  // 印刷ボタンのハンドラー
  const handlePrint = () => {
    window.print();
  };

  // 価格をフォーマット
  const formatPrice = (price: number | undefined) => {
    if (!price) return '価格応談';
    return `${(price / 10000).toLocaleString()}万円`;
  };

  // 物件タイプの表示名
  const getPropertyTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'detached_house': '一戸建て',
      'apartment': 'マンション',
      'land': '土地',
      'other': 'その他',
    };
    return typeMap[type] || type;
  };

  // 新築年月のフォーマット
  const formattedConstructionDate = property ? formatConstructionDate(property.construction_year_month) : null;
  const showConstructionDate = property && shouldShowConstructionDate(property.property_type) && formattedConstructionDate;

  // 日付フォーマット関数
  const formatSettlementDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  // ローディング状態
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // エラー状態（404含む）
  if (isError || !property) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error?.status === 404
            ? 'お探しの物件が見つかりませんでした'
            : error?.message || '物件の読み込みに失敗しました'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
        >
          物件一覧に戻る
        </Button>
      </Container>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      {property && (
        <>
          <SEOHead
            title={`${property.address} - ${property.property_type}`}
            description={`${property.property_type}の物件です。価格: ${property.price}万円。${property.address}に位置しています。`}
            keywords={[
              '不動産',
              '物件',
              property.property_type,
              property.address,
              '大分',
              '売買',
            ]}
            canonicalUrl={typeof window !== 'undefined' ? window.location.href : ''}
            ogImage={property.images?.[0]}
          />
          
          {/* Structured Data */}
          <StructuredData
            data={generatePropertyStructuredData({
              id: property.id,
              propertyNumber: property.property_number,
              address: property.address,
              price: property.price || 0,
              propertyType: property.property_type,
              description: property.description,
              landArea: property.land_area,
              buildingArea: property.building_area,
              buildYear: property.construction_year_month ? parseInt(property.construction_year_month.substring(0, 4)) : undefined,
              rooms: property.floor_plan,
              images: property.images?.map(url => ({ url })),
              latitude: mapCoordinates?.lat || property.latitude,
              longitude: mapCoordinates?.lng || property.longitude,
            })}
          />
        </>
      )}
      
      <PublicPropertyHeader 
        showBackButton={true}
        atbbStatus={property?.atbb_status}
        navigationState={location.state}
        showInquiryButton={!isSold}
      />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="lg">
          {/* 更新ボタン（管理者モードのみ表示） */}
          {isAdminMode && (
            <Box className="no-print" sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <RefreshButtons
                propertyId={property?.property_number || ''}
                onRefreshComplete={(data) => {
                  console.log('[PublicPropertyDetailPage] Refresh complete, updating state');
                  setCompleteData(data);
                }}
                canRefresh={isAdminMode}
              />
            </Box>
          )}
          {/* 印刷ボタン（右上に固定、スマホでは非表示） */}
          <Box
            className="no-print"
            sx={{
              position: 'fixed',
              top: 120,
              right: 16,
              zIndex: 1000,
              display: { xs: 'none', sm: 'block' }, // スマホでは非表示
            }}
          >
            <IconButton
              onClick={handlePrint}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                boxShadow: 3,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <PrintIcon />
            </IconButton>
          </Box>

          <Grid container spacing={4}>
            {/* 左カラム: 物件情報 */}
            <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* お気に入り文言（単独で最初に表示） */}
              {completeData?.favoriteComment && (
                <Box sx={{ mb: 3, order: 1 }} className="favorite-comment-container">
                  <Box className="favorite-comment-bubble" sx={{
                    background: '#FFF9E6',
                    border: '2px solid #FFC107',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: 2,
                  }}>
                    <Box component="span" className="favorite-comment-icon" sx={{ mr: 1.5, fontSize: '24px' }}>⭐</Box>
                    <Box component="span" className="favorite-comment-content" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {completeData.favoriteComment}
                    </Box>
                  </Box>
                </Box>
              )}
              
              {/* 物件画像ギャラリー */}
              <Paper 
                elevation={2} 
                sx={{ 
                  mb: 3, 
                  p: 2,
                  order: 2 // 2番目
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }} className="no-print">
                  物件画像
                </Typography>
                
                {property.property_number && (
                  <PropertyImageGallery
                    propertyId={property.property_number}
                    canDelete={false}
                    canHide={isAdminMode}
                    showHiddenImages={false}
                    isPublicSite={true}
                  />
                )}
              </Paper>

              {/* パノラマビュー（パノラマURLが存在する場合のみ表示） */}
              {panoramaUrl && (
                <Paper 
                  elevation={2} 
                  sx={{ 
                    mb: 3, 
                    p: 2,
                    order: 3 // 3番目
                  }} 
                  className="no-print"
                >
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    360°パノラマビュー
                  </Typography>
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: { xs: '75%', sm: '56.25%' }, // スマホは4:3、デスクトップは16:9
                      overflow: 'hidden',
                      borderRadius: 1,
                    }}
                  >
                    <iframe
                      src={panoramaUrl}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                      allowFullScreen
                      title="360°パノラマビュー"
                    />
                  </Box>
                </Paper>
              )}

              {/* 物件基本情報 */}
              <Paper elevation={2} sx={{ p: 3, mb: 3, order: 4 }}> {/* 4番目 */}
              {/* 物件タイプ */}
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={getPropertyTypeLabel(property.property_type)}
                  color="primary"
                  variant="outlined"
                />
              </Box>

              {/* 価格 */}
              <Typography variant="h4" component="h1" sx={{ mb: 2, fontWeight: 'bold' }}>
                {formatPrice(property.price)}
              </Typography>

              {/* 住所 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  {property.display_address || property.address}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 物件詳細 */}
              <Grid container spacing={2}>
                {showConstructionDate && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      新築年月
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formattedConstructionDate}
                    </Typography>
                  </Grid>
                )}
                {property.land_area && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      土地面積
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {property.land_area}㎡
                    </Typography>
                  </Grid>
                )}
                {property.building_area && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      建物面積
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {property.building_area}㎡
                    </Typography>
                  </Grid>
                )}
                {property.building_age !== undefined && property.building_age !== null && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      築年数
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      築{property.building_age}年
                    </Typography>
                  </Grid>
                )}
                {property.floor_plan && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      間取り
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {property.floor_plan}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* 物件説明 */}
              {property.description && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    物件の説明
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {property.description}
                  </Typography>
                </>
              )}

              {/* 物件の特徴 */}
              {property.features && property.features.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    物件の特徴
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {property.features.map((feature, index) => (
                      <Chip key={index} label={feature} variant="outlined" />
                    ))}
                  </Box>
                </>
              )}

            </Paper>

            {/* 地図セクション（独立したPaper） */}
            {(property.google_map_url || mapCoordinates) && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, order: 5 }}> {/* 5番目 */}
                <Typography variant="h6" sx={{ mb: 2 }}>
                  地図
                </Typography>
                
                {/* Google Mapボタン */}
                {property.google_map_url && (
                  <Button
                    variant="outlined"
                    startIcon={<LocationOnIcon />}
                    href={property.google_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    fullWidth
                    sx={{ mb: mapCoordinates && isMapLoaded ? 2 : 0 }}
                  >
                    Google Mapで見る
                  </Button>
                )}

                {/* 地図表示（座標がある場合） */}
                {mapCoordinates && isMapLoaded && (
                  <>
                    {console.log('🗺️ [Rendering Map] mapCoordinates:', mapCoordinates, 'isMapLoaded:', isMapLoaded)}
                    <Box
                      sx={{
                        width: '100%',
                        height: '400px',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={{
                          lat: mapCoordinates.lat,
                          lng: mapCoordinates.lng,
                        }}
                        zoom={15}
                        options={{
                          zoomControl: true,
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: true,
                          clickableIcons: false,
                        }}
                        onLoad={(map) => {
                          console.log('🗺️ [Map Loaded] Map instance created');
                          
                          // 直接Google Maps APIを使用してマーカーを追加
                          const marker = new google.maps.Marker({
                            position: { lat: mapCoordinates.lat, lng: mapCoordinates.lng },
                            map: map,
                            title: property.address,
                          });
                          
                          console.log('🗺️ [Direct Marker] Marker created:', marker);
                        }}
                      >
                        {/* マーカーは onLoad で直接追加 */}
                      </GoogleMap>
                    </Box>
                  </>
                )}
              </Paper>
            )}

            {/* 成約済み物件の場合: 成約情報を表示 */}
            {isSold && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, order: 6 }}> {/* 6番目 */}
                <Typography variant="h6" sx={{ mb: 2 }}>
                  成約情報
                </Typography>
                
                {/* 物件番号 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    物件番号
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {property.property_number}
                  </Typography>
                </Box>
                
                {/* 成約日（決済日が存在する場合のみ） */}
                {completeData?.settlementDate && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      成約日
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatSettlementDate(completeData.settlementDate)}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            {/* Athome情報セクション - 削除（Google DriveのURLを表示しないため） */}

            {/* おすすめコメントセクション */}
            {completeData?.recommendedComments && completeData.recommendedComments.length > 0 && (
              <Paper
                elevation={2}
                className="recommended-comment-section"
                sx={{
                  p: 3,
                  mb: 3,
                  backgroundColor: '#FFF9E6',
                  borderLeft: '4px solid #FFC107',
                  order: 6, // 6番目
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#F57C00' }}>
                  おすすめポイント
                </Typography>
                <Box sx={{ m: 0 }}>
                  {completeData.recommendedComments.map((comment: any, commentIndex: number) => {
                    // commentが文字列の場合はそのまま表示
                    if (typeof comment === 'string') {
                      return (
                        <Typography key={commentIndex} variant="body1" sx={{ mb: 1, lineHeight: 1.8, color: 'text.primary' }}>
                          {comment}
                        </Typography>
                      );
                    }
                    // commentが配列の場合は結合して表示
                    if (Array.isArray(comment)) {
                      return (
                        <Typography key={commentIndex} variant="body1" sx={{ mb: 1, lineHeight: 1.8, color: 'text.primary' }}>
                          {comment.join(' ')}
                        </Typography>
                      );
                    }
                    // それ以外（オブジェクトなど）の場合はスキップ
                    return null;
                  })}
                </Box>
              </Paper>
            )}
            
            {/* 「こちらの物件について」セクション（見出しなし） */}
            {completeData?.propertyAbout && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, order: 7 }}> {/* 7番目 */}
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {completeData.propertyAbout}
                </Typography>
              </Paper>
            )}
            
            {/* 「概算書」セクション（印刷時は非表示） */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, order: 8 }} className="no-print"> {/* 8番目 */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                概算書
              </Typography>
              
              {/* 概算書ボタン（PC・スマホ共通） */}
              <Button
                variant="contained"
                onClick={() => handleGenerateEstimatePdf('preview')}
                disabled={isGeneratingPdf}
                fullWidth
                sx={{ mb: isGeneratingPdf ? 2 : 0 }}
              >
                {isGeneratingPdf ? '生成中...' : '概算書を表示'}
              </Button>
              
              {isGeneratingPdf && (
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={24} sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    概算書を生成しています。10秒ほどお待ちください...
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* 会社署名（印刷時のみ表示） */}
            <Box sx={{ display: 'none', '@media print': { display: 'block' } }} className="company-signature">
              <Box sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                flexDirection: 'column',
                textAlign: 'right'
              }}>
                <Box className="company-info" sx={{
                  fontSize: '12px',
                  lineHeight: 1.6,
                  color: '#666',
                  textAlign: 'right'
                }}>
                  <Box sx={{ mb: 0.5 }}>
                    <span>商号（名称）：</span>
                    <span>株式会社　威風</span>
                  </Box>
                  <Box sx={{ mb: 0.5 }}>
                    <span>代表者：</span>
                    <span>國廣智子</span>
                  </Box>
                  <Box sx={{ mb: 0.5 }}>
                    <span>主たる事務所の所在地：</span>
                    <span>大分市舞鶴町1-3-30</span>
                  </Box>
                  {/* 成約済みの場合は電話番号を非表示 */}
                  {!isSold && (
                    <Box sx={{ mb: 0.5 }}>
                      <span>電話番号：</span>
                      <span>097-533-2022</span>
                    </Box>
                  )}
                  <Box>
                    <span>免許証番号：</span>
                    <span>大分県知事（３）第3183号</span>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* 印刷用署名（フォールバック） - 各ページの最後に表示 */}
            <Box className="print-signature-fallback" sx={{ display: 'none' }}>
              <Box sx={{
                textAlign: 'right',
                fontSize: '5pt',
                lineHeight: 1.2,
                color: '#666'
              }}>
                <div>商号（名称）：株式会社　威風</div>
                <div>代表者：國廣智子</div>
                <div>主たる事務所の所在地：大分市舞鶴町1-3-30</div>
                {!isSold && <div>電話番号：097-533-2022</div>}
                <div>免許証番号：大分県知事（３）第3183号</div>
              </Box>
            </Box>
          </Grid>

          {/* 右カラム: お問い合わせフォーム（成約済みの場合は非表示） */}
          {!isSold && (
            <Grid item xs={12} md={4} className="no-print">
              <Box sx={{ position: 'sticky', top: 16 }}>
                <PublicInquiryForm
                  propertyId={property.id}
                  propertyAddress={property.display_address || property.address}
                  propertyNumber={property.property_number}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
    </>
  );
};

export default PublicPropertyDetailPage;
