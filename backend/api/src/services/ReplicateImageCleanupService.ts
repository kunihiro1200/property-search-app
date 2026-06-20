import Replicate from 'replicate';
import axios from 'axios';

interface CleanupOptions {
  prompt?: string;
  negativePrompt?: string;
  guidanceScale?: number;
  numInferenceSteps?: number;
}

interface CleanupResult {
  success: boolean;
  outputUrl?: string;
  error?: string;
}

export class ReplicateImageCleanupService {
  private replicate: Replicate;

  constructor() {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    
    if (!apiToken) {
      throw new Error('REPLICATE_API_TOKEN is not set in environment variables');
    }

    this.replicate = new Replicate({
      auth: apiToken,
    });
  }

  /**
   * 画像から不要なオブジェクトを除去
   * 注意: このバージョンは画像の品質向上のみを行います
   * 家具などのオブジェクト除去には、手動でマスクを作成する必要があります
   */
  async cleanupImage(
    imageBuffer: Buffer,
    options: CleanupOptions = {}
  ): Promise<CleanupResult> {
    try {
      // 画像をbase64エンコード
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

      console.log('   Replicate APIを呼び出し中...');
      console.log('   ⚠️  注意: 現在は画像の品質向上のみを行います');
      console.log('   家具除去機能は開発中です');
      
      // GFPGAN - 画像品質向上モデル
      // 家具除去には別のアプローチが必要です
      const output = await this.replicate.run(
        'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
        {
          input: {
            img: base64Image,
            version: '1.4',
            scale: 2,
          },
        }
      );

      // 出力URLを取得
      const outputUrl = Array.isArray(output) ? output[0] : output;

      if (typeof outputUrl !== 'string') {
        throw new Error('Unexpected output format from Replicate API');
      }

      return {
        success: true,
        outputUrl,
      };
    } catch (error: any) {
      console.error('Replicate API error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * URLから画像をダウンロード
   */
  async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * バッチ処理: 複数の画像を一括でクリーンアップ
   */
  async cleanupBatch(
    images: Array<{ id: string; buffer: Buffer; name: string }>,
    options: CleanupOptions = {},
    onProgress?: (current: number, total: number, name: string) => void
  ): Promise<Array<{ id: string; result: CleanupResult }>> {
    const results: Array<{ id: string; result: CleanupResult }> = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      if (onProgress) {
        onProgress(i + 1, images.length, image.name);
      }

      const result = await this.cleanupImage(image.buffer, options);
      results.push({ id: image.id, result });

      // レート制限を避けるため、少し待機
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
