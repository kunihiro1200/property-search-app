/**
 * ContentSummarizer - Consolidate and summarize information from multiple sources
 * 
 * Features:
 * 1. Deduplication of similar content
 * 2. Keyword-based extraction and categorization
 * 3. Intelligent summarization with truncation
 * 4. Category-specific processing
 */

export enum SummaryCategory {
  NEXT_ACTION = 'next_action',
  SITUATION = 'situation',
  OWNER = 'owner',
  TIMING = 'timing',
  REASON = 'reason',
  PROPERTY = 'property',
  CONFIDENCE = 'confidence',
  CONTACT = 'contact',
  PERSONALITY = 'personality',
  PROBLEM = 'problem',
  CONDITION = 'condition',
  OTHER = 'other',
}

export class ContentSummarizer {
  /**
   * Deduplicate content by removing identical or highly similar sentences
   * @param texts - Array of text strings
   * @returns Deduplicated array of sentences
   */
  deduplicateContent(texts: string[]): string[] {
    const sentences: string[] = [];

    for (const text of texts) {
      // Split by Japanese sentence endings and newlines
      const textSentences = text.split(/[。\n]/).filter(s => s.trim().length > 0);
      sentences.push(...textSentences);
    }

    // Normalize and deduplicate
    const normalized = sentences.map(s => this.normalizeSentence(s));
    const uniqueSentences: string[] = [];
    const seenNormalized = new Set<string>();

    for (let i = 0; i < sentences.length; i++) {
      const norm = normalized[i];
      if (!seenNormalized.has(norm)) {
        seenNormalized.add(norm);
        uniqueSentences.push(sentences[i].trim());
      }
    }

    return uniqueSentences;
  }

