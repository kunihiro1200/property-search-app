import { Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText, Typography, Box } from '@mui/material';
import { EmailTemplate } from '../utils/gmailDistributionTemplates';
import SenderAddressSelector from './SenderAddressSelector';

interface EmailTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: EmailTemplate) => void;
  templates: EmailTemplate[];
  senderAddress: string;
  onSenderAddressChange: (address: string) => void;
  employees: any[];
}

export default function EmailTemplateSelector({
  open,
  onClose,
  onSelect,
  templates,
  senderAddress,
  onSenderAddressChange,
  employees
}: EmailTemplateSelectorProps) {
  const handleSelect = (template: EmailTemplate) => {
    onSelect(template);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>メールテンプレートを選択</DialogTitle>
      <DialogContent>
        {/* 送信元選択ドロップダウン */}
        <Box sx={{ mb: 3, mt: 2 }}>
          <SenderAddressSelector
            value={senderAddress}
            onChange={onSenderAddressChange}
            employees={employees}
          />
        </Box>

        <List>
          {templates.map((template) => (
            <ListItemButton
              key={template.id}
              onClick={() => handleSelect(template)}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mb: 1,
                '&:hover': {
                  bgcolor: '#f5f5f5'
                }
              }}
            >
              <ListItemText
                primary={template.name}
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">
                      件名: {template.subject}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {template.body.substring(0, 50)}...
                    </Typography>
                  </>
                }
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
