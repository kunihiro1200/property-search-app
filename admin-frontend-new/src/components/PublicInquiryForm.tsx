import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inquirySchema, InquiryFormData } from '../schemas/inquirySchema';
import { useSubmitInquiry } from '../hooks/usePublicProperties';
import { ApiError } from '../types/publicProperty';

interface PublicInquiryFormProps {
  propertyId: string;
  propertyAddress: string;
  propertyNumber?: string; // 物件番号を追加
  onSuccess?: () => void;
}

const PublicInquiryForm: React.FC<PublicInquiryFormProps> = ({
  propertyId,
  propertyAddress,
  propertyNumber,
  onSuccess,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
    },
  });

  const submitInquiryMutation = useSubmitInquiry();

  const onSubmit = async (data: InquiryFormData) => {
    setSubmitError(null);
    setRateLimitInfo(null);
    setSubmitSuccess(false);

    try {
      await submitInquiryMutation.mutateAsync({
        property_id: propertyId,
        ...data,
      });

      setSubmitSuccess(true);
      reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Inquiry submission error:', error);
      const apiError = error as ApiError;
      
      // レート制限エラーの場合
      if (apiError.status === 429) {
        const retryAfter = apiError.details?.retryAfter;
        if (retryAfter) {
          const minutes = Math.ceil(retryAfter / 60);
          setRateLimitInfo(
            `送信回数の上限に達しました。${minutes}分後に再度お試しください。`
          );
        } else {
          setRateLimitInfo(
            '送信回数の上限に達しました。しばらくしてから再度お試しください。'
          );
        }
      } else {
        // エラーの詳細をログに出力
        console.error('API Error details:', {
          status: apiError.status,
          message: apiError.message,
          details: apiError.details,
        });
        setSubmitError(
          apiError.message || 
          'お問い合わせの送信に失敗しました。入力内容をご確認の上、再度お試しください。'
        );
      }
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }} className="public-inquiry-form">
      <Typography variant="h6" sx={{ mb: 2 }}>
        この物件についてお問い合わせ
      </Typography>

      {propertyNumber && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
          物件番号: {propertyNumber}
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {propertyAddress}
      </Typography>

      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          お問い合わせを受け付けました。担当者より折り返しご連絡いたします。
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      {rateLimitInfo && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {rateLimitInfo}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* お名前 */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="お名前"
                required
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={submitInquiryMutation.isPending}
                fullWidth
              />
            )}
          />

          {/* メールアドレス */}
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="メールアドレス"
                type="email"
                required
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={submitInquiryMutation.isPending}
                fullWidth
              />
            )}
          />

          {/* 電話番号 */}
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="電話番号"
                type="tel"
                required
                error={!!errors.phone}
                helperText={errors.phone?.message}
                disabled={submitInquiryMutation.isPending}
                fullWidth
              />
            )}
          />

          {/* お問い合わせ内容 */}
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="お問い合わせ内容"
                multiline
                rows={6}
                required
                error={!!errors.message}
                helperText={errors.message?.message}
                disabled={submitInquiryMutation.isPending}
                fullWidth
              />
            )}
          />

          {/* 送信ボタン */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitInquiryMutation.isPending}
            sx={{ 
              mt: 1,
              backgroundColor: '#FFC107',
              color: '#000',
              border: '1px solid #000',
              '&:hover': {
                backgroundColor: '#FFB300',
                borderColor: '#000',
              },
              '&:disabled': {
                backgroundColor: '#E0E0E0',
                color: '#9E9E9E',
                borderColor: '#BDBDBD',
              },
            }}
          >
            {submitInquiryMutation.isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                送信中...
              </>
            ) : (
              'お問い合わせを送信'
            )}
          </Button>
        </Box>
      </form>

      {/* 電話でのお問い合わせボタン */}
      <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #E0E0E0' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          お急ぎの方はお電話でもお問い合わせいただけます
        </Typography>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<PhoneIcon />}
          href="tel:0975332022"
          sx={{
            borderColor: '#4CAF50',
            color: '#4CAF50',
            fontWeight: 'bold',
            '&:hover': {
              borderColor: '#45A049',
              backgroundColor: '#F1F8F4',
            },
          }}
        >
          097-533-2022
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
          10：00～17：30（定休日：水曜日）
        </Typography>
      </Box>
    </Paper>
  );
};

export default PublicInquiryForm;
