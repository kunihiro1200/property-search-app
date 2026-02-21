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
import { SECTION_COLORS } from '../theme/sectionColors';

interface WorkTaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  propertyNumber: string | null;
  onUpdate?: () => void;
}

interface WorkTaskData {
  id: string;
  property_number: string;
  property_type: string;
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
  site_registration_comment: string;
  site_registration_requestor: string;
  storage_url: string;
  cw_request_email_site: string;
  cw_person: string;
  property_list_row_added: string;
  property_file: string;
  email_distribution: string;
  distribution_date: string;
  publish_scheduled_date: string;
  floor_plan: string;
  floor_plan_request_date: string;
  floor_plan_due_date: string;
  floor_plan_completed_date: string;
  floor_plan_confirmer: string;
  floor_plan_comment: string;
  floor_plan_ok_comment: string;
  floor_plan_revision_count: number;
  floor_plan_stored_email: string;
  cw_request_email_floor_plan: string;
  cw_request_email_2f_above: string;
  direction_symbol: string;
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
  const workTaskColor = SECTION_COLORS.workTask;
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<WorkTaskData | null>(null);
  const [editedData, setEditedData] = useState<Partial<WorkTaskData>>({});
  const [activeStaffInitials, setActiveStaffInitials] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  useEffect(() => {
    if (open && propertyNumber) {
      fetchData();
      setEditedData({});
    }
  }, [open, propertyNumber]);

