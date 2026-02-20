import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  ButtonGroup,
  Grid,
  CircularProgress,
  Link,
  Snackbar,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import api from '../services/api';

interface WorkTaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  propertyNumber: string | null;
  onUpdate?: () => void;
}

interface WorkTaskData {
  id: string;
  property_number: string;
  property_address: string;
  seller_name: string;
  spreadsheet_url: string;
  sales_assignee: string;
  mediation_type: string;
  mediation_deadline: string;
  mediation_completed: string;
  mediation_creator: string;
  mediation_notes: string;
  on_hold: string;
  site_registration_deadline: string;
  site_registration_request_date: string;
  site_registration_due_date: string;
  site_registration_confirmed: string;
  site_registration_confirmer: string;
  floor_plan: string;
  floor_plan_request_date: string;
  floor_plan_due_date: string;
  floor_plan_completed_date: string;
  floor_plan_confirmer: string;
  panorama: string;
  panorama_completed: string;
  site_notes: string;
  sales_contract_confirmed: string;
  completed_comment_sales: string;
  binding_scheduled_date: string;
  binding_completed: string;
  seller_payment_method: string;
  brokerage_fee_seller: number;
  standard_brokerage_fee_seller: number;
  campaign: string;
  discount_reason_other: string;
  referral_flyer_given: string;
  review_seller: string;
  review_buyer: string;
  other_comments: string;
  settlement_completed_chat: string;
  ledger_created: string;
  payment_confirmed_seller: string;
  accounting_confirmed: string;
  ura_chat: string;
  judicial_scrivener: string;
  judicial_scrivener_contact: string;
  broker: string;
  broker_contact: string;
  [key: string]: any;
}

const ASSIGNEE_OPTIONS = ['K', 'Y', 'I', '生', 'U', 'R', '久', 'H'];

