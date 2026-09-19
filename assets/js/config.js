/*
 * config.js — 會員功能設定。
 * 兩個值都留空 = 會員功能整個關閉，網站照常運作（進度只存在瀏覽器）。
 * 填入方式見 docs/SETUP-MEMBERS.md。
 * 這兩個值本來就是設計給網頁公開使用的；絕對不要在這裡放 service_role / secret key。
 */
window.COURSE_CONFIG = {
  supabaseUrl: 'https://nrljtmxxrbqgteouwdbc.supabase.co',
  supabaseKey: 'sb_publishable_zCvNbO4ytHjmmMbiaYzsdQ_-Gjjy92N', // Publishable key（sb_publishable_ 開頭）
};
