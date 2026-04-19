import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, InfoWindow } from '@react-google-maps/api';
import { Box, Typography, Button, CircularProgress, Paper, Chip } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicProperty } from '../types/publicProperty';
import { NavigationState } from '../types/navigationState';
import { mapAtbbStatusToDisplayStatus, StatusType } from '../utils/atbbStatusDisplayMapper';

interface PropertyMapViewProps {
  properties: PublicProperty[];
  isLoaded: boolean;
  loadError: Error | undefined;
  // ナビゲーション状態（一覧画面から渡される）
  navigationState?: Omit<NavigationState, 'scrollPosition'>;
}

interface PropertyMapViewProps {
  properties: PublicProperty[];
  isLoaded: boolean;
  loadError: Error | undefined;
}

interface PropertyWithCoordinates extends PublicProperty {
  lat?: number;
  lng?: number;
}

const containerStyle = {
  width: '100%',
  height: '600px',
};

// 大分市の中心座標
const defaultCenter = {
  lat: 33.2382,
  lng: 131.6126,
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// バッジ設定（StatusBadgeと同じ）
interface BadgeConfig {
  label: string;
  color: string;
  backgroundColor: string;
  markerColor: string; // マーカーの色
}

const BADGE_CONFIGS: Record<StatusType, BadgeConfig> = {
  pre_publish: {
    label: '公開前情報',
    color: '#fff',
    backgroundColor: '#ff9800', // オレンジ
    markerColor: '#ff9800', // オレンジマーカー
  },
  private: {
    label: '非公開物件',
    color: '#fff',
    backgroundColor: '#f44336', // 赤
    markerColor: '#f44336', // 赤マーカー
  },
  sold: {
    label: '成約済み',
    color: '#fff',
    backgroundColor: '#9e9e9e', // グレー
    markerColor: '#9e9e9e', // グレーマーカー
  },
  other: {
    label: '',
    color: '',
    backgroundColor: '',
    markerColor: '#2196F3', // 水色（販売中物件）
  },
};

// マーカーの色を取得
const getMarkerColor = (atbbStatus: string): string => {
  if (!atbbStatus || atbbStatus === '' || atbbStatus === '公開中') {
    return '#2196F3'; // 青（販売中物件）
  }
  
  const result = mapAtbbStatusToDisplayStatus(atbbStatus);
  return BADGE_CONFIGS[result.statusType].markerColor;
};

// バッジ設定を取得
const getBadgeConfig = (atbbStatus: string): BadgeConfig | null => {
  if (!atbbStatus || atbbStatus === '') {
    return null;
  }
  
  const result = mapAtbbStatusToDisplayStatus(atbbStatus);
  if (result.statusType === 'other') {
    return null;
  }
  
  return BADGE_CONFIGS[result.statusType];
};

/**
 * Google MapのURLから座標を抽出
 * 対応フォーマット:
 * - https://maps.google.com/maps?q=33.2820604,131.4869034
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
    
    // パターン2: /place/lat,lng
    const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2]),
      };
    }
    
    // パターン3: /@lat,lng,zoom
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
    console.error('❌ Error extracting coordinates from URL:', error);
    return null;
  }
}

/**
 * 住所から座標を取得（Google Geocoding API）
 * キャッシュ機能付き
 */
async function geocodeAddress(address: string, propertyNumber: string): Promise<{ lat: number; lng: number } | null> {
  // キャッシュをチェック
  const cacheKey = `geocode_${propertyNumber}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const coords = JSON.parse(cached);
      console.log('✅ Using cached coordinates for', propertyNumber, coords);
      return coords;
    } catch (e) {
      console.warn('Failed to parse cached coordinates:', e);
    }
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GOOGLE_MAPS_API_KEY}&language=ja&region=jp`;
    
    console.log('Geocoding request for:', address);
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Geocoding response status:', data.status);

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const coords = {
        lat: location.lat,
        lng: location.lng,
      };
      
      // キャッシュに保存
      localStorage.setItem(cacheKey, JSON.stringify(coords));
      
      console.log('✅ Geocoding success:', coords);
      return coords;
    } else {
      console.error('❌ Geocoding failed:', data.status, data.error_message || 'No error message');
      return null;
    }
  } catch (error) {
    console.error('❌ Geocoding exception:', error);
    return null;
  }
}

/**
 * 物件を地図上に表示するコンポーネント
 */
