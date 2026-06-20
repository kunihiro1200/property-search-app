/**
 * todayCallカテゴリのAPIレスポンスを確認するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  console.log('=== todayCall APIレスポンス確認 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 今日の日付（JST）
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = jstTime.toISOString().split('T')[0];
  console.log('今日（JST）:', todayJST);

  // todayCallの条件で売主を取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('seller_number, status, next_call_date, visit_assignee, contact_method, preferred_contact_time, phone_contact_person')
    .is('deleted_at', null)
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayJST)
    .order('next_call_date', { ascending: true })
    .limit(50);

  if (error) {
    console.log(`❌ エラー: ${error.message}`);
    return;
  }

  console.log(`\n📊 取得件数: ${sellers?.length || 0}件\n`);

  // 営担なし + コミュニケーション情報なし（当日TEL分）
  const todayCallSellers = (sellers || []).filter(s => {
    const hasAssignee = s.visit_assignee && s.visit_assignee.trim() !== '' && s.visit_assignee.trim() !== '外す';
    const hasContactInfo = 
      (s.contact_method && s.contact_method.trim() !== '') ||
      (s.preferred_contact_time && s.preferred_contact_time.trim() !== '') ||
      (s.phone_contact_person && s.phone_contact_person.trim() !== '');
    return !hasAssignee && !hasContactInfo;
  });

  console.log(`📊 当日TEL分（営担なし + コミュニケーション情報なし）: ${todayCallSellers.length}件`);
  console.log('\n最初の10件:');
  todayCallSellers.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.seller_number}: status="${s.status}", next_call_date="${s.next_call_date}", visit_assignee="${s.visit_assignee || ''}"`);
  });

  // 営担あり（当日TEL担当）
  const todayCallAssignedSellers = (sellers || []).filter(s => {
    const hasAssignee = s.visit_assignee && s.visit_assignee.trim() !== '' && s.visit_assignee.trim() !== '外す';
    return hasAssignee;
  });

  console.log(`\n📊 当日TEL（担当）（営担あり）: ${todayCallAssignedSellers.length}件`);
  console.log('\n最初の10件:');
  todayCallAssignedSellers.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.seller_number}: status="${s.status}", next_call_date="${s.next_call_date}", visit_assignee="${s.visit_assignee}"`);
  });

  // 営担なし + コミュニケーション情報あり（当日TEL内容）
  const todayCallWithInfoSellers = (sellers || []).filter(s => {
    const hasAssignee = s.visit_assignee && s.visit_assignee.trim() !== '' && s.visit_assignee.trim() !== '外す';
    const hasContactInfo = 
      (s.contact_method && s.contact_method.trim() !== '') ||
      (s.preferred_contact_time && s.preferred_contact_time.trim() !== '') ||
      (s.phone_contact_person && s.phone_contact_person.trim() !== '');
    return !hasAssignee && hasContactInfo;
  });

  console.log(`\n📊 当日TEL（内容）（営担なし + コミュニケーション情報あり）: ${todayCallWithInfoSellers.length}件`);
  console.log('\n最初の10件:');
  todayCallWithInfoSellers.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.seller_number}: contact_method="${s.contact_method || ''}", preferred_contact_time="${s.preferred_contact_time || ''}", phone_contact_person="${s.phone_contact_person || ''}"`);
  });
}

main().catch(console.error);
