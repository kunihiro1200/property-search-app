import { Box, Typography, Grid, TextField } from '@mui/material';

interface PropertyListing {
  land_area?: number;
  building_area?: number;
  exclusive_area?: number;
  structure?: string;
  construction_year_month?: string;
  floor_plan?: string;
  contract_date?: string;
  settlement_date?: string;
}

interface PropertyDetailsSectionProps {
  data: PropertyListing;
  editedData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  isEditMode: boolean;
}

export default function PropertyDetailsSection({
  data,
  editedData,
  onFieldChange,
  isEditMode,
}: PropertyDetailsSectionProps) {
  const getValue = (field: string, defaultValue: any) => {
    return editedData[field] !== undefined ? editedData[field] : (defaultValue || '');
  };

  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined || value === '') return '-';
    return unit ? `${value}${unit}` : value;
  };

  return (
    <Box>
      {isEditMode ? (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              土地面積
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={getValue('land_area', data.land_area)}
              onChange={(e) => onFieldChange('land_area', e.target.value ? Number(e.target.value) : null)}
              InputProps={{ endAdornment: <Typography>㎡</Typography> }}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              建物面積
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={getValue('building_area', data.building_area)}
              onChange={(e) => onFieldChange('building_area', e.target.value ? Number(e.target.value) : null)}
              InputProps={{ endAdornment: <Typography>㎡</Typography> }}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              専有面積
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={getValue('exclusive_area', data.exclusive_area)}
              onChange={(e) => onFieldChange('exclusive_area', e.target.value ? Number(e.target.value) : null)}
              InputProps={{ endAdornment: <Typography>㎡</Typography> }}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              構造
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={getValue('structure', data.structure)}
              onChange={(e) => onFieldChange('structure', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              新築年月
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={getValue('construction_year_month', data.construction_year_month)}
              onChange={(e) => onFieldChange('construction_year_month', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              間取り
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={getValue('floor_plan', data.floor_plan)}
              onChange={(e) => onFieldChange('floor_plan', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              契約日
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={getValue('contract_date', data.contract_date)}
              onChange={(e) => onFieldChange('contract_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              決済日
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={getValue('settlement_date', data.settlement_date)}
              onChange={(e) => onFieldChange('settlement_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              土地面積
            </Typography>
            <Typography variant="body1">
              {formatValue(data.land_area, '㎡')}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              建物面積
            </Typography>
            <Typography variant="body1">
              {formatValue(data.building_area, '㎡')}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              専有面積
            </Typography>
            <Typography variant="body1">
              {formatValue(data.exclusive_area, '㎡')}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              構造
            </Typography>
            <Typography variant="body1">
              {formatValue(data.structure)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              新築年月
            </Typography>
            <Typography variant="body1">
              {formatValue(data.construction_year_month)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              間取り
            </Typography>
            <Typography variant="body1">
              {formatValue(data.floor_plan)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              契約日
            </Typography>
            <Typography variant="body1">
              {formatValue(data.contract_date)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
              決済日
            </Typography>
            <Typography variant="body1">
              {formatValue(data.settlement_date)}
            </Typography>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
