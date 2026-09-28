/*
 * config.js — 把範本改成你的題目，只要改這個檔。
 *
 * 1. supabaseUrl、supabaseKey：到 Supabase → Project Settings → API 複製。
 *    這把是「公開用」的鑰匙（anon／publishable），放在網頁裡沒關係；
 *    絕對不要貼 service_role／secret 那一把。
 * 2. fields：表單有哪些欄位。改完存檔、push，網站就會變。
 *    欄位存在資料庫的同一格（data），所以改欄位「不用」改資料庫。
 *
 * 欄位 type 可以用：text（一行字）、textarea（多行字）、select（下拉選單）、
 *                   date（日期）、number（數字）、tel（電話）
 */
window.APP = {
  title: '設備借用登記',
  intro: '登入後填寫下面的表單。你只看得到自己的登記；管理者看得到全部。',

  supabaseUrl: '',
  supabaseKey: '',

  // 登入方式：'email'（寄登入連結）或 'line'（用 LINE 登入，步驟在 LINE.md）
  login: 'email',
  lineChannelId: '', // LINE Login channel 的 Channel ID（可以公開）；Channel secret 不要放這裡

  fields: [
    { key: 'name', label: '姓名', type: 'text', required: true, max: 40 },
    { key: 'item', label: '要借的設備', type: 'select', options: ['投影機', '筆電', '麥克風'], required: true },
    { key: 'date', label: '使用日期', type: 'date', required: true },
    { key: 'note', label: '備註', type: 'textarea', max: 300 },
  ],
};
