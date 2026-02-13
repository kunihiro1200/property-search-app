import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../services/api';
import { INQUIRY_SOURCE_OPTIONS } from '../utils/buyerInquirySourceOptions';
import PropertyInfoCard from '../components/PropertyInfoCard';

interface PropertyInfo {
  property_number: string;
  address: string;
  property_type: string;
  sales_price: number | null;
  land_area: number | null;
  building_area: number | null;
  floor_plan?: string;
  current_status?: string;
  pre_viewing_notes?: string;
  property_tax?: number;
  management_fee?: number;
  reserve_fund?: number;
  parking?: string;
  parking_fee?: number;
  delivery?: string;
  viewing_key?: string;
  viewing_parking?: string;
  viewing_notes?: string;
  special_notes?: string;
  memo?: string;
}

export default function NewBuyerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyNumber = searchParams.get('propertyNumber');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(false);

  // 基本情報
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [propertyNumberField, setPropertyNumberField] = useState(propertyNumber || '');
  
  // 問合せ情報
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inquirySource, setInquirySource] = useState('');
  const [inquiryHearing, setInquiryHearing] = useState('');
  const [inquiryConfidence, setInquiryConfidence] = useState('');
  
  // 希望条件
  const [desiredArea, setDesiredArea] = useState('');
  const [desiredPropertyType, setDesiredPropertyType] = useState('');
  const [budget, setBudget] = useState('');
  
  // 内覧情報
  const [latestViewingDate, setLatestViewingDate] = useState('');
  const [viewingTime, setViewingTime] = useState('');
  const [followUpAssignee, setFollowUpAssignee] = useState('');
  const [viewingResultFollowUp, setViewingResultFollowUp] = useState('');
  
  // その他
  const [latestStatus, setLatestStatus] = useState('');
  const [preViewingNotes, setPreViewingNotes] = useState('');
  const [viewingNotes, setViewingNotes] = useState('');

  useEffect(() => {
    if (propertyNumber) {
      fetchPropertyInfo(propertyNumber);
    }
  }, [propertyNumber]);

  const fetchPropertyInfo = async (propNum: string) => {
    setLoadingProperty(true);
    try {
      const response = await api.get(`/api/property-listings/${propNum}`);
      setPropertyInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch property info:', error);
      setPropertyInfo(null);
    } finally {
      setLoadingProperty(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      setError('氏名は必須です');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const buyerData = {
        name,
        phone_number: phoneNumber,
        email,
        property_number: propertyNumberField,
        reception_date: receptionDate,
        inquiry_source: inquirySource,
        inquiry_hearing: inquiryHearing,
        inquiry_confidence: inquiryConfidence,
        desired_area: desiredArea,
        desired_property_type: desiredPropertyType,
        budget,
        latest_viewing_date: latestViewingDate,
        viewing_time: viewingTime,
        follow_up_assignee: followUpAssignee,
        viewing_result_follow_up: viewingResultFollowUp,
        latest_status: latestStatus,
        pre_viewing_notes: preViewingNotes,
        viewing_notes: viewingNotes,
      };

      await api.post('/api/buyers', buyerData);
      
      // 物件番号がある場合は物件詳細ページに戻る
      if (propertyNumberField) {
        navigate(`/property-listings/${propertyNumberField}`);
      } else {
        navigate('/buyers');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '買主の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            if (propertyNumberField) {
              navigate(`/property-listings/${propertyNumberField}`);
            } else {
              navigate('/buyers');
            }
          }}
          sx={{ mb: 2 }}
        >
          {propertyNumberField ? '物件詳細に戻る' : '買主リストに戻る'}
        </Button>
        <Typography variant="h5" fontWeight="bold">新規買主登録</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 左側: 物件情報 */}
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            label="物件番号"
            value={propertyNumberField}
            onChange={(e) => {
              setPropertyNumberField(e.target.value);
              if (e.target.value) {
                fetchPropertyInfo(e.target.value);
              } else {
                setPropertyInfo(null);
              }
            }}
            sx={{ mb: 2 }}
          />

          {loadingProperty && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {propertyInfo && !loadingProperty && (
            <PropertyInfoCard
              propertyId={propertyNumberField}
              showCloseButton={false}
              themeColor="buyer"
            />
          )}

          {!propertyInfo && !loadingProperty && propertyNumberField && (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">物件情報が見つかりませんでした</Typography>
            </Paper>
          )}

          {!propertyNumberField && (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">物件番号を入力すると物件情報が表示されます</Typography>
            </Paper>
          )}
        </Grid>

        {/* 右側: 買主入力フォーム */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* 基本情報 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>基本情報</Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="氏名・会社名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="電話番号"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="メールアドレス"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Grid>

                {/* 問合せ情報 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>問合せ情報</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="受付日"
                    type="date"
                    value={receptionDate}
                    onChange={(e) => setReceptionDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText="自動で今日の日付が入力されます"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    fullWidth
                    options={INQUIRY_SOURCE_OPTIONS}
                    groupBy={(option) => option.category}
                    getOptionLabel={(option) => option.label}
                    value={INQUIRY_SOURCE_OPTIONS.find(opt => opt.value === inquirySource) || null}
                    onChange={(_, newValue) => setInquirySource(newValue?.value || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="問合せ元"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="問合時ヒアリング"
                    multiline
                    rows={4}
                    value={inquiryHearing}
                    onChange={(e) => setInquiryHearing(e.target.value)}
                    placeholder="ヒアリング内容を入力してください"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="問合時確度"
                    value={inquiryConfidence}
                    onChange={(e) => setInquiryConfidence(e.target.value)}
                    placeholder="例: A, B, C, S"
                  />
                </Grid>

                {/* 希望条件 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>希望条件</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="希望エリア"
                    value={desiredArea}
                    onChange={(e) => setDesiredArea(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="希望種別"
                    value={desiredPropertyType}
                    onChange={(e) => setDesiredPropertyType(e.target.value)}
                    placeholder="例: 戸建て、マンション"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="予算"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="例: 3000万円"
                  />
                </Grid>

                {/* 内覧情報 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>内覧情報</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="内覧日（最新）"
                    type="date"
                    value={latestViewingDate}
                    onChange={(e) => setLatestViewingDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="時間"
                    value={viewingTime}
                    onChange={(e) => setViewingTime(e.target.value)}
                    placeholder="例: 14:00"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="後続担当"
                    value={followUpAssignee}
                    onChange={(e) => setFollowUpAssignee(e.target.value)}
                    placeholder="例: Y, K"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="内覧結果・後続対応"
                    multiline
                    rows={3}
                    value={viewingResultFollowUp}
                    onChange={(e) => setViewingResultFollowUp(e.target.value)}
                  />
                </Grid>

                {/* その他 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>その他</Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="最新状況"
                    value={latestStatus}
                    onChange={(e) => setLatestStatus(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="内覧前伝達事項"
                    multiline
                    rows={3}
                    value={preViewingNotes}
                    onChange={(e) => setPreViewingNotes(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="内覧メモ"
                    multiline
                    rows={3}
                    value={viewingNotes}
                    onChange={(e) => setViewingNotes(e.target.value)}
                  />
                </Grid>

                {/* ボタン */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        if (propertyNumberField) {
                          navigate(`/property-listings/${propertyNumberField}`);
                        } else {
                          navigate('/buyers');
                        }
                      }}
                      disabled={loading}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                    >
                      {loading ? '登録中...' : '登録'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