const PropertyMapView: React.FC<PropertyMapViewProps> = ({ properties, isLoaded, loadError, navigationState }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoordinates | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [propertiesWithCoords, setPropertiesWithCoords] = useState<PropertyWithCoordinates[]>([]);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // 物件の座標を取得（データベースから座標がある物件のみ - 高速）
  useEffect(() => {
    if (!isLoaded || properties.length === 0) {
      return;
    }

    // データベースに座標がある物件のみをフィルタリング（高速化）
    const propertiesWithCoordinates: PropertyWithCoordinates[] = properties
      .filter(property => property.latitude && property.longitude)
      .map(property => ({
        ...property,
        lat: property.latitude,
        lng: property.longitude,
      }));
    
    console.log(`PropertyMapView: ${propertiesWithCoordinates.length}/${properties.length} properties have coordinates`);
    
    setPropertiesWithCoords(propertiesWithCoordinates);
  }, [properties, isLoaded]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    // マーカーをクリーンアップ
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
    setMap(null);
  }, [markers]);

  // 座標付き物件が更新されたらマーカーを作成
  useEffect(() => {
    if (!map || propertiesWithCoords.length === 0) {
      return;
    }

    // 既存のマーカーをクリア
    markers.forEach(marker => {
      marker.setMap(null);
    });

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new window.google.maps.LatLngBounds();
    
    // 座標の重複をチェックして、重なる場合は円形に配置
    // Step 1: 座標ごとに物件をグループ化
    const coordinateGroups = new Map<string, PropertyWithCoordinates[]>();
    
    propertiesWithCoords.forEach((property) => {
      if (property.lat && property.lng) {
        const coordKey = `${property.lat.toFixed(6)},${property.lng.toFixed(6)}`;
        const group = coordinateGroups.get(coordKey) || [];
        group.push(property);
        coordinateGroups.set(coordKey, group);
      }
    });
    
    // Step 2: 各グループの物件にマーカーを作成
    coordinateGroups.forEach((group, coordKey) => {
      const [latStr, lngStr] = coordKey.split(',');
      const baseLat = parseFloat(latStr);
      const baseLng = parseFloat(lngStr);
      
      // 物件番号でソート（一貫性のため）
      const sortedGroup = [...group].sort((a, b) => 
        a.property_number.localeCompare(b.property_number)
      );
      
      sortedGroup.forEach((property, index) => {
        // 重複している場合、円形に配置
        let adjustedLat = baseLat;
        let adjustedLng = baseLng;
        
        if (group.length > 1) {
          // 円形に配置（0.0005度 ≈ 約50m - より見やすく）
          const angle = (index * 360 / group.length) * (Math.PI / 180);
          const offset = 0.0005; // 0.0001から0.0005に増加（5倍）
          adjustedLat += offset * Math.cos(angle);
          adjustedLng += offset * Math.sin(angle);
        }
        
        bounds.extend({
          lat: adjustedLat,
          lng: adjustedLng,
        });

        // マーカーの色を取得
        const markerColor = getMarkerColor(property.atbb_status);
        const markerScale = 10;
        const zIndex = google.maps.Marker.MAX_ZINDEX + index; // グループ内での順序

        // SVGマーカーを作成（色付き）
        const svgMarker = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: markerScale,
        };

        // マーカーを直接作成（調整された座標を使用）
        const marker = new google.maps.Marker({
          position: { lat: adjustedLat, lng: adjustedLng },
          map: map,
          title: property.property_number,
          icon: svgMarker,
          zIndex: zIndex,
        });

        // マーカークリックイベント
        marker.addListener('click', () => {
          handleMarkerClick(property);
        });

        newMarkers.push(marker);
      });
    });

    setMarkers(newMarkers);

    // 初期表示は大分市中心に固定（fitBoundsは使わない）
    // ユーザーが手動でズーム・移動できる
  }, [map, propertiesWithCoords]);

  const handleMarkerClick = (property: PropertyWithCoordinates) => {
    setSelectedProperty(property);
  };

  const handleInfoWindowClose = () => {
    setSelectedProperty(null);
  };

  const handlePropertyClick = (propertyId: string) => {
    // navigationStateが渡されていない場合は新しいタブで開く
    if (!navigationState) {
      window.open(`/public/properties/${propertyId}`, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // 現在のスクロール位置を取得
    const currentScrollPosition = window.scrollY || window.pageYOffset;
    
    // ナビゲーション状態にスクロール位置を追加
    const fullNavigationState: NavigationState = {
      currentPage: navigationState.currentPage,
      scrollPosition: currentScrollPosition,
      viewMode: navigationState.viewMode, // viewModeを保存
      filters: navigationState.filters
    };
    
    // sessionStorageに状態を保存（navigate(-1)で戻った時に復元するため）
    sessionStorage.setItem('publicPropertiesNavigationState', JSON.stringify(fullNavigationState));
    console.log('[PropertyMapView] Saved state to sessionStorage:', fullNavigationState);
    
    // canHideパラメータを引き継ぐ
    const canHide = searchParams.get('canHide');
    const targetUrl = canHide === 'true' 
      ? `/public/properties/${propertyId}?canHide=true`
      : `/public/properties/${propertyId}`;
    
    console.log('[PropertyMapView] Navigating to (with state):', targetUrl);
    
    // 状態を保持してナビゲート
    navigate(targetUrl, {
      state: fullNavigationState
    });
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

  if (loadError) {
    console.error('❌ Google Maps読み込みエラー詳細:', loadError);
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6" gutterBottom>
          地図の読み込みに失敗しました
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          以下の原因が考えられます：
        </Typography>
        <Box sx={{ textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Google Maps APIキーが設定されていない、または無効です
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Maps JavaScript APIが有効になっていません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • 請求アカウントが設定されていません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • APIキーのリファラー制限により、このドメインからのアクセスが拒否されています
          </Typography>
        </Box>
        {!GOOGLE_MAPS_API_KEY && (
          <Typography color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
            ⚠️ Google Maps APIキーが設定されていません
          </Typography>
        )}
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (propertiesWithCoords.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          地図に表示できる物件がありません（座標情報が必要です）
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* 凡例 */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" fontWeight="bold" color="text.secondary">
          マーカーの色:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: '#2196F3',
              border: '2px solid #fff',
              boxShadow: 1,
            }}
          />
          <Typography variant="body2">販売中物件</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: '#ff9800',
              border: '2px solid #fff',
              boxShadow: 1,
            }}
          />
          <Typography variant="body2">公開前情報</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: '#f44336',
              border: '2px solid #fff',
              boxShadow: 1,
            }}
          />
          <Typography variant="body2">非公開物件</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: '#9e9e9e',
              border: '2px solid #fff',
              boxShadow: 1,
            }}
          />
          <Typography variant="body2">成約済み</Typography>
        </Box>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {propertiesWithCoords.length}件の物件を地図上に表示しています
      </Typography>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={11}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* 選択された物件の情報ウィンドウ */}
        {selectedProperty && selectedProperty.lat && selectedProperty.lng && (
          <InfoWindow
            position={{
              lat: selectedProperty.lat,
              lng: selectedProperty.lng,
            }}
            onCloseClick={handleInfoWindowClose}
          >
            <Box sx={{ maxWidth: 250 }}>
              {/* バッジ表示 */}
              {(() => {
                const badgeConfig = getBadgeConfig(selectedProperty.atbb_status);
                return badgeConfig ? (
                  <Chip
                    label={badgeConfig.label}
                    size="small"
                    sx={{
                      backgroundColor: badgeConfig.backgroundColor,
                      color: badgeConfig.color,
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      height: 24,
                      mb: 1,
                    }}
                  />
                ) : null;
              })()}
              
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                {getPropertyTypeLabel(selectedProperty.property_type)}
              </Typography>
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                {formatPrice(selectedProperty.price)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedProperty.display_address || selectedProperty.address}
              </Typography>
              <Button
                variant="contained"
                size="small"
                fullWidth
                onClick={() => handlePropertyClick(selectedProperty.id)}
                aria-label="物件詳細を新しいタブで開く"
                sx={{
                  backgroundColor: (() => {
                    const result = mapAtbbStatusToDisplayStatus(selectedProperty.atbb_status);
                    return result.statusType === 'other'
                      ? '#2196F3'
                      : BADGE_CONFIGS[result.statusType].backgroundColor;
                  })(),
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: (() => {
                      const result = mapAtbbStatusToDisplayStatus(selectedProperty.atbb_status);
                      if (result.statusType === 'other') return '#1976D2';
                      const base = BADGE_CONFIGS[result.statusType].backgroundColor;
                      return base;
                    })(),
                  },
                }}
              >
                詳細を見る
              </Button>
            </Box>
          </InfoWindow>
        )}
      </GoogleMap>
    </Box>
  );
};

export default PropertyMapView;