export default function WorkTaskDetailModal({ open, onClose, propertyNumber, onUpdate }: WorkTaskDetailModalProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<WorkTaskData | null>(null);
  const [editedData, setEditedData] = useState<Partial<WorkTaskData>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  useEffect(() => {
    if (open && propertyNumber) {
      fetchData();
      setEditedData({});
    }
  }, [open, propertyNumber]);

  const fetchData = async () => {
    if (!propertyNumber) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/work-tasks/${propertyNumber}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch work task:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    setSaving(true);
    try {
      await api.put(`/api/work-tasks/${propertyNumber}`, editedData);
      setSnackbar({ open: true, message: '保存しました', severity: 'success' });
      await fetchData();
      setEditedData({});
      onUpdate?.();
    } catch (error) {
      console.error('Failed to save:', error);
      setSnackbar({ open: true, message: '保存に失敗しました', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const getValue = (field: string) => {
    return editedData[field] !== undefined ? editedData[field] : data?.[field];
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const hasChanges = Object.keys(editedData).length > 0;

  // 編集可能テキストフィールド
  const EditableField = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      </Grid>
      <Grid item xs={8}>
        {type === 'date' ? (
          <TextField
            size="small"
            type="date"
            value={formatDateForInput(getValue(field))}
            onChange={(e) => handleFieldChange(field, e.target.value || null)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        ) : type === 'number' ? (
          <TextField
            size="small"
            type="number"
            value={getValue(field) || ''}
            onChange={(e) => handleFieldChange(field, e.target.value ? Number(e.target.value) : null)}
            fullWidth
          />
        ) : type === 'url' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              value={getValue(field) || ''}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              fullWidth
            />
            {getValue(field) && (
              <Link href={getValue(field)} target="_blank" rel="noopener" sx={{ whiteSpace: 'nowrap' }}>開く</Link>
            )}
          </Box>
        ) : (
          <TextField
            size="small"
            value={getValue(field) || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            fullWidth
          />
        )}
      </Grid>
    </Grid>
  );

  // 編集可能ボタン選択
  const EditableButtonSelect = ({ label, field, options }: { label: string; field: string; options: string[] }) => (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      </Grid>
      <Grid item xs={8}>
        <ButtonGroup size="small" variant="outlined" fullWidth>
          {options.map((opt) => (
            <Button
              key={opt}
              variant={getValue(field) === opt ? 'contained' : 'outlined'}
              color={getValue(field) === opt ? 'primary' : 'inherit'}
              onClick={() => handleFieldChange(field, opt)}
            >
              {opt}
            </Button>
          ))}
        </ButtonGroup>
      </Grid>
    </Grid>
  );
  // 編集可能ボタン選択（送信回数用）
  const EditableSendCountSelect = ({ label, field }: { label: string; field: string }) => {
    const workTaskColor = { main: '#1976d2', dark: '#115293', contrastText: '#fff' };
    return (
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
        </Grid>
        <Grid item xs={8}>
          <ButtonGroup size="small" variant="outlined" fullWidth>
            <Button
              variant={getValue(field) === '送信1' ? 'contained' : 'outlined'}
              onClick={() => handleFieldChange(field, '送信1')}
              sx={getValue(field) === '送信1' ? {
                bgcolor: workTaskColor.main,
                color: workTaskColor.contrastText,
                '&:hover': {
                  bgcolor: workTaskColor.dark,
                }
              } : {
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >送信1</Button>
            <Button
              variant={getValue(field) === '送信2' ? 'contained' : 'outlined'}
              onClick={() => handleFieldChange(field, '送信2')}
              sx={getValue(field) === '送信2' ? {
                bgcolor: workTaskColor.main,
                color: workTaskColor.contrastText,
                '&:hover': {
                  bgcolor: workTaskColor.dark,
                }
              } : {
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >送信2</Button>
          </ButtonGroup>
        </Grid>
      </Grid>
    );
  };

  // Yes/No選択
  const EditableYesNo = ({ label, field }: { label: string; field: string }) => (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      </Grid>
      <Grid item xs={8}>
        <ButtonGroup size="small" variant="outlined" fullWidth>
          <Button
            variant={getValue(field) === 'Y' ? 'contained' : 'outlined'}
            color={getValue(field) === 'Y' ? 'primary' : 'inherit'}
            onClick={() => handleFieldChange(field, 'Y')}
          >Y</Button>
          <Button
            variant={getValue(field) === 'N' ? 'contained' : 'outlined'}
            color={getValue(field) === 'N' ? 'inherit' : 'inherit'}
            onClick={() => handleFieldChange(field, 'N')}
          >N</Button>
        </ButtonGroup>
      </Grid>
    </Grid>
  );
  // 単一ボタン（パノラマ用）
  const EditableSingleButton = ({ label, field, buttonLabel }: { label: string; field: string; buttonLabel: string }) => {
    const workTaskColor = { main: '#1976d2', dark: '#115293', contrastText: '#fff' };
    return (
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
        </Grid>
        <Grid item xs={8}>
          <Button
            size="small"
            variant={getValue(field) === buttonLabel ? 'contained' : 'outlined'}
            onClick={() => handleFieldChange(field, buttonLabel)}
            fullWidth
            sx={getValue(field) === buttonLabel ? {
              bgcolor: workTaskColor.main,
              color: workTaskColor.contrastText,
              '&:hover': {
                bgcolor: workTaskColor.dark,
              }
            } : {
              borderColor: 'divider',
              color: 'text.secondary',
            }}
          >
            {buttonLabel}
          </Button>
        </Grid>
      </Grid>
    );
  };

  // 媒介契約セクション
  const MediationSection = () => (
    <Box sx={{ p: 2 }}>
      <EditableField label="物件番号" field="property_number" />
      <EditableField label="媒介備考" field="mediation_notes" />
      <EditableField label="物件所在" field="property_address" />
      <EditableField label="売主" field="seller_name" />
      <EditableField label="スプシURL" field="spreadsheet_url" type="url" />
      <EditableButtonSelect label="営業担当" field="sales_assignee" options={ASSIGNEE_OPTIONS} />
      <EditableField label="媒介形態" field="mediation_type" />
      <EditableField label="媒介作成締め日" field="mediation_deadline" type="date" />
      <EditableField label="媒介作成完了" field="mediation_completed" />
      <EditableButtonSelect label="媒介作成者" field="mediation_creator" options={ASSIGNEE_OPTIONS} />
      <EditableYesNo label="保留" field="on_hold" />
    </Box>
  );

  // サイト登録セクション
  const SiteRegistrationSection = () => (
    <Box sx={{ p: 2 }}>
      <EditableField label="サイト登録締め日" field="site_registration_deadline" type="date" />
      
      {/* 【サイト登録依頼】グループ */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
        【サイト登録依頼】
      </Typography>
      <EditableField label="サイト備考" field="site_notes" />
      <EditableField label="格納先URL" field="storage_url" type="url" />
      <EditableSendCountSelect label="CWの方へ依頼メール（サイト登録）" field="cw_request_email_site" />
      <EditableField label="CWの方" field="cw_person" />
      <EditableMultilineField label="コメント（サイト登録）" field="site_registration_comment" />
      <EditableSingleButton label="パノラマ" field="panorama" buttonLabel="あり" />
      <EditableField label="パノラマ完了" field="panorama_completed" />
      <EditableField label="サイト登録依頼日" field="site_registration_request_date" type="date" />
      <EditableField label="サイト登録納期予定日" field="site_registration_due_date" type="date" />
      <EditableField label="物件ファイル" field="property_file" />
      <EditableField label="物件一覧に行追加" field="property_list_row_added" />
      
      {/* 【図面作成依頼】グループ */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
        【図面作成依頼】
      </Typography>
      <EditableField label="間取図" field="floor_plan" />
      <EditableField label="方位記号" field="direction_symbol" />
      <EditableMultilineField label="コメント（間取図関係）" field="floor_plan_comment" />
      <EditableSendCountSelect label="CWの方へ依頼メール（間取り、区画図）" field="cw_request_email_floor_plan" />
      <EditableSendCountSelect label="CWの方へ依頼メール（2階以上）" field="cw_request_email_2f_above" />
      <EditableField label="間取図完了予定" field="floor_plan_due_date" type="date" />
      
      {/* 【図面確認】グループ（赤色） */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'error.main' }}>
        【図面確認】
      </Typography>
      <EditableButtonSelect label="間取図確認者" field="floor_plan_confirmer" options={ASSIGNEE_OPTIONS} />
      <EditableField label="間取図修正回数" field="floor_plan_revision_count" />
      <EditableField label="間取図確認OK" field="floor_plan_confirmed_ok" />
      <EditableField label="間取図完了日" field="floor_plan_completed_date" type="date" />
      <EditableField label="間取図格納済み連絡メール" field="floor_plan_stored_email" />
      
      {/* 【サイト登録確認】グループ（赤色） */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'error.main' }}>
        【サイト登録確認】
      </Typography>
      <EditableField label="サイト登録確認" field="site_registration_confirmed" />
      <EditableButtonSelect label="サイト登録確認者" field="site_registration_confirmer" options={ASSIGNEE_OPTIONS} />
      <EditableField label="サイト登録確認OK" field="site_registration_confirmed_ok" />
      {getValue('site_registration_confirmed_ok') && (
        <EditableMultilineField label="コメント（サイト登録確認OK）" field="site_registration_confirmed_ok_comment" />
      )}
      
      {/* 【確認後処理】グループ */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
        【確認後処理】
      </Typography>
      <EditableField label="配信日" field="distribution_date" type="date" />
    </Box>
  );

  // 複数行テキストフィールド
  const EditableMultilineField = ({ label, field }: { label: string; field: string }) => (
    <Grid container spacing={2} alignItems="flex-start" sx={{ mb: 1.5 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, pt: 1 }}>{label}</Typography>
      </Grid>
      <Grid item xs={8}>
        <TextField
          size="small"
          value={getValue(field) || ''}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          fullWidth
          multiline
          rows={4}
        />
      </Grid>
    </Grid>
  );

  // 契約決済セクション（スクショ通り）
  const ContractSettlementSection = () => (
    <Box sx={{ p: 2 }}>
      <EditableField label="売買契約締め日" field="sales_contract_deadline" type="date" />
      <EditableField label="売買契約備考" field="sales_contract_notes" />
      <EditableField label="契約形態" field="contract_type" />
      {/* CW（浅沼様）全エリア・種別依頼OK - 表示のみ */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
        <Grid item xs={12}>
          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
            ☆ CW（浅沼様）全エリア・種別依頼OK
          </Typography>
        </Grid>
      </Grid>
      <EditableField label="重説・契約書入力納期*" field="contract_input_deadline" type="date" />
      <EditableMultilineField label="依頼前に確認" field="pre_request_check" />
      <EditableField label="コメント（売買契約）" field="sales_contract_comment" />
      <EditableYesNo label="広瀬さんへ依頼（売買契約関連）" field="hirose_request_sales" />
      <EditableYesNo label="CWへ依頼（売買契約関連）" field="cw_request_sales" />
      <EditableButtonSelect label="社員が契約書作成" field="employee_contract_creation" options={ASSIGNEE_OPTIONS} />
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>作業内容</Typography>
        </Grid>
        <Grid item xs={8}>
          <ButtonGroup size="small" variant="outlined">
            <Button
              variant={getValue('work_content') === '書類取得のみ' ? 'contained' : 'outlined'}
              color={getValue('work_content') === '書類取得のみ' ? 'inherit' : 'inherit'}
              onClick={() => handleFieldChange('work_content', '書類取得のみ')}
            >書類取得のみ</Button>
            <Button
              variant={getValue('work_content') === '入力のみ' ? 'contained' : 'outlined'}
              color={getValue('work_content') === '入力のみ' ? 'inherit' : 'inherit'}
              onClick={() => handleFieldChange('work_content', '入力のみ')}
            >入力のみ</Button>
            <Button
              variant={getValue('work_content') === '両方' ? 'contained' : 'outlined'}
              color={getValue('work_content') === '両方' ? 'error' : 'inherit'}
              onClick={() => handleFieldChange('work_content', '両方')}
              sx={getValue('work_content') === '両方' ? { bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } } : {}}
            >両方</Button>
          </ButtonGroup>
        </Grid>
      </Grid>
      <EditableField label="添付資料準備納期" field="attachment_prep_deadline" type="date" />
      <EditableField label="添付資料完了" field="attachment_completed" />
      <EditableField label="添付資料印刷" field="attachment_printed" />
      <EditableField label="製本予定日" field="binding_scheduled_date" type="date" />
      <EditableField label="製本完了" field="binding_completed" />
      <EditableField label="決済日" field="settlement_date" type="date" />
      <EditableField label="決済予定月" field="settlement_scheduled_month" />
      <EditableField label="売買価格" field="sales_price" type="number" />
      <EditableField label="仲介手数料（売）" field="brokerage_fee_seller" type="number" />
      <EditableField label="通常仲介手数料（売）" field="standard_brokerage_fee_seller" type="number" />
      <EditableButtonSelect label="キャンペーン" field="campaign" options={['あり', 'なし']} />
      <EditableField label="減額理由" field="discount_reason" />
      <EditableField label="減額理由他" field="discount_reason_other" />
      <EditableButtonSelect label="売・支払方法" field="seller_payment_method" options={['振込', '現金', '他']} />
      <EditableButtonSelect label="入金確認（売）" field="payment_confirmed_seller" options={['確認済み', '未']} />
      <EditableField label="仲介手数料（買）" field="brokerage_fee_buyer" type="number" />
      <EditableField label="通常仲介手数料（買）" field="standard_brokerage_fee_buyer" type="number" />
      <EditableButtonSelect label="買・支払方法" field="buyer_payment_method" options={['振込', '現金', '他']} />
      <EditableButtonSelect label="入金確認（買）" field="payment_confirmed_buyer" options={['確認済み', '未']} />
      <EditableButtonSelect label="経理確認済み" field="accounting_confirmed" options={['未', '済']} />
    </Box>
  );

  // 司法書士・相手側不動産情報セクション
  const JudicialScrivenerSection = () => (
    <Box sx={{ p: 2 }}>
      <EditableField label="司法書士" field="judicial_scrivener" />
      <EditableField label="司法書士連絡先" field="judicial_scrivener_contact" />
      <EditableField label="仲介業者" field="broker" />
      <EditableField label="仲介業者担当連絡先" field="broker_contact" />
    </Box>
  );

  const tabLabels = ['媒介契約', 'サイト登録', '契約決済', '司法書士、相手側不動産情報'];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Typography variant="h6">業務詳細 - {propertyNumber || ''}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { minWidth: 'auto', px: 2 },
              '& .Mui-selected': { color: 'error.main' },
              '& .MuiTabs-indicator': { backgroundColor: 'error.main' },
            }}
          >
            {tabLabels.map((label, index) => (<Tab key={index} label={label} />))}
          </Tabs>
        </Box>
        <DialogContent sx={{ minHeight: 400 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress />
            </Box>
          ) : !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <Typography color="text.secondary">データが見つかりません</Typography>
            </Box>
          ) : (
            <>
              {tabIndex === 0 && <MediationSection />}
              {tabIndex === 1 && <SiteRegistrationSection />}
              {tabIndex === 2 && <ContractSettlementSection />}
              {tabIndex === 3 && <JudicialScrivenerSection />}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">閉じる</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!hasChanges || saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
