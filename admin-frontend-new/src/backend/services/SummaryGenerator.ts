/**
 * SummaryGenerator - Generate enhanced call history summaries
 * 
 * Integrates all modules to create comprehensive, non-redundant summaries:
 * - TimestampParser: Extract timestamps from comments
 * - CallCounter: Count calls with deduplication
 * - CommentSorter: Sort entries chronologically
 * - ContentSummarizer: Categorize and summarize content
 */

import { ActivityLog, Activity } from '../types';
import { CallCounter } from './CallCounter';
import { CommentSorter } from './CommentSorter';
import { ContentSummarizer, SummaryCategory } from './ContentSummarizer';

export interface SummaryInput {
  communicationHistory?: (ActivityLog | Activity)[];
  spreadsheetComments?: string[];
  sellerData?: any;
}

export interface SummaryMetadata {
  totalCalls: number;
  callsFromHistory: number;
  callsFromComments: number;
  sectionsGenerated: string[];
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface SummaryOutput {
  summary: string;
  metadata: SummaryMetadata;
}

export class SummaryGenerator {
  private callCounter: CallCounter;
  private commentSorter: CommentSorter;
  private contentSummarizer: ContentSummarizer;
  private cache: Map<string, { result: SummaryOutput; timestamp: number }>;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 200;

  constructor() {
    this.callCounter = new CallCounter();
    this.commentSorter = new CommentSorter();
    this.contentSummarizer = new ContentSummarizer();
    this.cache = new Map();
  }

  /**
   * Generate enhanced summary from input data
   * @param input - Communication history and spreadsheet comments
   * @returns Summary text and metadata
   */
  generateEnhancedSummary(input: SummaryInput): SummaryOutput {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(input);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      console.log(`✅ Cache hit for summary (${Date.now() - startTime}ms)`);
      return cached.result;
    }

    // Limit entries for performance (most recent 200)
    const activities: (ActivityLog | Activity)[] = (input.communicationHistory || []).slice(0, this.MAX_ENTRIES);
    const comments = (input.spreadsheetComments || []).slice(0, this.MAX_ENTRIES);

    // Count calls with deduplication
    const callCountResult = this.callCounter.countTotalCalls(activities as any, comments);

    // Sort all entries chronologically (newest first)
    const sortedEntries = this.commentSorter.sortCommentsAndActivities(comments, activities as any);

    // Extract all text for categorization
    const allTexts = sortedEntries.map(e => e.text);

    // Categorize content
    const categorized = this.contentSummarizer.categorizeAll(allTexts);

    // Generate summary sections
    const sections: string[] = [];
    const sectionsGenerated: string[] = [];

    // 【次のアクション】
    const nextActionText = this.generateNextAction(allTexts, categorized, input.sellerData);
    if (nextActionText) {
      sections.push(`【次のアクション】${nextActionText}`);
      sectionsGenerated.push('次のアクション');
    }

    // 【通話回数】
    sections.push(`【通話回数】${callCountResult.totalCalls}回`);
    sectionsGenerated.push('通話回数');

