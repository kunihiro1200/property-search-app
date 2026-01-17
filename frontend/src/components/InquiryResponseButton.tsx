import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { PropertyListing } from '../utils/propertyListingStatusUtils';
import { InquiryResponseEmailModal } from './InquiryResponseEmailModal';

interface InquiryResponseButtonProps {
  selectedProperties: PropertyListing[];
  onSuccess?: () => void;
}

export const InquiryResponseButton: React.FC<InquiryResponseButtonProps> = ({
  selectedProperties,
  onSuccess,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (selectedProperties.length === 0) {
      alert('物件を選択してください');
      return;
    }
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<EmailIcon />}
        onClick={handleClick}
        disabled={selectedProperties.length === 0}
      >
        問い合わせ返信
        {selectedProperties.length > 0 && ` (${selectedProperties.length}件)`}
      </Button>

      <InquiryResponseEmailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedProperties={selectedProperties}
        onSuccess={handleSuccess}
      />
    </>
  );
};
