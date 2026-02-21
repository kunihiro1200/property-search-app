import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Link,
  Checkbox,
  Button,
  Snackbar,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import EmailConfirmationModal from './EmailConfirmationModal';

interface NearbyBuyer {
  buyer_number: string;
  name: string;
  distribution_areas: string[];
  latest_status: string;
  latest_viewing_date: string;
  reception_date?: string;
  inquiry_hearing?: string;
  viewing_result_follow_up?: string;
  email?: string;
  phone_number?: string;
  property_address?: string | null;
  inquiry_property_type?: string | null;
  inquiry_price?: number | null;
}

interface NearbyBuyersListProps {
  sellerId: string;
  propertyNumber?: string;
}

interface PropertyDetails {
  address: string | null;
  landArea: number | null;
  buildingArea: number | null;
  buildYear: number | null;
  floorPlan: string | null;
}

const NearbyBuyersList = ({ sellerId, propertyNumber }: NearbyBuyersListProps) => {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<NearbyBuyer[]>([]);
  const [matchedAreas, setMatchedAreas] = useState<string[]>([]);
  const [propertyAddress, setPropertyAddress] = useState<string | null>(null);
  const [propertyNumberState, setPropertyNumberState] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedBuyers, setSelectedBuyers] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [expandedAreaBuyer, setExpandedAreaBuyer] = useState<string | null>(null);
  
  // ソート状態
  const [sortConfig, setSortConfig] = useState<{
    key: keyof NearbyBuyer | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  });

  // 希望エリアの短縮表示（括弧の前まで）
  const getShortArea = (area: string): string => {
    const parenIndex = area.indexOf('（');
    if (parenIndex > 0) {
      return area.substring(0, parenIndex);
    }
    return area;
  };

  // 希望エリアの詳細（括弧内）
  const getAreaDetail = (area: string): string | null => {
    const parenIndex = area.indexOf('（');
    if (parenIndex > 0) {
      return area.substring(parenIndex);
    }
    return null;
  };

  // 希望エリアのクリックハンドラ
  const handleAreaClick = (buyerNumber: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedAreaBuyer(expandedAreaBuyer === buyerNumber ? null : buyerNumber);
  };
  
  // ソート処理
  const handleSort = (key: keyof NearbyBuyer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // ソート適用後の買主リスト
  const sortedBuyers = React.useMemo(() => {
    if (!sortConfig.key) {
      return buyers;
    }
    
    const sorted = [...buyers].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];
      
      // null/undefinedの処理
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // 日付の処理
      if (sortConfig.key === 'latest_viewing_date') {
        const aDate = new Date(aValue as string).getTime();
        const bDate = new Date(bValue as string).getTime();
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // 数値の処理
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // 文字列の処理
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr, 'ja');
      } else {
        return bStr.localeCompare(aStr, 'ja');
      }
    });
    
    return sorted;
  }, [buyers, sortConfig]);

  useEffect(() => {
    const fetchNearbyBuyers = async () => {
      try {
        setLoading(true);
        setError(null);
        setMessage(null);

        console.log('🔍 [NearbyBuyersList] Fetching nearby buyers for seller:', sellerId);
        const response = await api.get(`/api/sellers/${sellerId}/nearby-buyers`);
        console.log('✅ [NearbyBuyersList] Response:', response.data);
        
        setBuyers(response.data.buyers || []);
        setMatchedAreas(response.data.matchedAreas || []);
        setPropertyAddress(response.data.propertyAddress);
        setPropertyDetails(response.data.propertyDetails || null);
        
        // 物件番号を取得（propsで渡されていない場合は、売主情報から取得）
        if (propertyNumber) {
          setPropertyNumberState(propertyNumber);
        } else {
          // 売主情報を取得して物件番号を設定
          try {
            const sellerResponse = await api.get(`/api/sellers/${sellerId}`);
            const propertyNum = sellerResponse.data.propertyNumber;
            if (propertyNum) {
              setPropertyNumberState(propertyNum);
              console.log('📍 [NearbyBuyersList] Property number from seller:', propertyNum);
            }
          } catch (err) {
            console.warn('⚠️ [NearbyBuyersList] Failed to fetch seller property number:', err);
          }
        }
        
        if (response.data.message) {
          setMessage(response.data.message);
          console.log('ℹ️ [NearbyBuyersList] Message:', response.data.message);
        }
      } catch (err: any) {
        console.error('❌ [NearbyBuyersList] Failed to fetch nearby buyers:', err);
        console.error('❌ [NearbyBuyersList] Error response:', err.response?.data);
        setError(err.response?.data?.error?.message || 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchNearbyBuyers();
    }
  }, [sellerId, propertyNumber]);

  const handleBuyerClick = (buyerNumber: string) => {
    // 別タブで買主詳細ページを開く
    window.open(`/buyers/${buyerNumber}`, '_blank');
  };

  // ソートアイコンの表示
  const getSortIcon = (key: keyof NearbyBuyer) => {
    if (sortConfig.key !== key) {
      return ' ⇅';
    }
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };
  
  // チェックボックスの全選択/全解除
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allBuyerNumbers = new Set(sortedBuyers.map(b => b.buyer_number));
      setSelectedBuyers(allBuyerNumbers);
    } else {
      setSelectedBuyers(new Set());
    }
  };

  // 個別のチェックボックス選択
  const handleSelectBuyer = (buyerNumber: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 行クリックイベントを防ぐ
    const newSelected = new Set(selectedBuyers);
    if (newSelected.has(buyerNumber)) {
      newSelected.delete(buyerNumber);
    } else {
      newSelected.add(buyerNumber);
    }
    setSelectedBuyers(newSelected);
  };

  // メール配信機能
  const handleSendEmail = async () => {
    if (selectedBuyers.size === 0) {
      setSnackbar({
        open: true,
        message: '買主を選択してください',
        severity: 'warning',
      });
      return;
    }

    // 選択された買主の情報を取得
    const selectedCandidates = sortedBuyers.filter(b => selectedBuyers.has(b.buyer_number));
    const candidatesWithEmail = selectedCandidates.filter(b => 
      b.email && typeof b.email === 'string' && b.email.trim() !== ''
    );

    if (candidatesWithEmail.length === 0) {
      setSnackbar({
        open: true,
        message: '選択された買主にメールアドレスが登録されていません',
        severity: 'error',
      });
      return;
    }

    // 公開物件サイトのURL（propsまたはstateから取得）
    const effectivePropertyNumber = propertyNumber || propertyNumberState;
    const publicUrl = effectivePropertyNumber
      ? `https://property-site-frontend-kappa.vercel.app/public/properties/${effectivePropertyNumber}`
      : '';
    
    // 所在地
    const address = propertyAddress || '物件';

    // メールの件名
    const subject = `${address}に興味のあるかた！もうすぐ売り出します！事前に内覧可能です！`;

    // 物件情報セクションを構築
    let propertyInfoSection = '';
    if (propertyDetails) {
      const infoLines: string[] = [];
      
      if (propertyDetails.address) {
        infoLines.push(`住所: ${propertyDetails.address}`);
      }
      if (propertyDetails.landArea) {
        infoLines.push(`土地面積: ${propertyDetails.landArea}㎡`);
      }
      if (propertyDetails.buildingArea) {
        infoLines.push(`建物面積: ${propertyDetails.buildingArea}㎡`);
      }
      if (propertyDetails.buildYear) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - propertyDetails.buildYear;
        infoLines.push(`築年: ${age}年`);
      }
      if (propertyDetails.floorPlan) {
        infoLines.push(`間取り: ${propertyDetails.floorPlan}`);
      }
      
      // 価格：未定を追加
      infoLines.push(`価格: 未定`);
      
      if (infoLines.length > 0) {
        propertyInfoSection = '\n\n【物件情報】\n' + infoLines.join('\n');
      }
    }

    // 本文テンプレート
    let bodyTemplate: string;
    
    if (candidatesWithEmail.length === 1) {
      // 1件選択時: 実際の名前を表示
      const buyerName = candidatesWithEmail[0].name || 'お客様';
      bodyTemplate = `${buyerName}様

お世話になります。不動産会社の株式会社いふうです。

${address}を近々売りに出すことになりました！${propertyInfoSection}

もしご興味がございましたら、誰よりも早く内覧することが可能となっておりますので、このメールにご返信頂ければと思います。

${publicUrl ? `物件詳細：${publicUrl}\n\n` : ''}よろしくお願いいたします。

×××××××××××××××
大分市舞鶴町1-3-30
株式会社いふう
TEL:097-533-2022
×××××××××××××××`;
    } else {
      // 複数件選択時: {氏名}プレースホルダーを表示
      bodyTemplate = `{氏名}様

お世話になります。不動産会社の株式会社いふうです。

${address}を近々売りに出すことになりました！${propertyInfoSection}

もしご興味がございましたら、誰よりも早く内覧することが可能となっておりますので、このメールにご返信頂ければと思います。

${publicUrl ? `物件詳細：${publicUrl}\n\n` : ''}よろしくお願いいたします。

×××××××××××××××
大分市舞鶴町1-3-30
株式会社いふう
TEL:097-533-2022
×××××××××××××××`;
    }

    // モーダルを開く
    setEmailSubject(subject);
    setEmailBody(bodyTemplate);
    setEmailModalOpen(true);
  };

  // メール送信確認後の実際の送信処理
  const handleConfirmSendEmail = async (subject: string, body: string) => {
    // 選択された買主の情報を取得
    const selectedCandidates = sortedBuyers.filter(b => selectedBuyers.has(b.buyer_number));
    const candidatesWithEmail = selectedCandidates.filter(b => 
      b.email && typeof b.email === 'string' && b.email.trim() !== ''
    );

    try {
      setSnackbar({
        open: true,
        message: `メール送信中... (${candidatesWithEmail.length}件)`,
        severity: 'info',
      });

      // 各買主に個別にメールを送信
      const results = await Promise.allSettled(
        candidatesWithEmail.map(async (candidate) => {
          const buyerName = candidate.name || 'お客様';
          const personalizedBody = body.replace(/{氏名}/g, buyerName);

          return await api.post('/api/emails/send-distribution', {
            recipients: [candidate.email!],
            subject: subject,
            body: personalizedBody,
            from: 'tenant@ifoo-oita.com',
            cc: 'tenant@ifoo-oita.com',
          });
        })
      );

      // 成功・失敗をカウント
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      if (failedCount === 0) {
        setSnackbar({
          open: true,
          message: `メールを送信しました (${successCount}件)\n各買主に個別に送信されました。`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: `メール送信が完了しました\n成功: ${successCount}件\n失敗: ${failedCount}件`,
          severity: 'warning',
        });
      }

      // 選択をクリア
      setSelectedBuyers(new Set());
    } catch (error: any) {
      console.error('Failed to send emails:', error);
      setSnackbar({
        open: true,
        message: error.message || 'メール送信に失敗しました。もう一度お試しください。',
        severity: 'error',
      });
      throw error;
    }
  };

  // SMS送信機能
  const handleSendSms = async () => {
    if (selectedBuyers.size === 0) {
      setSnackbar({
        open: true,
        message: '買主を選択してください',
        severity: 'warning',
      });
      return;
    }

    // 選択された買主の情報を取得
    const selectedCandidates = sortedBuyers.filter(b => selectedBuyers.has(b.buyer_number));
    const candidatesWithPhone = selectedCandidates.filter(b => 
      b.phone_number && typeof b.phone_number === 'string' && b.phone_number.trim() !== ''
    );

    if (candidatesWithPhone.length === 0) {
      setSnackbar({
        open: true,
        message: '選択された買主に電話番号が登録されていません',
        severity: 'error',
      });
      return;
    }

    // 公開物件サイトのURL（propsまたはstateから取得）
    const effectivePropertyNumber = propertyNumber || propertyNumberState;
    const publicUrl = effectivePropertyNumber
      ? `https://property-site-frontend-kappa.vercel.app/public/properties/${effectivePropertyNumber}`
      : '';
    
    // 所在地
    const address = propertyAddress || '物件';

    // 複数選択の場合は最初の買主のSMSアプリを開く
    const firstCandidate = candidatesWithPhone[0];
    const buyerName = firstCandidate.name || 'お客様';

    // 物件情報セクションを構築
    let propertyInfoSection = '';
    if (propertyDetails) {
      const infoLines: string[] = [];
      
      if (propertyDetails.address) {
        infoLines.push(`住所: ${propertyDetails.address}`);
      }
      if (propertyDetails.landArea) {
        infoLines.push(`土地面積: ${propertyDetails.landArea}㎡`);
      }
      if (propertyDetails.buildingArea) {
        infoLines.push(`建物面積: ${propertyDetails.buildingArea}㎡`);
      }
      if (propertyDetails.buildYear) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - propertyDetails.buildYear;
        infoLines.push(`築年: ${age}年`);
      }
      if (propertyDetails.floorPlan) {
        infoLines.push(`間取り: ${propertyDetails.floorPlan}`);
      }
      
      // 価格：未定を追加
      infoLines.push(`価格: 未定`);
      
      if (infoLines.length > 0) {
        propertyInfoSection = '\n\n【物件情報】\n' + infoLines.join('\n');
      }
    }

    // SMSメッセージ
    const message = `${buyerName}様

株式会社いふうです。

${address}を近々売りに出すことになりました！${propertyInfoSection}

誰よりも早く内覧可能です。ご興味がございましたらご返信ください。

${publicUrl ? `${publicUrl}\n\n` : ''}株式会社いふう
TEL:097-533-2022`;

    try {
      // SMS送信用のリンクを開く
      window.open(`sms:${firstCandidate.phone_number}?body=${encodeURIComponent(message)}`, '_blank');

      if (candidatesWithPhone.length === 1) {
        setSnackbar({
          open: true,
          message: `${buyerName}様へのSMSアプリを開きました`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: `${buyerName}様へのSMSアプリを開きました（${candidatesWithPhone.length}件選択中、1件目のみ表示）`,
          severity: 'info',
        });
      }
    } catch (error: any) {
      console.error('Failed to open SMS app:', error);
      setSnackbar({
        open: true,
        message: 'SMSアプリを開けませんでした',
        severity: 'error',
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (message) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {message}
      </Alert>
    );
  }

  if (buyers.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        該当する買主はいません
      </Alert>
    );
  }

  return (
    <Box>
      {/* エリア情報 */}
      {propertyAddress && matchedAreas.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            物件住所: {propertyAddress}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              該当エリア:
            </Typography>
            {matchedAreas.map((area, index) => (
              <Chip
                key={index}
                label={area}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* アクションボタン */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<EmailIcon />}
          onClick={handleSendEmail}
          disabled={selectedBuyers.size === 0}
        >
          メール送信 ({selectedBuyers.size})
        </Button>
        <Button
          variant="contained"
          startIcon={<SmsIcon />}
          onClick={handleSendSms}
          disabled={selectedBuyers.size === 0}
          color="secondary"
        >
          SMS送信 ({selectedBuyers.size})
        </Button>
      </Box>

      {/* 買主リストテーブル */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedBuyers.size > 0 && selectedBuyers.size < sortedBuyers.length}
                  checked={sortedBuyers.length > 0 && selectedBuyers.size === sortedBuyers.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell 
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('buyer_number')}
              >
                買主番号{getSortIcon('buyer_number')}
              </TableCell>
              <TableCell 
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('name')}
              >
                氏名{getSortIcon('name')}
              </TableCell>
              <TableCell sx={{ minWidth: 80, maxWidth: 150 }}>希望エリア</TableCell>
              <TableCell>問合せ物件情報</TableCell>
              <TableCell 
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('inquiry_price')}
              >
                価格{getSortIcon('inquiry_price')}
              </TableCell>
              <TableCell>ヒアリング/内覧結果</TableCell>
              <TableCell 
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('latest_status')}
              >
                最新状況{getSortIcon('latest_status')}
              </TableCell>
              <TableCell 
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('latest_viewing_date')}
              >
                内覧日{getSortIcon('latest_viewing_date')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedBuyers.map((buyer) => {
              // 内覧結果・後続対応が優先、なければ問合せ時ヒアリング
              const hearingOrResult = buyer.viewing_result_follow_up || buyer.inquiry_hearing || '-';
              const isAreaExpanded = expandedAreaBuyer === buyer.buyer_number;
              
              return (
                <TableRow
                  key={buyer.buyer_number}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleBuyerClick(buyer.buyer_number)}
                  selected={selectedBuyers.has(buyer.buyer_number)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedBuyers.has(buyer.buyer_number)}
                      onChange={(e) => handleSelectBuyer(buyer.buyer_number, e as any)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyerClick(buyer.buyer_number);
                      }}
                      sx={{ textDecoration: 'none' }}
                    >
                      {buyer.buyer_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body2">
                        {buyer.name || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {buyer.reception_date
                          ? new Date(buyer.reception_date).toLocaleDateString('ja-JP')
                          : '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: 80, maxWidth: 150 }}>
                    {buyer.distribution_areas && buyer.distribution_areas.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {buyer.distribution_areas.map((area, index) => {
                          const shortArea = getShortArea(area);
                          const detail = getAreaDetail(area);
                          
                          return (
                            <Chip
                              key={index}
                              label={
                                isAreaExpanded && detail ? (
                                  <span>
                                    {shortArea}
                                    <span style={{ fontSize: '0.85em', color: '#666' }}>{detail}</span>
                                  </span>
                                ) : (
                                  shortArea
                                )
                              }
                              size="small"
                              variant="outlined"
                              onClick={(e) => detail ? handleAreaClick(buyer.buyer_number, e) : undefined}
                              sx={{
                                cursor: detail ? 'pointer' : 'default',
                                '&:hover': detail ? { backgroundColor: 'rgba(0, 0, 0, 0.04)' } : {},
                              }}
                            />
                          );
                        })}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body2">
                        種別: {buyer.inquiry_property_type || '-'}
                      </Typography>
                      <Typography variant="body2" sx={{ maxWidth: 250 }}>
                        所在地: {buyer.property_address || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {buyer.inquiry_price 
                      ? `${(buyer.inquiry_price / 10000).toLocaleString()}万円`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxWidth: 300 }}>
                      {hearingOrResult}
                    </Typography>
                  </TableCell>
                  <TableCell>{buyer.latest_status || '-'}</TableCell>
                  <TableCell>
                    {buyer.latest_viewing_date
                      ? new Date(buyer.latest_viewing_date).toLocaleDateString('ja-JP')
                      : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 件数表示 */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {buyers.length}件の買主が見つかりました
      </Typography>

      {/* メール確認モーダル */}
      <EmailConfirmationModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onConfirm={handleConfirmSendEmail}
        defaultSubject={emailSubject}
        defaultBody={emailBody}
        recipientCount={sortedBuyers.filter(b => selectedBuyers.has(b.buyer_number) && b.email).length}
      />

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NearbyBuyersList;