    // 【連絡可能時間】
    const contactText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.CONTACT) || [],
      SummaryCategory.CONTACT
    );
    if (contactText) {
      sections.push(`【連絡可能時間】${contactText}`);
      sectionsGenerated.push('連絡可能時間');
    }

    // 【状況】
    const situationText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.SITUATION) || [],
      SummaryCategory.SITUATION
    );
    if (situationText) {
      const formattedSituation = this.formatAsBulletPoints(situationText);
      sections.push(`【状況】\n${formattedSituation}`);
      sectionsGenerated.push('状況');
    }

    // 【名義人】
    const ownerText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.OWNER) || [],
      SummaryCategory.OWNER
    );
    if (ownerText) {
      sections.push(`【名義人】${ownerText}`);
      sectionsGenerated.push('名義人');
    }

    // 【人物像】
    const personalityText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.PERSONALITY) || [],
      SummaryCategory.PERSONALITY
    );
    if (personalityText) {
      sections.push(`【人物像】${personalityText}`);
      sectionsGenerated.push('人物像');
    }

    // 【売却時期】
    const timingText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.TIMING) || [],
      SummaryCategory.TIMING
    );
    if (timingText) {
      sections.push(`【売却時期】${timingText}`);
      sectionsGenerated.push('売却時期');
    }

    // 【売却理由】
    const reasonText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.REASON) || [],
      SummaryCategory.REASON
    );
    if (reasonText) {
      sections.push(`【売却理由】${reasonText}`);
      sectionsGenerated.push('売却理由');
    }

    // 【物件情報】
    const propertyText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.PROPERTY) || [],
      SummaryCategory.PROPERTY
    );
    if (propertyText) {
      const formattedProperty = this.formatAsBulletPoints(propertyText);
      sections.push(`【物件情報】\n${formattedProperty}`);
      sectionsGenerated.push('物件情報');
    }

    // 【確度】
    const confidenceText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.CONFIDENCE) || [],
      SummaryCategory.CONFIDENCE
    );
    if (confidenceText) {
      sections.push(`【確度】${confidenceText}`);
      sectionsGenerated.push('確度');
    }

    // 【問題点】
    const problemText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.PROBLEM) || [],
      SummaryCategory.PROBLEM
    );
    if (problemText) {
      sections.push(`【問題点】${problemText}`);
      sectionsGenerated.push('問題点');
    }

    // 【希望条件】
    const conditionText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.CONDITION) || [],
      SummaryCategory.CONDITION
    );
    if (conditionText) {
      sections.push(`【希望条件】${conditionText}`);
      sectionsGenerated.push('希望条件');
    }

    // 【その他】
    const otherText = this.contentSummarizer.summarize(
      categorized.get(SummaryCategory.OTHER) || [],
      SummaryCategory.OTHER
    );
    if (otherText) {
      const formattedOther = this.formatAsBulletPoints(otherText);
      sections.push(`【その他】\n${formattedOther}`);
      sectionsGenerated.push('その他');
    }

    // Generate metadata
    const processingTime = Date.now() - startTime;
    const metadata: SummaryMetadata = {
      totalCalls: callCountResult.totalCalls,
      callsFromHistory: callCountResult.callsFromHistory,
      callsFromComments: callCountResult.callsFromComments,
      sectionsGenerated,
      oldestEntry: sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].date : undefined,
      newestEntry: sortedEntries.length > 0 ? sortedEntries[0].date : undefined,
    };

    const result: SummaryOutput = {
      summary: sections.join('\n'),
      metadata,
    };

    // Cache the result
    this.cache.set(cacheKey, { result, timestamp: Date.now() });
    
    // Clean up old cache entries (keep cache size manageable)
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    console.log(`✅ Summary generated in ${processingTime}ms (${activities.length} activities, ${comments.length} comments)`);

    return result;
  }

  /**
   * Format text as bullet points for better readability
   * Splits by 。and creates bullet points with 。at the end
   * @private
   */
  private formatAsBulletPoints(text: string): string {
    if (!text) return '';
    
    // Split by Japanese sentence ending
    const sentences = text.split('。').filter(s => s.trim().length > 0);
    
    // If only one sentence, return as is
    if (sentences.length <= 1) {
      return text;
    }
    
    // Format as bullet points with line breaks and 。at the end
    return sentences.map(s => `・${s.trim()}。`).join('\n');
  }

  /**
   * Generate next action recommendation
   * @private
   */
  private generateNextAction(allTexts: string[], categorized: Map<SummaryCategory, string[]>, sellerData?: any): string {
    const combinedText = allTexts.join(' ');
    const status = sellerData?.status || '';

    // Check for excluded/no-follow-up status first (only if status indicates it)
    if (status.includes('除外') || status.includes('追客不要')) {
      return '追客不要（除外済み）';
    }

    // Check for already contracted with competitor
    if (combinedText.includes('専任媒介') || combinedText.includes('他社と契約')) {
      return '他社契約中のため、契約期間終了後に再アプローチを検討';
    }

    // Check for waiting/pending status first (before urgent timing)
    if (combinedText.includes('時期未定') || combinedText.includes('まだ時間がかかる') ||
        combinedText.includes('施設が決まら') || combinedText.includes('入院中')) {
      return '定期的に状況確認の連絡を入れる';
    }

    // Check for urgent timing
    if ((combinedText.includes('２月') || combinedText.includes('来月') || combinedText.includes('すぐ')) &&
        !combinedText.includes('未定') && !combinedText.includes('まだ')) {
      return '早急に訪問査定の日程調整を行う';
    }

    // Check for competition
    if (combinedText.includes('何社か') || combinedText.includes('他社') || combinedText.includes('競合')) {
      return '他社との差別化ポイントを説明し、早めの訪問査定を提案する';
    }

    // Check for buyer introduction opportunity
    if (combinedText.includes('買いたい') || combinedText.includes('紹介') || combinedText.includes('お客様')) {
      return '次回電話時に、お客様を紹介したい旨伝え、売却の進捗状況を確認';
    }

    // Check for high motivation
    if (combinedText.includes('売りたい') || combinedText.includes('検討中') || combinedText.includes('前向き')) {
      return '売却スケジュールを確認し、訪問査定の日程を提案する';
    }

    // Check for family involvement
    if (combinedText.includes('家族') || combinedText.includes('相談') || combinedText.includes('娘') || combinedText.includes('息子') || combinedText.includes('嫁') || combinedText.includes('母様')) {
      return 'ご家族を含めた面談の機会を設定する';
    }

    // Check for unreachable (only if not excluded)
    if (combinedText.includes('不在') || combinedText.includes('留守電') || combinedText.includes('連絡取れ')) {
      return '別の時間帯に再度連絡を試みる';
    }

    // Check for waiting/pending status
    if (combinedText.includes('様子を見') || combinedText.includes('考え中') ||
        combinedText.includes('進展なし') || combinedText.includes('まだ先')) {
      return '定期的に状況確認の連絡を入れる';
    }

    // Default based on available information
    const hasTiming = (categorized.get(SummaryCategory.TIMING) || []).length > 0;
    const hasConfidence = (categorized.get(SummaryCategory.CONFIDENCE) || []).length > 0;

    if (hasTiming) {
      return '売却時期に合わせて定期的にフォローアップを行う';
    } else if (hasConfidence) {
      return '訪問査定の提案と日程調整を行う';
    } else {
      return '物件の詳細情報をヒアリングする';
    }
  }

  /**
   * Generate simple summary (backward compatible with existing system)
   * @param memos - Array of memo strings
   * @returns Simple summary string
   */
  generateSimpleSummary(memos: string[]): string {
    const input: SummaryInput = {
      spreadsheetComments: memos,
      communicationHistory: [],
    };

    const result = this.generateEnhancedSummary(input);
    return result.summary;
  }

  /**
   * Get summary metadata without generating full summary
   * @param input - Communication history and spreadsheet comments
   * @returns Metadata only
   */
  getMetadata(input: SummaryInput): SummaryMetadata {
    const activities: (ActivityLog | Activity)[] = input.communicationHistory || [];
    const comments = input.spreadsheetComments || [];

    const callCountResult = this.callCounter.countTotalCalls(activities as any, comments);
    const sortedEntries = this.commentSorter.sortCommentsAndActivities(comments, activities as any);

    return {
      totalCalls: callCountResult.totalCalls,
      callsFromHistory: callCountResult.callsFromHistory,
      callsFromComments: callCountResult.callsFromComments,
      sectionsGenerated: [],
      oldestEntry: sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].date : undefined,
      newestEntry: sortedEntries.length > 0 ? sortedEntries[0].date : undefined,
    };
  }

  /**
   * Generate cache key from input data
   * @private
   */
  private generateCacheKey(input: SummaryInput): string {
    const activityIds = (input.communicationHistory || [])
      .map(a => (a as any).id || '')
      .slice(0, 10)
      .join(',');
    const commentHash = (input.spreadsheetComments || [])
      .slice(0, 10)
      .join('')
      .substring(0, 100);
    return `${activityIds}-${commentHash}`;
  }

  /**
   * Clear cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('✅ Summary cache cleared');
  }
}