  useEffect(() => {
    // 通常スタッフのイニシャルを取得
    const fetchActiveStaff = async () => {
      try {
        const response = await api.get('/api/employees/active-initials');
        setActiveStaffInitials(response.data.initials || []);
      } catch (error) {
        console.error('Failed to fetch active staff initials:', error);
      }
    };
    fetchActiveStaff();
  }, []);

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
              onClick={() => handleFieldChange(field, opt)}
              sx={getValue(field) === opt ? {
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
              {opt}
            </Button>
          ))}
        </ButtonGroup>
      </Grid>
    </Grid>
  );

  // 編集可能ボタン選択（送信回数用）
  const EditableSendCountSelect = ({ label, field }: { label: string; field: string }) => (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
      </Grid>
      <Grid item xs={8}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={getValue(field) === 'TRUE' ? 'contained' : 'outlined'}
            onClick={() => handleFieldChange(field, 'TRUE')}
            fullWidth
            sx={getValue(field) === 'TRUE' ? {
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
            size="small"
            variant={getValue(field) === 'FALSE' ? 'contained' : 'outlined'}
            onClick={() => handleFieldChange(field, 'FALSE')}
            fullWidth
            sx={getValue(field) === 'FALSE' ? {
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
        </Box>
      </Grid>
    </Grid>
  );

  // 単一ボタン（パノラマ用）
  const EditableSingleButton = ({ label, field, buttonLabel }: { label: string; field: string; buttonLabel: string }) => (
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

  // Yes/No選択（TRUE/FALSEにも対応）
  const EditableYesNo = ({ label, field }: { label: string; field: string }) => {
    const currentValue = getValue(field);
    // Y, TRUE, true, "TRUE", "true" を「Y」として扱う
    const isYes = currentValue === 'Y' || 
                  currentValue === 'TRUE' || 
                  currentValue === 'true' || 
                  currentValue === true ||
                  (typeof currentValue === 'string' && currentValue.toUpperCase() === 'TRUE');
    // N, FALSE, false, "FALSE", "false" を「N」として扱う
    const isNo = currentValue === 'N' || 
                 currentValue === 'FALSE' || 
                 currentValue === 'false' || 
                 currentValue === false ||
                 (typeof currentValue === 'string' && currentValue.toUpperCase() === 'FALSE');
    
    return (
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{label}</Typography>
        </Grid>
        <Grid item xs={8}>
          <ButtonGroup size="small" variant="outlined" fullWidth>
            <Button
              variant={isYes ? 'contained' : 'outlined'}
              onClick={() => handleFieldChange(field, 'Y')}
              sx={isYes ? {
                bgcolor: workTaskColor.main,
                color: workTaskColor.contrastText,
                '&:hover': {
                  bgcolor: workTaskColor.dark,
                }
              } : {
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >Y</Button>
            <Button
              variant={isNo ? 'contained' : 'outlined'}
              onClick={() => handleFieldChange(field, 'N')}
              sx={isNo ? {
                bgcolor: workTaskColor.main,
                color: workTaskColor.contrastText,
                '&:hover': {
                  bgcolor: workTaskColor.dark,
                }
              } : {
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >N</Button>
          </ButtonGroup>
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
  const SiteRegistrationSection = () => {
    // サイト登録納期予定日の自動計算（今日から2日後）
    const calculateDueDate = () => {
      const today = new Date();
      today.setDate(today.getDate() + 2);
      return today.toISOString().split('T')[0];
    };

    // サイト登録確認が「完了」かどうか
    const isSiteRegistrationCompleted = getValue('site_registration_confirmed') === '完了';

    return (
      <Box sx={{ p: 2 }}>
        {/* サイト登録締め日（一番上） */}
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
        <EditableButtonSelect label="サイト登録依頼者" field="site_registration_requestor" options={activeStaffInitials} />
        <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              サイト登録納期予定日
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                type="date"
                value={formatDateForInput(getValue('site_registration_due_date'))}
                onChange={(e) => handleFieldChange('site_registration_due_date', e.target.value || null)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleFieldChange('site_registration_due_date', calculateDueDate())}
                sx={{ whiteSpace: 'nowrap' }}
              >
                今日+2日
              </Button>
            </Box>
          </Grid>
        </Grid>
        <EditableField label="物件一覧に行追加" field="property_list_row_added" />

        {/* 【図面作成依頼】グループ */}
        <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
          【図面作成依頼】
        </Typography>
        <EditableButtonSelect label="間取図" field="floor_plan" options={['クラウドワークス', '他', '不要']} />
        <EditableButtonSelect label="方位記号" field="direction_symbol" options={['確認済', '不要（営業相談済）']} />
        <EditableMultilineField label="コメント（間取図関係）" field="floor_plan_comment" />
        <EditableSendCountSelect label="CWの方へ依頼メール（間取り、区画図）" field="cw_request_email_floor_plan" />
        <EditableSendCountSelect label="CWの方へ依頼メール（2階以上）" field="cw_request_email_2f_above" />
        <EditableField label="間取図完了予定" field="floor_plan_due_date" type="date" />

        {/* 【図面確認】グループ（赤色） */}
        <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'error.main' }}>
          【図面確認】
        </Typography>
        <EditableButtonSelect label="間取図確認者" field="floor_plan_confirmer" options={activeStaffInitials} />
        <Grid container spacing={2} alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, pt: 1 }}>間取図確認OK/修正コメント</Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              size="small"
              value={getValue('floor_plan_ok_comment') || '図面OKです'}
              onChange={(e) => handleFieldChange('floor_plan_ok_comment', e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="図面OKです"
            />
          </Grid>
        </Grid>
        <EditableButtonSelect label="間取図修正回数（当社の依頼ミスのみ）" field="floor_plan_revision_count" options={['1', '2', '3', '4']} />
        <EditableField label="間取図完了日" field="floor_plan_completed_date" type="date" />
        <EditableSendCountSelect label="間取図格納済み連絡メール" field="floor_plan_stored_email" />

        {/* 【サイト登録確認】グループ（赤色） */}
        <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: 'error.main' }}>
          【サイト登録確認】
        </Typography>
        <EditableButtonSelect label="サイト登録確認" field="site_registration_confirmed" options={['確認中', '完了', '他']} />
        <Grid container spacing={2} alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, pt: 1 }}>サイト登録確認OKコメント</Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              size="small"
              value={getValue('site_registration_ok_comment') || '確認完了いたしました。'}
              onChange={(e) => handleFieldChange('site_registration_ok_comment', e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="確認完了いたしました。"
            />
          </Grid>
        </Grid>
        <EditableSingleButton label="パノラマ完了" field="panorama_completed" buttonLabel="完了" />
        {/* サイト登録確認者（サイト登録確認が「完了」の場合のみ表示） */}
        {isSiteRegistrationCompleted && (
          <EditableButtonSelect label="サイト登録確認者" field="site_registration_confirmer" options={activeStaffInitials} />
        )}

        {/* 【確認後処理】グループ（紫色） */}
        <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold', color: '#9c27b0' }}>
          【確認後処理】
        </Typography>
        <EditableField label="配信日" field="distribution_date" type="date" />
        <EditableButtonSelect label="物件ファイル" field="property_file" options={['担当に渡し済み', '未']} />
        <EditableField label="公開予定日" field="publish_scheduled_date" type="date" />
        <EditableField label="メール配信" field="email_distribution" />
        <EditableButtonSelect label="物件一覧に行追加" field="property_list_row_added" options={['追加済', '未']} />
        {/* サイト登録締め日（コピー表示） */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              サイト登録締め日
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant="body2" sx={{ py: 1 }}>
              {formatDateForInput(getValue('site_registration_deadline')) || '（未設定）'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  };

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

  // イニシャル→フィールド名マッピング
  const getAssigneeChatFieldName = (assignee: string): string => {
    const mapping: { [key: string]: string } = {
      'K': 'kunihiro_chat',
      'Y': 'yamamoto_chat',
      'U': 'ura_chat',
      'H': 'kadoi_chat',
      '久': 'kadoi_chat',
      'I': 'kunihiro_chat',
      '生': 'kunihiro_chat',
      'R': 'yamamoto_chat',
    };
    return mapping[assignee] || 'property_assignee_chat';
  };

  // 契約決済セクション（要件書11章の順序に従う）
  const ContractSettlementSection = () => {
    // 担当者チャットフィールド表示判定
    const assignee = getValue('sales_assignee');
    const showAssigneeChat = assignee && assignee !== '' && assignee !== null;
    const assigneeChatField = showAssigneeChat ? getAssigneeChatFieldName(assignee) : '';

    return (
      <Box sx={{ p: 2 }}>
        {/* 1. 売買契約締め日 */}
        <EditableField label="売買契約締め日" field="sales_contract_deadline" type="date" />
        
        {/* 2. 売買契約確認（位置変更） */}
        <EditableButtonSelect label="売買契約確認" field="sales_contract_confirmed" options={['確認中', '確認OK', '他']} />
        
        {/* 3. 売買契約備考 */}
        <EditableField label="売買契約備考" field="sales_contract_notes" />
        
        {/* 4. 売買資料ドライブ（新規追加） */}
        <EditableField label="売買資料ドライブ" field="sales_materials_drive" type="url" />
        
        {/* 5. 契約形態 */}
        <EditableField label="契約形態" field="contract_type" />
        
        {/* 6. ☆ CW（浅沼様）全エリア・種別依頼OK（表示のみ） */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
              ☆ CW（浅沼様）全エリア・種別依頼OK
            </Typography>
          </Grid>
        </Grid>
        
        {/* 7. 重説・契約書入力納期* */}
        <EditableField label="重説・契約書入力納期*" field="contract_input_deadline" type="date" />
        
        {/* 8. 依頼前に確認 */}
        <EditableMultilineField label="依頼前に確認" field="pre_request_check" />
        
        {/* 9. コメント（売買契約） */}
        <EditableMultilineField label="コメント（売買契約）" field="sales_contract_comment" />
        
        {/* 10. 広瀬さんへ依頼（売買契約関連） */}
        <EditableYesNo label="広瀬さんへ依頼（売買契約関連）" field="hirose_request_sales" />
        
        {/* 11. CWへ依頼（売買契約関連） */}
        <EditableYesNo label="CWへ依頼（売買契約関連）" field="cw_request_sales" />
        
        {/* 12. 社員が契約書作成（activeStaffInitialsを使用） */}
        <EditableButtonSelect label="社員が契約書作成" field="employee_contract_creation" options={activeStaffInitials} />
        
        {/* 13. 作業内容 */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>作業内容</Typography>
          </Grid>
          <Grid item xs={8}>
            <ButtonGroup size="small" variant="outlined">
              <Button
                variant={getValue('work_content') === '書類取得のみ' ? 'contained' : 'outlined'}
                onClick={() => handleFieldChange('work_content', '書類取得のみ')}
                sx={getValue('work_content') === '書類取得のみ' ? {
                  bgcolor: workTaskColor.main,
                  color: workTaskColor.contrastText,
                  '&:hover': { bgcolor: workTaskColor.dark }
                } : {}}
              >書類取得のみ</Button>
              <Button
                variant={getValue('work_content') === '入力のみ' ? 'contained' : 'outlined'}
                onClick={() => handleFieldChange('work_content', '入力のみ')}
                sx={getValue('work_content') === '入力のみ' ? {
                  bgcolor: workTaskColor.main,
                  color: workTaskColor.contrastText,
                  '&:hover': { bgcolor: workTaskColor.dark }
                } : {}}
              >入力のみ</Button>
              <Button
                variant={getValue('work_content') === '両方' ? 'contained' : 'outlined'}
                onClick={() => handleFieldChange('work_content', '両方')}
                sx={getValue('work_content') === '両方' ? {
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' }
                } : {}}
              >両方</Button>
            </ButtonGroup>
          </Grid>
        </Grid>
        
        {/* 14. 作業完了コメント（新規追加） */}
        <EditableMultilineField label="作業完了コメント" field="work_completed_comment" />
        
        {/* 15. 作業完了チャット（廣瀬）（条件付き表示） */}
        {getValue('hirose_request_sales') === 'Y' && (
          <EditableMultilineField label="作業完了チャット（廣瀬）" field="hirose_completed_chat_sales" />
        )}
        
        {/* 16. CWへ完了チャット（条件付き表示） */}
        {getValue('cw_request_sales') === 'Y' && (
          <EditableMultilineField label="CWへ完了チャット" field="cw_completed_chat_sales" />
        )}
        
        {/* 17. 売買契約担当（作業完了チャットの下に移動） */}
        <EditableButtonSelect label="売買契約担当" field="sales_contract_assignee" options={ASSIGNEE_OPTIONS} />
        
        {/* 18. 完了コメント（売買関連）（新規追加） */}
        <EditableMultilineField label="完了コメント（売買関連）" field="completed_comment_sales" />
        
        {/* 19. 製本予定日 */}
        <EditableField label="製本予定日" field="binding_scheduled_date" type="date" />
        
        {/* 20. 製本完了 */}
        <EditableField label="製本完了" field="binding_completed" />
        
        {/* 21. 売・支払方法 */}
        <EditableButtonSelect label="売・支払方法" field="seller_payment_method" options={['振込', '現金', '他']} />
        
        {/* 22. 買・支払方法 */}
        <EditableButtonSelect label="買・支払方法" field="buyer_payment_method" options={['振込', '現金', '他']} />
        
        {/* 23. 仲介手数料（売） */}
        <EditableField label="仲介手数料（売）" field="brokerage_fee_seller" type="number" />
        
        {/* 24. 仲介手数料（買） */}
        <EditableField label="仲介手数料（買）" field="brokerage_fee_buyer" type="number" />
        
        {/* 25. 売買価格 */}
        <EditableField label="売買価格" field="sales_price" type="number" />
        
        {/* 26. キャンペーン */}
        <EditableButtonSelect label="キャンペーン" field="campaign" options={['あり', 'なし']} />
        
        {/* 27. 減額理由他 */}
        <EditableField label="減額理由他" field="discount_reason_other" />
        
        {/* 28. 紹介チラシ渡し */}
        <EditableField label="紹介チラシ渡し" field="referral_flyer_given" />
        
        {/* 29. 口コミ（売主） */}
        <EditableField label="口コミ（売主）" field="review_seller" />
        
        {/* 30. 口コミ（買主） */}
        <EditableField label="口コミ（買主）" field="review_buyer" />
        
        {/* 31. 他コメント */}
        <EditableField label="他コメント" field="other_comments" />
        
        {/* 32. 決済完了チャット */}
        <EditableField label="決済完了チャット" field="settlement_completed_chat" />
        
        {/* 33. 台帳作成済み（日付フィールド） */}
        <EditableField label="台帳作成済み" field="ledger_created" type="date" />
        
        {/* 34. 入金確認（売） */}
        <EditableButtonSelect label="入金確認（売）" field="payment_confirmed_seller" options={['確認済み', '未']} />
        
        {/* 35. 入金確認（買） */}
        <EditableButtonSelect label="入金確認（買）" field="payment_confirmed_buyer" options={['確認済み', '未']} />
        
        {/* 36. 経理確認済み */}
        <EditableButtonSelect label="経理確認済み" field="accounting_confirmed" options={['未', '済']} />
        
        {/* 37. 担当者チャット送信（新規追加、条件付き表示） */}
        {showAssigneeChat && (
          <EditableYesNo label={`${assignee}へチャット送信`} field={assigneeChatField} />
        )}
      </Box>
    );
  };

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
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={() => {
                if (propertyNumber) {
                  navigator.clipboard.writeText(propertyNumber);
                  setSnackbar({ open: true, message: `物件番号 ${propertyNumber} をコピーしました`, severity: 'success' });
                }
              }}
              title="クリックでコピー"
            >
              業務詳細 - {propertyNumber || ''}
            </Typography>
            {data && (
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                {data.property_type && `${data.property_type}　`}
                {data.property_address && `${data.property_address}　`}
                {data.sales_assignee && `担当：${data.sales_assignee}　`}
                {data.seller_name && `売主名：${data.seller_name}`}
              </Typography>
            )}
          </Box>
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
              '& .Mui-selected': { color: workTaskColor.main },
              '& .MuiTabs-indicator': { backgroundColor: workTaskColor.main },
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
            disabled={!hasChanges || saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            sx={{
              bgcolor: workTaskColor.main,
              color: workTaskColor.contrastText,
              '&:hover': {
                bgcolor: workTaskColor.dark,
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
                color: 'action.disabled',
              }
            }}
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
