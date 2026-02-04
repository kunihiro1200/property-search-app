import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

/**
 * 住所から座標を取得（ジオコーディング）
 * GET /api/geocoding?address=住所
 */
router.get('/', async (req: Request, res: Response) => {
  console.log('🗺️ [Geocoding API] Request received:', req.query);
  
  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      console.log('🗺️ [Geocoding API] Missing address parameter');
      return res.status(400).json({
        error: 'address parameter is required',
      });
    }

    console.log('🗺️ [Geocoding API] Geocoding address:', address);

    // Google Geocoding APIを呼び出す
    const geocodingUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(geocodingUrl, {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ja',
        region: 'JP',
      },
      timeout: 5000, // 5秒タイムアウト
    });

    console.log('🗺️ [Geocoding API] Google API response status:', response.data.status);

    if (response.data.status !== 'OK') {
      console.warn('🗺️ [Geocoding API] Geocoding failed:', response.data.status, address);
      return res.status(404).json({
        error: 'Address not found',
        status: response.data.status,
      });
    }

    const location = response.data.results[0].geometry.location;
    
    console.log('🗺️ [Geocoding API] Success:', location);
    
    res.json({
      lat: location.lat,
      lng: location.lng,
      formatted_address: response.data.results[0].formatted_address,
    });
  } catch (error: any) {
    console.error('🗺️ [Geocoding API] Error:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Geocoding request timeout',
      });
    }
    
    res.status(500).json({
      error: 'Failed to geocode address',
      message: error.message,
    });
  }
});

export default router;
