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
import KujiraPropertyHeader from '../components/KujiraPropertyHeader';
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
 */
async function extractCoordinatesFromGoogleMapUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;

  try {
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/url-redirect/resolve?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json();
          url = data.redirectedUrl;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch redirect URL:', error);
      }
    }

    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

    const searchMatch = url.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
    if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };

    const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    const atMatch = url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    return null;
  } catch (error) {
    console.error('❌ Error extracting coordinates:', error);
    return null;
  }
}

const KujiraPropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { isAuthenticated } = useAuthStore();

  const isAdminMode = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const canHideParam = searchParams.get('canHide') === 'true';
    return isAuthenticated && canHideParam;
  }, [location.search, isAuthenticated]);

  const { isLoaded: isMapLoaded, loadError } = useGoogleMaps();

  const [completeData, setCompleteData] = useState<any>(null);
  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const { data: property, isLoading, isError, error } = usePublicProperty(id);

  const isSold = property ? getBadgeType(property.atbb_status) === 'sold' : false;

  // 全データ取得
  useEffect(() => {
    if (!id) return;

    const fetchCompleteData = async () => {
      try {
        const response = await publicApi.get(`/api/public/properties/${id}/complete`);
        setCompleteData(response.data);

        if (response.data?.panoramaUrl) {
          setPanoramaUrl(response.data.panoramaUrl);
        }

        // バックグラウンドで同期
        if (response.data?.needsSync) {
          publicApi.post(`/api/public/properties/${id}/sync-comments`)
            .then((syncResponse) => {
              if (syncResponse.data?.success) {
                setCompleteData((prev: any) => ({
                  ...prev,
                  favoriteComment: syncResponse.data.favoriteComment,
                  recommendedComments: syncResponse.data.recommendedComments,
                  athomeData: syncResponse.data.athomeData,
                  propertyAbout: syncResponse.data.propertyAbout,
                  needsSync: false,
                }));
              }
            })
            .catch(() => {});
        }
      } catch (error) {
        console.error('Failed to fetch complete data:', error);
      }
    };

    fetchCompleteData();
  }, [id]);

  // 座標取得
  useEffect(() => {
    if (!property) return;

    const fetchMapCoordinates = async () => {
      if (property.latitude && property.longitude) {
        setMapCoordinates({ lat: property.latitude, lng: property.longitude });
        return;
      }

      if (property.google_map_url) {
        const coords = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
        if (coords) {
          setMapCoordinates(coords);

          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            await fetch(`${apiUrl}/api/public/properties/${property.property_number}/save-coordinates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude: coords.lat, longitude: coords.lng }),
            });
          } catch (saveError) {
            console.warn('Failed to save coordinates:', saveError);
          }
        }
      }
    };

    fetchMapCoordinates();
  }, [property?.property_number, property?.google_map_url, property?.latitude, property?.longitude]);

  const handleGenerateEstimatePdf = async () => {
    if (!property) return;

    setIsGeneratingPdf(true);

    try {
      // PDFをバイナリで受け取る
      const response = await publicApi.post(
        `/api/public/properties/${property.property_number}/estimate-pdf`,
        {},
        { responseType: 'blob' }
      );
      // Blobから一時URLを作成して開く
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || error.details || '概算書の生成に失敗しました');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return '価格応談';
    return `${(price / 10000).toLocaleString()}万円`;
  };

  const getPropertyTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'detached_house': '一戸建て',
      'apartment': 'マンション',
      'land': '土地',
      'other': 'その他',
    };
    return typeMap[type] || type;
  };

  const formattedConstructionDate = property ? formatConstructionDate(property.construction_year_month) : null;
  const showConstructionDate = property && shouldShowConstructionDate(property.property_type) && formattedConstructionDate;

  const formatSettlementDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: '#1565C0' }} />
      </Box>
    );
  }

  if (isError || !property) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error?.status === 404 ? 'お探しの物件が見つかりませんでした' : error?.message || '物件の読み込みに失敗しました'}
        </Alert>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBackClick} sx={{ bgcolor: '#1565C0' }}>
          物件一覧に戻る
        </Button>
      </Container>
    );
  }

  return (
    <>
      {property && (
        <>
          <SEOHead
            title={`${property.address} - 株式会社くじら不動産`}
            description={`${getPropertyTypeLabel(property.property_type)}の物件です。価格: ${formatPrice(property.price)}。${property.address}に位置しています。`}
            keywords={['くじら不動産', '不動産', '物件', property.property_type, property.address, '大分']}
            canonicalUrl={typeof window !== 'undefined' ? window.location.href : ''}
            ogImage={property.images?.[0]}
            siteName="くじら不動産"
            faviconUrl="/kujira-logo.png"
          />
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

      <KujiraPropertyHeader
        showBackButton={true}
        atbbStatus={property?.atbb_status}
        navigationState={location.state}
        showInquiryButton={!isSold}
      />

      <Box sx={{ minHeight: '100vh', bgcolor: '#EEF2FF', py: 4 }}>
        <Container maxWidth="lg">
          {/* 印刷ボタン */}
          <Box
            className="no-print"
            sx={{
              position: 'fixed',
              top: 120,
              right: 16,
              zIndex: 1000,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <IconButton
              onClick={handlePrint}
              sx={{
                bgcolor: '#1565C0',
                color: 'white',
                boxShadow: 3,
                '&:hover': { bgcolor: '#0D47A1' },
              }}
            >
              <PrintIcon />
            </IconButton>
          </Box>

          <Grid container spacing={4}>
            {/* 左カラム */}
            <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>

              {/* お気に入り文言 */}
              {completeData?.favoriteComment && (
                <Box sx={{ mb: 3, order: 1 }}>
                  <Box sx={{
                    background: '#EEF2FF',
                    border: '2px solid #1565C0',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: 2,
                  }}>
                    <Box component="span" sx={{ mr: 1.5, fontSize: '24px' }}>🐋</Box>
                    <Box component="span" sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0D47A1' }}>
                      {completeData.favoriteComment}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* 物件画像ギャラリー */}
              <Paper elevation={2} sx={{ mb: 3, p: 2, order: 2 }}>
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

              {/* パノラマビュー */}
              {panoramaUrl && (
                <Paper elevation={2} sx={{ mb: 3, p: 2, order: 3 }} className="no-print">
                  <Typography variant="h6" sx={{ mb: 2 }}>360°パノラマビュー</Typography>
                  <Box sx={{ position: 'relative', width: '100%', paddingTop: { xs: '75%', sm: '56.25%' }, overflow: 'hidden', borderRadius: 1 }}>
                    <iframe
                      src={panoramaUrl}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      allowFullScreen
                      title="360°パノラマビュー"
                    />
                  </Box>
                </Paper>
              )}

              {/* 物件基本情報 */}
              <Paper elevation={2} sx={{ p: 3, mb: 3, order: 4 }}>
                <Box sx={{ mb: 2 }}>
                  <Chip label={getPropertyTypeLabel(property.property_type)} sx={{ bgcolor: '#1565C0', color: '#fff' }} />
                </Box>

                <Typography variant="h4" component="h1" sx={{ mb: 2, fontWeight: 'bold', color: '#0D47A1' }}>
                  {formatPrice(property.price)}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocationOnIcon sx={{ mr: 1, color: '#1565C0' }} />
                  <Typography variant="h6" color="text.secondary">
                    {(property as any).display_address || property.address}
                  </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Grid container spacing={2}>
                  {showConstructionDate && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body2" color="text.secondary">新築年月</Typography>
                      <Typography variant="body1" fontWeight="medium">{formattedConstructionDate}</Typography>
                    </Grid>
                  )}
                  {property.land_area && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body2" color="text.secondary">土地面積</Typography>
                      <Typography variant="body1" fontWeight="medium">{property.land_area}㎡</Typography>
                    </Grid>
                  )}
                  {property.building_area && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body2" color="text.secondary">建物面積</Typography>
                      <Typography variant="body1" fontWeight="medium">{property.building_area}㎡</Typography>
                    </Grid>
                  )}
                  {(property as any).building_age !== undefined && (property as any).building_age !== null && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body2" color="text.secondary">築年数</Typography>
                      <Typography variant="body1" fontWeight="medium">築{(property as any).building_age}年</Typography>
                    </Grid>
                  )}
                  {property.floor_plan && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body2" color="text.secondary">間取り</Typography>
                      <Typography variant="body1" fontWeight="medium">{property.floor_plan}</Typography>
                    </Grid>
                  )}
                </Grid>

                {(property as any).description && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>物件の説明</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{(property as any).description}</Typography>
                  </>
                )}
              </Paper>

              {/* 地図セクション */}
              {(property.google_map_url || mapCoordinates) && (
                <Paper elevation={2} sx={{ p: 3, mb: 3, order: 5 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>地図</Typography>

                  {property.google_map_url && (
                    <Button
                      variant="outlined"
                      startIcon={<LocationOnIcon />}
                      href={property.google_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      fullWidth
                      sx={{ mb: mapCoordinates && isMapLoaded ? 2 : 0, borderColor: '#1565C0', color: '#1565C0' }}
                    >
                      Google Mapで見る
                    </Button>
                  )}

                  {mapCoordinates && isMapLoaded && (
                    <Box sx={{ width: '100%', height: '400px', borderRadius: 1, overflow: 'hidden' }}>
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={{ lat: mapCoordinates.lat, lng: mapCoordinates.lng }}
                        zoom={15}
                        options={{ zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false }}
                        onLoad={(map) => {
                          new google.maps.Marker({
                            position: { lat: mapCoordinates.lat, lng: mapCoordinates.lng },
                            map,
                            title: property.address,
                          });
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              )}

              {/* 成約済み情報 */}
              {isSold && (
                <Paper elevation={2} sx={{ p: 3, mb: 3, order: 6 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>成約情報</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">物件番号</Typography>
                    <Typography variant="body1" fontWeight="medium">{property.property_number}</Typography>
                  </Box>
                  {completeData?.settlementDate && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">成約日</Typography>
                      <Typography variant="body1" fontWeight="medium">{formatSettlementDate(completeData.settlementDate)}</Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* おすすめコメント */}
              {completeData?.recommendedComments && completeData.recommendedComments.length > 0 && (
                <Paper
                  elevation={2}
                  sx={{ p: 3, mb: 3, backgroundColor: '#EEF2FF', borderLeft: '4px solid #1565C0', order: 6 }}
                >
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1565C0' }}>
                    おすすめポイント
                  </Typography>
                  <Box>
                    {completeData.recommendedComments
                      .filter((comment: any) => {
                        const flatten = (c: any): string => Array.isArray(c) ? c.map(flatten).join(' ') : String(c ?? '');
                        const text = flatten(comment).trim();
                        return !text.startsWith('←') && !text.includes('一般媒介で、担当もついている場合') && !text.startsWith('＼') && !text.endsWith('／');
                      })
                      .map((comment: any, commentIndex: number) => {
                        if (typeof comment === 'string') {
                          return <Typography key={commentIndex} variant="body1" sx={{ mb: 1, lineHeight: 1.8 }}>{comment}</Typography>;
                        }
                        if (Array.isArray(comment)) {
                          return <Typography key={commentIndex} variant="body1" sx={{ mb: 1, lineHeight: 1.8 }}>{comment.join(' ')}</Typography>;
                        }
                        return null;
                      })}
                  </Box>
                </Paper>
              )}

              {/* 物件についての説明 */}
              {completeData?.propertyAbout && (
                <Paper elevation={2} sx={{ p: 3, mb: 3, order: 7 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{completeData.propertyAbout}</Typography>
                </Paper>
              )}

              {/* 概算書 */}
              <Paper elevation={2} sx={{ p: 3, mb: 3, order: 8 }} className="no-print">
                <Typography variant="h6" sx={{ mb: 2 }}>概算書</Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerateEstimatePdf}
                  disabled={isGeneratingPdf}
                  fullWidth
                  sx={{ bgcolor: '#1565C0', '&:hover': { bgcolor: '#0D47A1' }, mb: isGeneratingPdf ? 2 : 0 }}
                >
                  {isGeneratingPdf ? '生成中...' : '概算書を表示'}
                </Button>
                {isGeneratingPdf && (
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={24} sx={{ mb: 1, color: '#1565C0' }} />
                    <Typography variant="body2" color="text.secondary">
                      概算書を生成しています。10秒ほどお待ちください...
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* 印刷用会社署名 */}
              <Box sx={{ display: 'none', '@media print': { display: 'block' } }} className="company-signature">
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', flexDirection: 'column', textAlign: 'right' }}>
                  <Box sx={{ fontSize: '12px', lineHeight: 1.6, color: '#666', textAlign: 'right' }}>
                    <Box sx={{ mb: 0.5 }}>
                      <span>商号（名称）：</span><span>株式会社くじら不動産</span>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* 右カラム：お問合せフォーム */}
            {!isSold && (
              <Grid item xs={12} md={4} className="no-print">
                <Box sx={{ position: 'sticky', top: 16 }}>
                  <PublicInquiryForm
                    propertyId={property.id}
                    propertyAddress={(property as any).display_address || property.address}
                    propertyNumber={property.property_number}
                    phoneNumber="092-401-5331"
                    phoneHours="お気軽にお問い合わせください"
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

export default KujiraPropertyDetailPage;
