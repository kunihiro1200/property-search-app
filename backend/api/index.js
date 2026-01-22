"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const supabase_js_1 = require("@supabase/supabase-js");
const PropertyListingService_1 = require("../src/services/PropertyListingService");
const PropertyImageService_1 = require("../src/services/PropertyImageService");
const GoogleDriveService_1 = require("../src/services/GoogleDriveService");
// import publicPropertiesRoutes from '../src/routes/publicProperties';
const app = (0, express_1.default)();
// 環境変数のデバッグログ
console.log('🔍 Environment variables check:', {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? `Set (${process.env.SUPABASE_SERVICE_KEY.length} chars)` : 'Missing',
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? `Set (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} chars)` : 'Missing',
    GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
});
// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// PropertyListingServiceの初期化（ローカル環境と同じ）
const propertyListingService = new PropertyListingService_1.PropertyListingService();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: '*', // 公開サイトなので全てのオリジンを許可
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// テスト用：publicPropertiesRoutesが読み込めているか確認
app.get('/api/test/routes', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'publicPropertiesRoutes commented out for testing',
        timestamp: new Date().toISOString()
    });
});
// ⚠️ 重要: publicPropertiesRoutes を先に登録（より具体的なルートを優先）
// app.use('/api/public', publicPropertiesRoutes);
// 公開物件一覧取得（全ての物件を取得、atbb_statusはバッジ表示用）
app.get('/api/public/properties', async (req, res) => {
    try {
        console.log('🔍 Fetching properties from database...');
        // クエリパラメータを取得
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const propertyNumber = req.query.propertyNumber;
        const location = req.query.location;
        const types = req.query.types;
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;
        const minAge = req.query.minAge ? parseInt(req.query.minAge) : undefined;
        const maxAge = req.query.maxAge ? parseInt(req.query.maxAge) : undefined;
        const showPublicOnly = req.query.showPublicOnly === 'true';
        console.log('📊 Query params:', { limit, offset, propertyNumber, location, types, minPrice, maxPrice, minAge, maxAge, showPublicOnly });
        // 価格範囲のバリデーション
        let priceFilter;
        if (minPrice !== undefined || maxPrice !== undefined) {
            priceFilter = {};
            if (minPrice !== undefined) {
                priceFilter.min = minPrice * 10000; // 万円を円に変換
            }
            if (maxPrice !== undefined) {
                priceFilter.max = maxPrice * 10000; // 万円を円に変換
            }
        }
        // 物件タイプフィルター
        let propertyTypeFilter;
        if (types) {
            propertyTypeFilter = types.split(',');
        }
        // 築年数範囲のバリデーション
        let buildingAgeRange;
        if (minAge !== undefined || maxAge !== undefined) {
            buildingAgeRange = {};
            if (minAge !== undefined) {
                buildingAgeRange.min = minAge;
            }
            if (maxAge !== undefined) {
                buildingAgeRange.max = maxAge;
            }
        }
        // PropertyListingServiceを使用（ローカル環境と同じ）
        const result = await propertyListingService.getPublicProperties({
            limit,
            offset,
            propertyType: propertyTypeFilter,
            priceRange: priceFilter,
            location,
            propertyNumber,
            buildingAgeRange,
            showPublicOnly,
        });
        console.log(`✅ Found ${result.properties?.length || 0} properties (total: ${result.pagination.total})`);
        res.json({
            success: true,
            properties: result.properties || [],
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error('❌ Error fetching properties:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch properties',
            details: 'Failed to fetch properties from database',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// 公開物件詳細取得（atbb_statusでフィルタリングしない）
app.get('/api/public/properties/:propertyIdentifier', async (req, res) => {
    try {
        const { propertyIdentifier } = req.params;
        console.log(`🔍 Fetching property details for: ${propertyIdentifier}`);
        // UUIDか物件番号かを判定（UUIDは36文字のハイフン付き形式）
        const isUuid = propertyIdentifier.length === 36 && propertyIdentifier.includes('-');
        // データベースから物件詳細を取得（atbb_statusでフィルタリングしない）
        let query = supabase
            .from('property_listings')
            .select('*');
        if (isUuid) {
            query = query.eq('id', propertyIdentifier);
        }
        else {
            query = query.eq('property_number', propertyIdentifier);
        }
        const { data: property, error } = await query.single();
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Property not found'
            });
        }
        console.log(`✅ Found property: ${propertyIdentifier} (${property.property_number})`);
        // image_urlをimagesに変換（JSON配列または単一文字列に対応）
        let images = [];
        if (property.image_url) {
            try {
                // JSON配列としてパースを試みる
                images = JSON.parse(property.image_url);
            }
            catch (e) {
                // パースに失敗した場合は単一の文字列として扱う
                // 空文字列でない場合のみ配列に追加
                if (property.image_url.trim()) {
                    images = [property.image_url];
                }
            }
        }
        res.json({
            success: true,
            property: {
                ...property,
                images
            }
        });
    }
    catch (error) {
        console.error('❌ Error fetching property details:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Failed to fetch property details from database'
        });
    }
});
// 公開物件の完全な詳細情報取得（物件番号またはUUIDで取得）
app.get('/api/public/properties/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[Complete API] Fetching complete data for: ${id}`);
        // 物件情報を取得
        const property = await propertyListingService.getPublicPropertyById(id);
        if (!property) {
            console.error(`[Complete API] Property not found: ${id}`);
            return res.status(404).json({ message: 'Property not found' });
        }
        console.log(`[Complete API] Found property: ${property.property_number}`);
        // PropertyDetailsServiceを動的インポート
        const { PropertyDetailsService } = await Promise.resolve().then(() => __importStar(require('../src/services/PropertyDetailsService')));
        const propertyDetailsService = new PropertyDetailsService();
        let dbDetails;
        try {
            dbDetails = await propertyDetailsService.getPropertyDetails(property.property_number);
            console.log(`[Complete API] PropertyDetailsService returned:`, {
                has_favorite_comment: !!dbDetails.favorite_comment,
                has_recommended_comments: !!dbDetails.recommended_comments,
                has_athome_data: !!dbDetails.athome_data,
                has_property_about: !!dbDetails.property_about
            });
        }
        catch (error) {
            console.error(`[Complete API] Error calling PropertyDetailsService:`, error);
            dbDetails = {
                property_number: property.property_number,
                favorite_comment: null,
                recommended_comments: null,
                athome_data: null,
                property_about: null
            };
        }
        // 決済日を取得（成約済みの場合のみ）
        let settlementDate = null;
        const isSold = property.atbb_status === '成約済み' || property.atbb_status === 'sold';
        if (isSold) {
            try {
                const { PropertyService } = await Promise.resolve().then(() => __importStar(require('../src/services/PropertyService')));
                const propertyService = new PropertyService();
                settlementDate = await propertyService.getSettlementDate(property.property_number);
            }
            catch (err) {
                console.error('[Complete API] Settlement date error:', err);
            }
        }
        // パノラマURLを取得
        let panoramaUrl = null;
        try {
            const { PanoramaUrlService } = await Promise.resolve().then(() => __importStar(require('../src/services/PanoramaUrlService')));
            const panoramaUrlService = new PanoramaUrlService();
            panoramaUrl = await panoramaUrlService.getPanoramaUrl(property.property_number);
            console.log(`[Complete API] Panorama URL: ${panoramaUrl || '(not found)'}`);
        }
        catch (err) {
            console.error('[Complete API] Panorama URL error:', err);
        }
        // レスポンスを返す
        res.json({
            property,
            favoriteComment: dbDetails.favorite_comment,
            recommendedComments: dbDetails.recommended_comments,
            athomeData: dbDetails.athome_data,
            settlementDate,
            propertyAbout: dbDetails.property_about,
            panoramaUrl,
        });
    }
    catch (error) {
        console.error('[Complete API] Error:', error);
        console.error('[Complete API] Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
        });
        res.status(500).json({
            message: 'Failed to fetch complete property data',
            error: error.message
        });
    }
});
// 物件番号ベースの画像一覧取得エンドポイント（publicPropertiesRoutesの代替）
app.get('/api/public/properties/:identifier/images', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { includeHidden = 'false' } = req.query;
        console.log(`🖼️ Fetching images for: ${identifier}`);
        // UUIDの形式かどうかをチェック
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUUID = uuidRegex.test(identifier);
        // 物件情報を取得
        let property;
        if (isUUID) {
            property = await propertyListingService.getPublicPropertyById(identifier);
        }
        else {
            property = await propertyListingService.getPublicPropertyByNumber(identifier);
        }
        if (!property) {
            console.error(`❌ Property not found: ${identifier}`);
            return res.status(404).json({ error: 'Property not found' });
        }
        console.log(`✅ Found property: ${property.property_number} (${property.id})`);
        // storage_locationを優先的に使用
        let storageUrl = property.storage_location;
        // storage_locationが空の場合、property.athome_dataから取得
        if (!storageUrl && property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 0) {
            // athome_dataの最初の要素がフォルダURL
            storageUrl = property.athome_data[0];
            console.log(`[Images API] Using athome_data as storage_url: ${storageUrl}`);
        }
        if (!storageUrl) {
            console.error(`❌ No storage URL found for property: ${identifier}`);
            return res.status(404).json({
                error: 'Storage URL not found',
                message: '画像の格納先URLが設定されていません'
            });
        }
        // PropertyImageServiceを使用して画像を取得
        const propertyImageService = new PropertyImageService_1.PropertyImageService(60, // cacheTTLMinutes
        parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10), parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10), parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10));
        const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
        // 非表示画像リストを取得
        const hiddenImages = await propertyListingService.getHiddenImages(property.id);
        // includeHiddenがfalseの場合、非表示画像をフィルタリング
        let filteredImages = result.images;
        if (includeHidden !== 'true' && hiddenImages.length > 0) {
            filteredImages = result.images.filter(img => !hiddenImages.includes(img.id));
        }
        console.log(`✅ Found ${filteredImages.length} images (${hiddenImages.length} hidden)`);
        // キャッシュヘッダーを設定（1時間）
        res.set('Cache-Control', 'public, max-age=3600');
        res.json({
            ...result,
            images: filteredImages,
            totalCount: result.images.length,
            visibleCount: filteredImages.length,
            hiddenCount: hiddenImages.length,
            hiddenImages: includeHidden === 'true' ? hiddenImages : undefined
        });
    }
    catch (error) {
        console.error('❌ Error fetching property images:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Failed to fetch images'
        });
    }
});
// 画像プロキシエンドポイント（Google Driveの画像をバックエンド経由で取得）
// サムネイル用
app.get('/api/public/images/:fileId/thumbnail', async (req, res) => {
    try {
        const { fileId } = req.params;
        console.log(`🖼️ Proxying thumbnail image: ${fileId}`);
        // GoogleDriveServiceを使用して画像データを取得
        const driveService = new GoogleDriveService_1.GoogleDriveService();
        const imageData = await driveService.getImageData(fileId);
        if (!imageData) {
            console.error(`❌ Image not found: ${fileId}`);
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }
        // キャッシュヘッダーとCORSヘッダーを設定（1日間キャッシュ）
        res.set({
            'Content-Type': imageData.mimeType,
            'Content-Length': imageData.size,
            'Cache-Control': 'public, max-age=86400', // 1日間キャッシュ
            'Access-Control-Allow-Origin': '*', // CORS対応
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        // 画像データを返す
        res.send(imageData.buffer);
        console.log(`✅ Thumbnail image proxied successfully: ${fileId}`);
    }
    catch (error) {
        console.error('❌ Error proxying thumbnail image:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to proxy image from Google Drive',
            details: 'Failed to proxy image from Google Drive'
        });
    }
});
// フル画像用
app.get('/api/public/images/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        console.log(`🖼️ Proxying full image: ${fileId}`);
        // GoogleDriveServiceを使用して画像データを取得
        const driveService = new GoogleDriveService_1.GoogleDriveService();
        const imageData = await driveService.getImageData(fileId);
        if (!imageData) {
            console.error(`❌ Image not found: ${fileId}`);
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }
        // キャッシュヘッダーとCORSヘッダーを設定（1日間キャッシュ）
        res.set({
            'Content-Type': imageData.mimeType,
            'Content-Length': imageData.size,
            'Cache-Control': 'public, max-age=86400', // 1日間キャッシュ
            'Access-Control-Allow-Origin': '*', // CORS対応
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        // 画像データを返す
        res.send(imageData.buffer);
        console.log(`✅ Full image proxied successfully: ${fileId}`);
    }
    catch (error) {
        console.error('❌ Error proxying full image:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
        });
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to proxy image from Google Drive',
            details: 'Failed to proxy image from Google Drive'
        });
    }
});
// 概算書PDF生成（物件番号で生成）
app.post('/api/public/properties/:propertyNumber/estimate-pdf', async (req, res) => {
    try {
        const { propertyNumber } = req.params;
        console.log(`[Estimate PDF] Starting for property: ${propertyNumber}`);
        // PropertyServiceを動的インポート
        const { PropertyService } = await Promise.resolve().then(() => __importStar(require('../src/services/PropertyService')));
        const propertyService = new PropertyService();
        // 概算書PDFを生成
        const pdfUrl = await propertyService.generateEstimatePdf(propertyNumber);
        console.log(`[Estimate PDF] Generated PDF URL: ${pdfUrl}`);
        res.json({
            success: true,
            pdfUrl
        });
    }
    catch (error) {
        console.error('[Estimate PDF] Error:', error);
        console.error('[Estimate PDF] Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message || '概算書の生成に失敗しました'
        });
    }
});
// パノラマURL取得（物件番号で取得）
app.get('/api/public/properties/:propertyNumber/panorama-url', async (req, res) => {
    try {
        const { propertyNumber } = req.params;
        console.log(`[Panorama URL] Fetching for property: ${propertyNumber}`);
        // PanoramaUrlServiceを動的インポート
        const { PanoramaUrlService } = await Promise.resolve().then(() => __importStar(require('../src/services/PanoramaUrlService')));
        const panoramaUrlService = new PanoramaUrlService();
        // パノラマURLを取得
        const panoramaUrl = await panoramaUrlService.getPanoramaUrl(propertyNumber);
        if (panoramaUrl) {
            console.log(`[Panorama URL] Found: ${panoramaUrl}`);
            res.json({
                success: true,
                panoramaUrl,
            });
        }
        else {
            console.log(`[Panorama URL] Not found for property: ${propertyNumber}`);
            res.json({
                success: true,
                panoramaUrl: null,
            });
        }
    }
    catch (error) {
        console.error('[Panorama URL] Error:', error);
        console.error('[Panorama URL] Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message || 'パノラマURLの取得に失敗しました',
        });
    }
});
// 環境変数チェックエンドポイント（デバッグ用）
app.get('/api/check-env', (_req, res) => {
    const envCheck = {
        SUPABASE_URL: process.env.SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 設定済み' : '❌ 未設定',
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ 設定済み' : '❌ 未設定',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定',
        NODE_ENV: process.env.NODE_ENV || '未設定',
    };
    res.status(200).json({
        message: 'Environment Variables Check',
        env: envCheck,
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            retryable: false,
        },
    });
});
// Vercel用のハンドラー（重要：これがないとVercelで動作しない）
// Vercelのサーバーレス関数として動作させるため、Expressアプリをラップ
exports.default = async (req, res) => {
    // Expressアプリにリクエストを渡す
    return app(req, res);
};
