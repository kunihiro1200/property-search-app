/**
 * AA13489のステータス判定用データを確認するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13489Status() {
  console.log('🔍 AA13489のステータス判定用データを確認...\n');

  const { data: seller, error } = await supabase
    .from('sellers')
    .select(`
      seller_number,
      name,
      next_call_date,
      visit_date,
      contact_method,
      preferred_contact_time,
      phone_contact_person,
      valuation_method,
      inquiry_date,
      pinrich_status,
      status
    `)
    .eq('seller_number', 'AA13489')
    .single();

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  if (!seller) {
    console.log('❌ AA13489が見つかりません');
    return;
  }

  console.log('📋 AA13489のデータ:');
  console.log('-------------------');
  console.log(`売主番号: ${seller.seller_number}`);
  console.log(`名前: ${seller.name}`);
  console.log(`次電日: ${seller.next_call_date || '(空)'}`);
  console.log(`訪問日: ${seller.visit_date || '(空)'}`);
  console.log(`連絡方法: ${seller.contact_method || '(空)'}`);
  console.log(`連絡取りやすい日、時間帯: ${seller.preferred_contact_time || '(空)'}`);
  console.log(`電話担当（任意）: ${seller.phone_contact_person || '(空)'}`);
  console.log(`査定方法: ${seller.valuation_method || '(空)'}`);
  console.log(`反響日付: ${seller.inquiry_date || '(空)'}`);
  console.log(`Pinrich: ${seller.pinrich_status || '(空)'}`);
  console.log(`状況（当社）: ${seller.status || '(空)'}`);

  // ステータス判定ロジック
  console.log('\n📊 ステータス判定:');
  console.log('-------------------');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const statuses: string[] = [];

  // 【共通条件】状況（当社）に「追客中」が含まれているかチェック
  const isFollowingUp = seller.status && seller.status.includes('追客中');
  console.log(`【共通条件】追客中: ${isFollowingUp} (状況（当社）: ${seller.status || '空'})`);
  
  if (!isFollowingUp) {
    console.log('\n🎯 最終ステータス:');
    console.log('-------------------');
    console.log('  (ステータスなし - 追客中ではないため)');
    return;
  }

  // 次電日チェック
  let isNextCallDateToday = false;
  if (seller.next_call_date) {
    const nextCallDate = new Date(seller.next_call_date);
    nextCallDate.setHours(0, 0, 0, 0);
    isNextCallDateToday = nextCallDate <= today;
    console.log(`次電日が今日以前: ${isNextCallDateToday} (次電日: ${seller.next_call_date}, 今日: ${today.toISOString().split('T')[0]})`);
  } else {
    console.log('次電日が今日以前: false (次電日が空)');
  }

  // 1. 当日TEL(連絡方法)
  if (seller.contact_method && seller.contact_method.trim() !== '' && isNextCallDateToday) {
    statuses.push(`当日TEL(${seller.contact_method})`);
    console.log(`✅ 当日TEL(連絡方法): 当日TEL(${seller.contact_method})`);
  } else {
    console.log(`❌ 当日TEL(連絡方法): 条件不一致 (連絡方法: ${seller.contact_method || '空'}, 次電日今日以前: ${isNextCallDateToday})`);
  }

  // 2. 当日TEL(連絡取りやすい時間)
  if (seller.preferred_contact_time && seller.preferred_contact_time.trim() !== '' && isNextCallDateToday) {
    statuses.push(`当日TEL(${seller.preferred_contact_time})`);
    console.log(`✅ 当日TEL(連絡取りやすい時間): 当日TEL(${seller.preferred_contact_time})`);
  } else {
    console.log(`❌ 当日TEL(連絡取りやすい時間): 条件不一致 (連絡取りやすい時間: ${seller.preferred_contact_time || '空'}, 次電日今日以前: ${isNextCallDateToday})`);
  }

  // 3. 訪問日前日（簡易チェック）
  if (seller.visit_date) {
    const visitDate = new Date(seller.visit_date);
    visitDate.setHours(0, 0, 0, 0);
    const oneDayBefore = new Date(visitDate);
    oneDayBefore.setDate(visitDate.getDate() - 1);
    const isVisitDayBefore = today.getTime() === oneDayBefore.getTime();
    if (isVisitDayBefore) {
      statuses.push('訪問日前日');
      console.log('✅ 訪問日前日: true');
    } else {
      console.log(`❌ 訪問日前日: false (訪問日: ${seller.visit_date})`);
    }
  } else {
    console.log('❌ 訪問日前日: false (訪問日が空)');
  }

  // 4. 未査定
  const hasValuationMethod = seller.valuation_method && seller.valuation_method.trim() !== '';
  if (!hasValuationMethod && seller.inquiry_date) {
    const inquiryDate = new Date(seller.inquiry_date);
    const cutoffDate = new Date(2026, 0, 1);
    if (inquiryDate >= cutoffDate) {
      statuses.push('未査定');
      console.log(`✅ 未査定: true (査定方法: 空, 反響日付: ${seller.inquiry_date} >= 2026/1/1)`);
    } else {
      console.log(`❌ 未査定: false (反響日付: ${seller.inquiry_date} < 2026/1/1)`);
    }
  } else {
    console.log(`❌ 未査定: false (査定方法: ${seller.valuation_method || '空'}, 反響日付: ${seller.inquiry_date || '空'})`);
  }

  // 5. 当日TEL分
  if (isNextCallDateToday && statuses.length === 0) {
    const phoneContactPerson = seller.phone_contact_person;
    if (phoneContactPerson && phoneContactPerson.trim() !== '') {
      statuses.push(`当日TEL分（${phoneContactPerson}）`);
      console.log(`✅ 当日TEL分: 当日TEL分（${phoneContactPerson}）`);
    } else {
      statuses.push('当日TEL分');
      console.log('✅ 当日TEL分: 当日TEL分');
    }
  } else if (isNextCallDateToday) {
    console.log('❌ 当日TEL分: スキップ（他のステータスが優先）');
  } else {
    console.log('❌ 当日TEL分: false (次電日が今日以前ではない)');
  }

  // 6. Pinrich空欄
  if (!seller.pinrich_status || seller.pinrich_status.trim() === '') {
    statuses.push('Pinrich空欄');
    console.log('✅ Pinrich空欄: true');
  } else {
    console.log(`❌ Pinrich空欄: false (Pinrich: ${seller.pinrich_status})`);
  }

  console.log('\n🎯 最終ステータス:');
  console.log('-------------------');
  if (statuses.length > 0) {
    statuses.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  } else {
    console.log('  (ステータスなし)');
  }
}

checkAA13489Status().catch(console.error);
