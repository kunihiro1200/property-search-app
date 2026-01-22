// backend/api/index.ts に追加する例

// 画像キャッシュをクリアするエンドポイント（管理者用）
app.post('/api/admin/clear-image-cache/:propertyId?', async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // 認証チェック（実装が必要）
    // const isAdmin = await checkAdminAuth(req);
    // if (!isAdmin) {
    //   return res.status(403).json({ success: false, error: 'Unauthorized' });
    // }
    
    if (propertyId) {
      // 特定の物件のキャッシュをクリア
      console.log(`🗑️ Clearing cache for property: ${propertyId}`);
      propertyListingService['propertyImageService'].clearCache();
      res.json({ 
        success: true, 
        message: `Cache cleared for property ${propertyId}` 
      });
    } else {
      // すべてのキャッシュをクリア
      console.log(`🗑️ Clearing all image cache`);
      propertyListingService['propertyImageService'].clearCache();
      res.json({ 
        success: true, 
        message: 'All image cache cleared' 
      });
    }
  } catch (error: any) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
