// Supabase 프로젝트 > Project Settings > API 의 Project URL 과 anon public 키.
// anon 키는 공개해도 되는 키다 (쓰기 권한은 DB 접근 규칙이 막는다). service_role 키는 절대 넣지 않는다.
// 둘 다 비워 두면 사이트는 data/posts.json 을 읽고, 관리자 화면은 쓸 수 없다.
export const SUPABASE_URL = 'https://kvgmjqoasxfmxbgdimsr.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_sl8Si_NfodLuyXB_vCoISQ_Canuxm5x';
