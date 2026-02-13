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
} from '@mui/material';
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
  };
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
        const address = propertyData.address || propertyData.display_address || '';
        replacedSubject = replacedSubject.replace(/<<所在地>>/g, address);
        replacedBody = replacedBody.replace(/<<所在地>>/g, address);
        
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

  const handleSend = () => {
    // Gmailの作成画面を開く
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    onClose();
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
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!subject || !body}
        >
          Gmailで開く
        </Button>
      </DialogActions>
    </Dialog>
  );
}
