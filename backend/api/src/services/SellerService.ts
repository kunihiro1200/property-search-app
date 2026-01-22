import { BaseRepository } from '../repositories/BaseRepository';
import {
  Seller,
  PropertyInfo,
  CreateSellerRequest,
  UpdateSellerRequest,
  ListSellersParams,
  PaginatedResult,
  SellerStatus,
} from '../types';
import { encrypt, decrypt } from '../utils/encryption';

export class SellerService extends BaseRepository {
  /**
   * 売主を登録
   */
  async createSeller(data: CreateSellerRequest, employeeId: string): Promise<Seller> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 個人情報を暗号化
      const encryptedData = {
        name: encrypt(data.name),
        address: encrypt(data.address),
        phoneNumber: encrypt(data.phoneNumber),
        email: data.email ? encrypt(data.email) : null,
      };

      // 売主を作成
      const sellerResult = await client.query<Seller>(
        `INSERT INTO sellers (name, address, phone_number, email, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          encryptedData.name,
          encryptedData.address,
          encryptedData.phoneNumber,
          encryptedData.email,
          SellerStatus.FOLLOWING_UP,
        ]
      );

      const seller = sellerResult.rows[0];

      // 物件情報を作成
      await client.query(
        `INSERT INTO properties (
          seller_id, address, prefecture, city, property_type,
          land_area, building_area, build_year, structure,
          floors, rooms, parking, additional_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          seller.id,
          data.property.address,
          data.property.prefecture,
          data.property.city,
          data.property.propertyType,
          data.property.landArea,
          data.property.buildingArea,
          data.property.buildYear,
          data.property.structure,
          data.property.floors,
          data.property.rooms,
          data.property.parking,
          data.property.additionalInfo,
        ]
      );

      await client.query('COMMIT');

      // 復号化して返す
      return this.decryptSeller(seller);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 売主情報を取得
   */
  async getSeller(sellerId: string): Promise<Seller | null> {
    const seller = await this.queryOne<Seller>(
      'SELECT * FROM sellers WHERE id = $1',
      [sellerId]
    );

    if (!seller) {
      return null;
    }

    // 物件情報も取得
    const property = await this.queryOne<PropertyInfo>(
      'SELECT * FROM properties WHERE seller_id = $1',
      [sellerId]
    );

    const decryptedSeller = this.decryptSeller(seller);
    
    // 物件情報を含める
    if (property) {
      decryptedSeller.property = property;
    }

    return decryptedSeller;
  }

  /**
   * 売主番号で売主を取得
   */
  async getSellerByNumber(sellerNumber: string): Promise<Seller | null> {
    const seller = await this.queryOne<Seller>(
      'SELECT * FROM sellers WHERE seller_number = $1',
      [sellerNumber]
    );

    if (!seller) {
      return null;
    }

    // 物件情報も取得
    const property = await this.queryOne<PropertyInfo>(
      'SELECT * FROM properties WHERE seller_id = $1',
      [seller.id]
    );

    const decryptedSeller = this.decryptSeller(seller);
    
    // 物件情報を含める
    if (property) {
      decryptedSeller.property = property;
    }

    return decryptedSeller;
  }

  /**
   * 売主情報を更新
   */
  async updateSeller(
    sellerId: string,
    data: UpdateSellerRequest
  ): Promise<Seller> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 暗号化が必要なフィールド
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(encrypt(data.name));
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(encrypt(data.address));
    }
    if (data.phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(encrypt(data.phoneNumber));
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email ? encrypt(data.email) : null);
    }

    // 暗号化不要なフィールド
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.confidence !== undefined) {
      updates.push(`confidence = $${paramIndex++}`);
      values.push(data.confidence);
    }
    if (data.assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(data.assignedTo);
    }
    if (data.nextCallDate !== undefined) {
      updates.push(`next_call_date = $${paramIndex++}`);
      values.push(data.nextCallDate);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(sellerId);

    const seller = await this.queryOne<Seller>(
      `UPDATE sellers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!seller) {
      throw new Error('Seller not found');
    }

    return this.decryptSeller(seller);
  }

  /**
   * 売主リストを取得（ページネーション、フィルタ対応）
   */
  async listSellers(params: ListSellersParams): Promise<PaginatedResult<Seller>> {
    const { 
      page = 1, 
      pageSize = 50, 
      status, 
      assignedTo, 
      nextCallDateFrom, 
      nextCallDateTo, 
      searchQuery,
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = params;

    // 検索クエリがある場合は、searchSellers を使用
    if (searchQuery) {
      const searchResults = await this.searchSellers(searchQuery);
      
      // フィルタを適用
      let filteredResults = searchResults;
      
      if (status) {
        filteredResults = filteredResults.filter(s => s.status === status);
      }
      if (assignedTo) {
        filteredResults = filteredResults.filter(s => s.assignedTo === assignedTo);
      }
      if (nextCallDateFrom) {
        filteredResults = filteredResults.filter(s => 
          s.nextCallDate && new Date(s.nextCallDate) >= new Date(nextCallDateFrom)
        );
      }
      if (nextCallDateTo) {
        filteredResults = filteredResults.filter(s => 
          s.nextCallDate && new Date(s.nextCallDate) <= new Date(nextCallDateTo)
        );
      }

      // ページネーション
      const total = filteredResults.length;
      const offset = (page - 1) * pageSize;
      const paginatedResults = filteredResults.slice(offset, offset + pageSize);

      return {
        data: paginatedResults,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // フィルタ条件を構築
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      values.push(assignedTo);
    }
    if (nextCallDateFrom) {
      conditions.push(`next_call_date >= $${paramIndex++}`);
      values.push(nextCallDateFrom);
    }
    if (nextCallDateTo) {
      conditions.push(`next_call_date <= $${paramIndex++}`);
      values.push(nextCallDateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 総件数を取得
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM sellers ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // ページネーション
    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);

    // データを取得
    const sellers = await this.queryMany<Seller>(
      `SELECT * FROM sellers ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      values
    );

    // 復号化
    const decryptedSellers = sellers.map((seller: Seller) => this.decryptSeller(seller));

    return {
      data: decryptedSellers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 売主を検索（部分一致）
   */
  async searchSellers(query: string): Promise<Seller[]> {
    // 暗号化されたデータは検索できないため、全件取得して復号化後に検索
    // 本番環境では検索用の別テーブルやElasticsearchの使用を推奨
    const sellers = await this.queryMany<Seller>(
      'SELECT * FROM sellers ORDER BY created_at DESC LIMIT 1000'
    );

    const decryptedSellers = sellers.map((seller: Seller) => this.decryptSeller(seller));

    // 復号化後に部分一致検索
    const lowerQuery = query.toLowerCase();
    return decryptedSellers.filter(
      (seller: Seller) =>
        seller.name.toLowerCase().includes(lowerQuery) ||
        seller.address.toLowerCase().includes(lowerQuery) ||
        seller.phoneNumber.toLowerCase().includes(lowerQuery) ||
        (seller.sellerNumber && seller.sellerNumber.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 売主データを復号化
   */
  private decryptSeller(seller: Seller): Seller {
    return {
      ...seller,
      name: decrypt(seller.name),
      address: decrypt(seller.address),
      phoneNumber: decrypt(seller.phoneNumber),
      email: seller.email ? decrypt(seller.email) : undefined,
    };
  }
}
