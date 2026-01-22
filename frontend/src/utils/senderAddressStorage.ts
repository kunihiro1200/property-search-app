// セッションストレージのキー
const SENDER_ADDRESS_KEY = 'email_sender_address';

// デフォルトの送信元アドレス
const DEFAULT_SENDER_ADDRESS = 'tenant@ifoo-oita.com';

/**
 * 送信元アドレスをセッションストレージに保存
 */
export const saveSenderAddress = (address: string): void => {
  try {
    sessionStorage.setItem(SENDER_ADDRESS_KEY, address);
    console.log(`✅ Saved sender address: ${address}`);
  } catch (error) {
    console.error('❌ Error saving sender address:', error);
  }
};

/**
 * セッションストレージから送信元アドレスを取得
 * 保存されていない場合はデフォルトアドレスを返す
 */
export const getSenderAddress = (): string => {
  try {
    const saved = sessionStorage.getItem(SENDER_ADDRESS_KEY);
    if (saved) {
      console.log(`✅ Retrieved sender address: ${saved}`);
      return saved;
    }
  } catch (error) {
    console.error('❌ Error retrieving sender address:', error);
  }
  
  console.log(`✅ Using default sender address: ${DEFAULT_SENDER_ADDRESS}`);
  return DEFAULT_SENDER_ADDRESS;
};

/**
 * 送信元アドレスを検証し、有効なアドレスリストに含まれているかチェック
 * 無効な場合はデフォルトアドレスを返す
 */
export const validateSenderAddress = (address: string, validEmails: string[]): string => {
  // デフォルトアドレスは常に有効
  if (address === DEFAULT_SENDER_ADDRESS) {
    return address;
  }
  
  // 有効なメールアドレスリストに含まれているかチェック
  if (validEmails.includes(address)) {
    console.log(`✅ Sender address is valid: ${address}`);
    return address;
  }
  
  // 無効な場合はデフォルトアドレスを返す
  console.log(`⚠️ Invalid sender address: ${address}, using default: ${DEFAULT_SENDER_ADDRESS}`);
  return DEFAULT_SENDER_ADDRESS;
};

/**
 * セッションストレージから送信元アドレスをクリア
 */
export const clearSenderAddress = (): void => {
  try {
    sessionStorage.removeItem(SENDER_ADDRESS_KEY);
    console.log('🗑️ Cleared sender address');
  } catch (error) {
    console.error('❌ Error clearing sender address:', error);
  }
};

/**
 * デフォルトの送信元アドレスを取得
 */
export const getDefaultSenderAddress = (): string => {
  return DEFAULT_SENDER_ADDRESS;
};
