import React from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

interface Property {
  id: string;
  seller_number: string;
  address: string;
  city: string | null;
  google_map_url: string | null;
}

interface PropertyDataWarningsProps {
  property: Property;
  distributionAreas?: string[];
  onFixGoogleMapUrl?: () => void;
  onExtractCity?: () => void;
}

export const PropertyDataWarnings: React.FC<PropertyDataWarningsProps> = ({
  property,
  distributionAreas = [],
  onFixGoogleMapUrl,
  onExtractCity
}) => {
  const hasGoogleMapUrl = !!property.google_map_url && property.google_map_url.trim() !== '';
  const hasCity = !!property.city && property.city.trim() !== '';
  const hasDistributionAreas = distributionAreas.length > 0;

  // No warnings needed if everything is complete
  if (hasGoogleMapUrl && hasCity && hasDistributionAreas) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {!hasGoogleMapUrl && (
        <MissingGoogleMapUrlWarning onFixClick={onFixGoogleMapUrl} />
      )}
      
      {!hasCity && (
        <MissingCityFieldWarning 
          property={property}
          onExtractClick={onExtractCity} 
        />
      )}
      
      {(!hasGoogleMapUrl || !hasCity) && (
        <IncompleteDistributionAreasWarning />
      )}
    </Box>
  );
};

interface MissingGoogleMapUrlWarningProps {
  onFixClick?: () => void;
}

export const MissingGoogleMapUrlWarning: React.FC<MissingGoogleMapUrlWarningProps> = ({
  onFixClick
}) => {
  return (
    <Alert 
      severity="warning" 
      icon={<WarningIcon />}
      sx={{ mb: 1 }}
      action={
        onFixClick && (
          <Button color="inherit" size="small" onClick={onFixClick}>
            設定する
          </Button>
        )
      }
    >
      <AlertTitle>Google Map URLが未設定です</AlertTitle>
      距離ベースの配信エリア(①-⑦)を計算できません。
      Google Map URLを設定してください。
    </Alert>
  );
};

interface MissingCityFieldWarningProps {
  property: Property;
  onExtractClick?: () => void;
}

export const MissingCityFieldWarning: React.FC<MissingCityFieldWarningProps> = ({
  property,
  onExtractClick
}) => {
  return (
    <Alert 
      severity="warning" 
      icon={<WarningIcon />}
      sx={{ mb: 1 }}
      action={
        onExtractClick && (
          <Button color="inherit" size="small" onClick={onExtractClick}>
            自動抽出
          </Button>
        )
      }
    >
      <AlertTitle>市フィールドが未設定です</AlertTitle>
      市全体エリア(㊵大分市、㊶別府市)を計算できません。
      {property.address && '住所から自動抽出できます。'}
    </Alert>
  );
};

export const IncompleteDistributionAreasWarning: React.FC = () => {
  return (
    <Alert 
      severity="info" 
      icon={<InfoIcon />}
      sx={{ mb: 1 }}
    >
      <AlertTitle>配信エリアが不完全な可能性があります</AlertTitle>
      必須データが揃っていないため、一部のエリアが計算されていない可能性があります。
      上記の警告を解決すると、配信エリアが自動的に再計算されます。
    </Alert>
  );
};

export default PropertyDataWarnings;
