import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import api from '../services/api';
import PageNavigation from '../components/PageNavigation';
import { SECTION_COLORS } from '../theme/sectionColors';

interface SharedItem {
  id: string;
  item_number: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  assignee: string | null;
  due_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function SharedItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sharedItemsColor = SECTION_COLORS.sharedItems;
  
  const [item, setItem] = useState<SharedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchSharedItem();
    } else {
      // 新規作成の場合
      setItem({
        id: '',
        item_number: '',
        title: '',
        description: null,
        category: null,
        priority: null,
        status: null,
        assignee: null,
        due_date: null,
        completed_date: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setLoading(false);
    }
  }, [id]);

  const fetchSharedItem = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/shared-items/${id}`);
      setItem(response.data);
    } catch (error) {
      console.error('Failed to fetch shared item:', error);
      setError('共有データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (id === 'new') {
        // 新規作成
        await api.post('/api/shared-items', item);
        setSuccessMessage('共有データを作成しました');
        setTimeout(() => navigate('/shared-items'), 1500);
      } else {
        // 更新
        await api.put(`/api/shared-items/${id}`, item);
        setSuccessMessage('共有データを更新しました');
        await fetchSharedItem();
      }
    } catch (error) {
      console.error('Failed to save shared item:', error);
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SharedItem, value: any) => {
    if (!item) return;
    setItem({ ...item, [field]: value });
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!item) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error">共有データが見つかりませんでした</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: sharedItemsColor.main }}>
          {id === 'new' ? '新規共有項目' : `共有詳細: ${item.item_number}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/shared-items')}
          >
            戻る
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              bgcolor: sharedItemsColor.main,
              '&:hover': { bgcolor: sharedItemsColor.dark },
            }}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </Box>
      </Box>

      <PageNavigation />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="項目番号"
              value={item.item_number || ''}
              onChange={(e) => handleChange('item_number', e.target.value)}
              disabled={id !== 'new'}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="タイトル"
              value={item.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="説明"
              value={item.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              multiline
              rows={4}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="カテゴリ"
              value={item.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="優先度"
              value={item.priority || ''}
              onChange={(e) => handleChange('priority', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ステータス"
              value={item.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="担当者"
              value={item.assignee || ''}
              onChange={(e) => handleChange('assignee', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="期限"
              type="date"
              value={item.due_date ? item.due_date.split('T')[0] : ''}
              onChange={(e) => handleChange('due_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="完了日"
              type="date"
              value={item.completed_date ? item.completed_date.split('T')[0] : ''}
              onChange={(e) => handleChange('completed_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="備考"
              value={item.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              multiline
              rows={4}
            />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
