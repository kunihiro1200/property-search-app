import { Button } from '@mui/material';

interface PriceReductionCompleteButtonProps {
  onClick: () => void;
  disabled: boolean;
  sending: boolean;
}

export default function PriceReductionCompleteButton({
  onClick,
  disabled,
  sending,
}: PriceReductionCompleteButtonProps) {
  return (
    <Button
      variant="contained"
      onClick={onClick}
      disabled={disabled}
      fullWidth
      sx={{
        backgroundColor: '#2e7d32',
        '&:hover': {
          backgroundColor: '#1b5e20',
        },
        mb: 2,
        fontSize: '1.1rem',
        fontWeight: 'bold',
      }}
    >
      {sending ? '送信中...' : '✓ 予約値下げ完了'}
    </Button>
  );
}