  /**
   * Normalize sentence for comparison
   * Removes whitespace, converts to lowercase (for ASCII), trims
   * @private
   */
  private normalizeSentence(sentence: string): string {
    return sentence
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  /**
   * Extract key facts from text based on keywords
   * @param text - Text to extract from
   * @param keywords - Keywords to search for
   * @returns Extracted sentences containing keywords
   */
  extractKeyFacts(text: string, keywords: string[]): string {
    const sentences = text.split(/[。\n]/).filter(s => s.trim().length > 0);
    const matchedSentences: string[] = [];

    for (const keyword of keywords) {
      for (const sentence of sentences) {
        if (sentence.includes(keyword) && !matchedSentences.includes(sentence)) {
          matchedSentences.push(sentence.trim());
        }
      }
    }

    return matchedSentences.join('。');
  }

  /**
   * Summarize texts for a specific category
   * @param texts - Array of text strings
   * @param category - Category for summarization
   * @returns Summarized text
   */
  summarize(texts: string[], category: SummaryCategory): string {
    if (texts.length === 0) {
      return '';
    }

    // Deduplicate first
    const uniqueSentences = this.deduplicateContent(texts);

    // Apply category-specific filtering
    const filteredSentences = this.filterByCategory(uniqueSentences, category);

    if (filteredSentences.length === 0) {
      return '';
    }

    // Get keywords for category
    const keywords = this.getKeywordsForCategory(category);

    // Extract relevant sentences
    const relevantText = this.extractKeyFacts(filteredSentences.join('。'), keywords);

    // Truncate if too long
    const maxLength = 300;
    if (relevantText.length > maxLength) {
      return relevantText.substring(0, maxLength) + '...';
    }

    return relevantText;
  }

  /**
   * Filter sentences based on category-specific rules
   * @private
   */
  private filterByCategory(sentences: string[], category: SummaryCategory): string[] {
    switch (category) {
      case SummaryCategory.CONTACT:
        return this.filterContactInfo(sentences);
      case SummaryCategory.SITUATION:
        return this.filterSituationInfo(sentences);
      case SummaryCategory.OWNER:
        return this.filterOwnerInfo(sentences);
      case SummaryCategory.TIMING:
        return this.filterTimingInfo(sentences);
      case SummaryCategory.REASON:
        return this.filterReasonInfo(sentences);
      case SummaryCategory.PROPERTY:
        return this.filterPropertyInfo(sentences);
      case SummaryCategory.CONFIDENCE:
        return this.filterConfidenceInfo(sentences);
      default:
        return sentences;
    }
  }

  /**
   * Filter contact information - only include if there's actual time info
   * @private
   */
  private filterContactInfo(sentences: string[]): string[] {
    return sentences.filter(sentence => {
      // 「連絡希望時間」だけで終わっている場合は除外
      if (sentence.match(/連絡希望時間[：:]*\s*$/)) {
        return false;
      }
      // 「※連絡」だけで終わっている場合は除外
      if (sentence.match(/※連絡\s*$/)) {
        return false;
      }
      // 実際の時間情報があるかチェック
      const hasTimeInfo = sentence.match(/[0-9０-９]+時|午前|午後|夕方|夜|平日|土日/);
      return hasTimeInfo !== null;
    });
  }

  /**
   * Filter situation information - include loan, parking, owner, etc. with values
   * @private
   */
  private filterSituationInfo(sentences: string[]): string[] {
    return sentences.filter(sentence => {
      // 「コメント」という言葉は除外
      if (sentence.includes('コメント') && !sentence.match(/コメント[：:].+/)) {
        return false;
      }

      // ローン残: 値があれば含める
      if (sentence.match(/ローン残?[：:]/)) {
        return sentence.match(/ローン残?[：:]\s*[0-9０-９]+/) !== null;
      }

      // 駐車場/P: 数字があれば含める
      if (sentence.match(/駐車場|P/)) {
        return sentence.match(/[0-9０-９]+/) !== null;
      }

      // 名義人: 具体的な人物情報があれば含める
      if (sentence.match(/名義人[：:]/)) {
        return sentence.match(/名義人[：:]\s*(本人|父|母|親|娘|息子|兄|弟|姉|妹|夫|妻|嫁)/) !== null;
      }

      // 接道、太陽光、リフォーム: 回答があれば含める
      if (sentence.match(/接道|太陽光|リフォーム/)) {
        const keyword = sentence.match(/(接道|太陽光|リフォーム)/)?.[0];
        if (keyword) {
          // キーワードの後に何か情報があるかチェック
          const afterKeyword = sentence.split(keyword)[1];
          return afterKeyword && afterKeyword.trim().length > 1;
        }
      }

      return true;
    });
  }

  /**
   * Filter owner information - only include if there's actual owner info
   * @private
   */
  private filterOwnerInfo(sentences: string[]): string[] {
    return sentences.filter(sentence => {
      // 「名義人」だけで終わっている場合は除外
      if (sentence.match(/名義人\s*$/)) {
        return false;
      }
      // 具体的な所有者情報があるかチェック
      const hasOwnerInfo = sentence.match(/本人|父|母|親|娘|息子|兄|弟|姉|妹|夫|妻|嫁|所有者/);
      return hasOwnerInfo !== null;
    });
  }

  /**
   * Filter timing information - infer from context
   * @private
   */
  private filterTimingInfo(sentences: string[]): string[] {
    return sentences.filter(sentence => {
      // 「売却希望時期」だけで終わっている場合は除外
      if (sentence.match(/売却希望時期[：:]*\s*$/)) {
        return false;
      }
      // 具体的な時期情報があるかチェック
      const hasTimingInfo = sentence.match(/[0-9０-９]+月|来年|今年|すぐ|ヶ月後|時期|引っ越し/);
      return hasTimingInfo !== null;
    });
  }

  /**
   * Filter reason information - infer from context
   * @private
   */
  private filterReasonInfo(sentences: string[]): string[] {
    return sentences.filter(sentence => {
      // 「売却理由」だけで終わっている場合は除外
      if (sentence.match(/売却理由[：:]*\s*$/)) {
        return false;
      }
      // 具体的な理由があるかチェック
      const hasReasonInfo = sentence.match(/転勤|相続|離婚|住み替え|進学|引っ越し|ため|必要/);
      return hasReasonInfo !== null;
    });
  }

  /**
   * Filter property information - only include if there's actual property details
   * @private
   */
  private filterPropertyInfo(sentences: string[]): string[] {
    return sentences.filter(sentence => {
      // 「リフォーム」などのキーワードだけで終わっている場合は除外
      const keywords = ['リフォーム', '接道', '太陽光'];
      for (const keyword of keywords) {
        if (sentence.match(new RegExp(`${keyword}[：:]*\\s*$`))) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Filter confidence information - infer from context
   * @private
   */
  private filterConfidenceInfo(sentences: string[]): string[] {
    const filtered: string[] = [];

    // 文脈から確度を判断
    for (const sentence of sentences) {
      // 「★希望連絡時間」は確度ではないので除外
      if (sentence.includes('★希望連絡時間')) {
        continue;
      }

      // 明示的な確度表現
      if (sentence.match(/確度|意欲|前向き|売りたい|検討中/)) {
        filtered.push(sentence);
        continue;
      }

      // 文脈から推測: 1年以内に売る気がある
      if (sentence.match(/[0-9０-９]+ヶ月|すぐ|早め|急いで/) && 
          !sentence.match(/年後|まだ先|未定/)) {
        filtered.push('1年以内に売る気あり');
        continue;
      }

      // 文脈から推測: 1年以上先
      if (sentence.match(/年後|まだ先|時間がかかる/)) {
        filtered.push('売る気はあるが1年以上先');
        continue;
      }

      // 文脈から推測: 査定額を知りたいだけ
      if (sentence.match(/査定額.*知りたい|いくら.*気になる|価格.*確認/) &&
          !sentence.match(/売却|売りたい|検討/)) {
        filtered.push('ただ査定額が知りたいだけ');
        continue;
      }
    }

    return filtered.length > 0 ? filtered : sentences;
  }

  /**
   * Get keywords for a specific category
   * @private
   */
  private getKeywordsForCategory(category: SummaryCategory): string[] {
    const keywordMap: Record<SummaryCategory, string[]> = {
      [SummaryCategory.NEXT_ACTION]: ['訪問', '資料', '連絡', '再度', '次回', '提案', '日程'],
      [SummaryCategory.SITUATION]: [
        '専任媒介', '他社', '進捗', '決定', '相談', '買取', '査定', '募集中',
        '契約', '媒介', '競合', '他決', '状況', '変化', '現在',
        '年後', '予定', '検討中', 'うる予定', '売る予定', '売却予定',
        'ローン残', 'ローン', '駐車場', 'P', '名義人', '接道', '太陽光', 'リフォーム',
      ],
      [SummaryCategory.OWNER]: ['名義', '所有者', '本人ではない', '家族', '娘', '息子', '母親', '父親', '兄弟', '姉妹', '決定権', '嫁の', '妻の', '夫の'],
      [SummaryCategory.TIMING]: [
        '来年', '今年', '２月', '３月', '４月', 'すぐ', 'ヶ月後',
        '時期', '引っ越し', '売却可能', '急いで',
      ],
      [SummaryCategory.REASON]: [
        '転勤', '相続', '離婚', '住み替え', '進学', '理由', 'ため',
        '引っ越し', '売却理由', '事情', '必要',
      ],
      [SummaryCategory.PROPERTY]: [
        '㎡', '平米', 'コンロ', 'エアコン', '照明', '温水器', 'リフォーム',
        '築年数', '間取り', '新品', '洗浄', '角部屋', '日当たり', '禁煙',
        '設備', '状態', '木造', '鉄筋', 'マンション', '一戸建て', '土地',
        '駐車場', '庭', '階', '平屋', '注文住宅', 'ハウスメーカー',
      ],
      [SummaryCategory.CONFIDENCE]: [
        '興味', '検討中', '前向き', '売りたい', '考え中', '意欲', '確度',
        '可能性', '見込み', '希望',
      ],
      [SummaryCategory.CONTACT]: [
        '連絡可能', '希望連絡時間', 'お話できる時間', '都合の良い時間',
        '電話可能', '連絡希望', '連絡時間', '電話時間',
        '午前中', '午後', '夕方以降', '夜間', '平日の', '土日の',
        '★希望連絡時間', '※連絡',
      ],
      [SummaryCategory.PERSONALITY]: [
        '話が長い', '話好き', '慎重', 'せっかち', '丁寧', '無口', '明るい',
        '神経質', '人物像', '性格', '印象',
      ],
      [SummaryCategory.PROBLEM]: [
        '問題', '課題', '悩み', '困っ', '心配', 'なかなか', '難しい', '障害',
      ],
      [SummaryCategory.CONDITION]: [
        '希望', '探している', 'エリア', '条件', '引っ越し先', '要望', '希望条件',
      ],
      [SummaryCategory.OTHER]: [],
    };

    return keywordMap[category] || [];
  }

  /**
   * Check if text contains any keywords from a category
   * @param text - Text to check
   * @param category - Category to check against
   * @returns True if text contains category keywords
   */
  hasCategoryKeywords(text: string, category: SummaryCategory): boolean {
    const keywords = this.getKeywordsForCategory(category);
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Categorize text into appropriate category
   * @param text - Text to categorize
   * @returns Best matching category or OTHER if no match
   */
  categorizeText(text: string): SummaryCategory {
    // Exclude irrelevant information patterns
    const excludePatterns = [
      '電話切られ', '切られる', '泣きだし', '赤ちゃん', '子供が泣',
      '電話に出られ', '不在', '留守',
    ];

    // Check if text should be excluded from CONTACT category
    const shouldExcludeFromContact = excludePatterns.some(pattern => text.includes(pattern));

    // Priority check: ★希望連絡時間 should always go to CONTACT
    if (text.includes('★希望連絡時間')) {
      return SummaryCategory.CONTACT;
    }

    // Check for empty ★ patterns (e.g., ★査定方法:, ★査定方法：)
    // If ★ is followed by text and then : or ：with nothing meaningful after, exclude it
    if (text.match(/★[^：:]+[：:]\s*$/)) {
      return SummaryCategory.OTHER;
    }

    const categories = [
      SummaryCategory.CONTACT,  // Check CONTACT first to prioritize time-related info
      SummaryCategory.SITUATION,
      SummaryCategory.OWNER,
      SummaryCategory.TIMING,
      SummaryCategory.REASON,
      SummaryCategory.PROPERTY,
      SummaryCategory.CONFIDENCE,
      SummaryCategory.PERSONALITY,
      SummaryCategory.PROBLEM,
      SummaryCategory.CONDITION,
    ];

    for (const category of categories) {
      // Skip CONTACT category if text matches exclude patterns
      if (category === SummaryCategory.CONTACT && shouldExcludeFromContact) {
        continue;
      }

      if (this.hasCategoryKeywords(text, category)) {
        return category;
      }
    }

    return SummaryCategory.OTHER;
  }

  /**
   * Extract and categorize all texts
   * @param texts - Array of text strings
   * @returns Map of category to texts
   */
  categorizeAll(texts: string[]): Map<SummaryCategory, string[]> {
    const categorized = new Map<SummaryCategory, string[]>();

    // Initialize all categories
    Object.values(SummaryCategory).forEach(category => {
      categorized.set(category as SummaryCategory, []);
    });

    // Categorize each text
    for (const text of texts) {
      const sentences = text.split(/[。\n]/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        const category = this.categorizeText(sentence);
        categorized.get(category)!.push(sentence.trim());
      }
    }

    return categorized;
  }

  /**
   * Merge multiple texts into a concise summary
   * @param texts - Array of text strings
   * @param maxLength - Maximum length of output
   * @returns Merged and truncated text
   */
  merge(texts: string[], maxLength: number = 300): string {
    const deduplicated = this.deduplicateContent(texts);
    const merged = deduplicated.join('。');

    if (merged.length > maxLength) {
      return merged.substring(0, maxLength) + '...';
    }

    return merged;
  }
}
