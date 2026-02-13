import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface MessageTemplate {
  category: string;
  type: string;
  subject: string;
  body: string;
}

interface MessageTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  recipientEmail: string;
  propertyNumber?: string;
  propertyData?: {
    property_number?: string;
    address?: string;
    display_address?: string;
    price?: number;
    seller_name?: string;
    seller_contact?: string;
    property_type?: string;
    land_area?: number;
    building_area?: number;
    structure?: string;
    construction_year_month?: string;
    floor_plan?: string;
    owner_info?: string;
  };
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  base64: string;
}

export default function MessageTemplateDialog({
  open,
  onClose,
  recipientEmail,
  propertyNumber,
  propertyData,
}: MessageTemplateDialogProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/message-templates', {
        params: { category: '物件' },
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const template = templates.find((t) => t.type === type);
    if (template) {
      // テンプレート変数を物件データで置換
      let replacedSubject = template.subject;
      let replacedBody = template.body;
      
      if (propertyData) {
        // 物件番号
        if (propertyData.property_number) {
          replacedSubject = replacedSubject.replace(/<<物件番号>>/g, propertyData.property_number);
          replacedBody = replacedBody.replace(/<<物件番号>>/g, propertyData.property_number);
        }
        
        // 所在地
        const address = propertyData.address || '';
        replacedSubject = replacedSubject.replace(/<<所在地>>/g, address);
        replacedBody = replacedBody.replace(/<<所在地>>/g, address);
        
        // 住居表示（ATBB登録住所）
        const displayAddress = propertyData.display_address || '';
        replacedSubject = replacedSubject.replace(/<<住居表示（ATBB登録住所）>>/g, displayAddress);
        replacedBody = replacedBody.replace(/<<住居表示（ATBB登録住所）>>/g, displayAddress);
        
        // 価格
        const priceText = propertyData.price ? `${propertyData.price.toLocaleString()}円` : '';
        replacedSubject = replacedSubject.replace(/<<価格>>/g, priceText);
        replacedBody = replacedBody.replace(/<<価格>>/g, priceText);
        
        // 売主名
        replacedSubject = replacedSubject.replace(/<<売主名>>/g, propertyData.seller_name || '');
        replacedBody = replacedBody.replace(/<<売主名>>/g, propertyData.seller_name || '');
        
        // 売主連絡先
        replacedSubject = replacedSubject.replace(/<<売主連絡先>>/g, propertyData.seller_contact || '');
        replacedBody = replacedBody.replace(/<<売主連絡先>>/g, propertyData.seller_contact || '');
        
        // ●所有者情報
        replacedSubject = replacedSubject.replace(/<<●所有者情報>>/g, propertyData.owner_info || '');
        replacedBody = replacedBody.replace(/<<●所有者情報>>/g, propertyData.owner_info || '');
        
        // 物件種別
        replacedSubject = replacedSubject.replace(/<<物件種別>>/g, propertyData.property_type || '');
        replacedBody = replacedBody.replace(/<<物件種別>>/g, propertyData.property_type || '');
        
        // 土地面積
        const landAreaText = propertyData.land_area ? `${propertyData.land_area}㎡` : '';
        replacedSubject = replacedSubject.replace(/<<土地面積>>/g, landAreaText);
        replacedBody = replacedBody.replace(/<<土地面積>>/g, landAreaText);
        
        // 建物面積
        const buildingAreaText = propertyData.building_area ? `${propertyData.building_area}㎡` : '';
        replacedSubject = replacedSubject.replace(/<<建物面積>>/g, buildingAreaText);
        replacedBody = replacedBody.replace(/<<建物面積>>/g, buildingAreaText);
        
        // 構造
        replacedSubject = replacedSubject.replace(/<<構造>>/g, propertyData.structure || '');
        replacedBody = replacedBody.replace(/<<構造>>/g, propertyData.structure || '');
        
        // 築年月
        replacedSubject = replacedSubject.replace(/<<築年月>>/g, propertyData.construction_year_month || '');
        replacedBody = replacedBody.replace(/<<築年月>>/g, propertyData.construction_year_month || '');
        
        // 間取り
        replacedSubject = replacedSubject.replace(/<<間取り>>/g, propertyData.floor_plan || '');
        replacedBody = replacedBody.replace(/<<間取り>>/g, propertyData.floor_plan || '');
      }
      
      setSubject(replacedSubject);
      setBody(replacedBody);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} は10MBを超えているため添付できません`);
        continue;
      }

      // Base64に変換
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // data:image/png;base64, の部分を削除
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      newFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        base64,
      });
    }

    setAttachedFiles([...attachedFiles, ...newFiles]);
    
    // inputをリセット
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (!subject || !body) {
      alert('件名と本文を入力してください');
      return;
    }

    setSending(true);
    try {
      await api.post('/api/emails/send', {
        to: recipientEmail,
        subject,
        body,
        attachments: attachedFiles.map(file => ({
          filename: file.name,
          content: file.base64,
          encoding: 'base64',
        })),
      });

      alert('メールを送信しました');
      onClose();
      
      // リセット
      setSelectedType('');
      setSubject('');
      setBody('');
      setAttachedFiles([]);
    } catch (error: any) {
      console.error('Failed to send email:', error);
      alert(error.response?.data?.error || 'メール送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>売主へメール送信</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              宛先: {recipientEmail}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>テンプレート種別</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
                label="テンプレート種別"
              >
                <MenuItem value="">
                  <em>選択してください</em>
                </MenuItem>
                {templates.map((template) => (
                  <MenuItem key={template.type} value={template.type}>
                    {template.type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="件名"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="本文"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              rows={10}
              sx={{ mb: 2 }}
            />
            
            {/* 添付ファイル */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">添付ファイル</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AttachFileIcon />}
                  component="label"
                >
                  ファイルを選択
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={handleFileSelect}
                  />
                </Button>
              </Box>
              
              {attachedFiles.length > 0 && (
                <List dense>
                  {attachedFiles.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={file.name}
                        secondary={formatFileSize(file.size)}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Typography variant="caption" color="text.secondary">
                ※ 1ファイルあたり最大10MBまで
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          キャンセル
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!subject || !body || sending}
          startIcon={sending ? <CircularProgress size={16} /> : null}
        >
          {sending ? '送信中...' : '送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
