/**
 * SyncConflictDialog - 同期競合ダイアログコンポーネント
 * 
 * スプレッドシートとの競合が検出された場合に表示するダイアログです。
 * ユーザーは上書きまたはキャンセルを選択できます。
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Box,
} from '@mui/material';
import {
  Warning as WarningIcon,
} from '@mui/icons-material';

export interface ConflictInfo {
  fieldName: string;
  dbValue: any;
  spreadsheetValue: any;
  expectedValue: any;
}

interface SyncConflictDialogProps {
  open: boolean;
  conflicts: ConflictInfo[];
  onForceOverwrite: () => void;
  onCancel: () => void;
  loading?: boolean;
}

// フィールド名の日本語マッピング
const fieldNameLabels: Record<string, string> = {
  name: '氏名・会社名',
  phone_number: '電話番号',
  email: 'メールアドレス',
  line_id: 'LINE',
  nickname: 'ニックネーム',
  company_name: '法人名',
  current_residence: '現住居',
  initial_assignee: '初動担当',
  follow_up_assignee: '後続担当',
  reception_date: '受付日',
  inquiry_source: '問合せ元',
  inquiry_hearing: '問合時ヒアリング',
  inquiry_confidence: '問合時確度',
  latest_viewing_date: '内覧日(最新)',
  latest_status: '★最新状況',
  viewing_result_follow_up: '内覧結果・後続対応',
  next_call_date: '次電日',
  desired_timing: '希望時期',
  desired_area: 'エリア',
  desired_property_type: '希望種別',
  desired_building_age: '築年数',
  desired_floor_plan: '間取り',
  budget: '予算',
  special_notes: '特記事項',
  message_to_assignee: '担当への伝言/質問事項',
};

const getFieldLabel = (fieldName: string): string => {
  return fieldNameLabels[fieldName] || fieldName;
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '(空)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

export const SyncConflictDialog: React.FC<SyncConflictDialogProps> = ({
  open,
  conflicts,
  onForceOverwrite,
  onCancel,
  loading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        <Typography variant="h6">同期競合が検出されました</Typography>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          スプレッドシートのデータが変更されています。
          以下のフィールドで競合が検出されました。
        </Alert>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>フィールド</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>あなたの変更</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>スプレッドシートの値</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>変更前の値</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conflicts.map((conflict, index) => (
                <TableRow key={index}>
                  <TableCell>{getFieldLabel(conflict.fieldName)}</TableCell>
                  <TableCell sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                    {formatValue(conflict.dbValue)}
                  </TableCell>
                  <TableCell sx={{ color: 'error.main' }}>
                    {formatValue(conflict.spreadsheetValue)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {formatValue(conflict.expectedValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            「強制上書き」を選択すると、あなたの変更でスプレッドシートを上書きします。
            「キャンセル」を選択すると、変更を破棄します。
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          disabled={loading}
        >
          キャンセル
        </Button>
        <Button
          onClick={onForceOverwrite}
          variant="contained"
          color="warning"
          disabled={loading}
        >
          {loading ? '処理中...' : '強制上書き'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SyncConflictDialog;
