// ============================================================
// JAIFUL — Supabase Configuration
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values
// Found at: https://supabase.com/dashboard → Settings → API
// ============================================================

const JAIFUL_CONFIG = {
  supabase: {
    url: 'https://wtrhcyspnkgtvaxtcsax.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cmhjeXNwbmtndHZheHRjc2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ3MjcsImV4cCI6MjA4ODU0MDcyN30.ywq13EeFWvZ47D_qgAnFmSPRXhAKR1kf9cBs2YpL5WQ',
  },

  // Storage bucket names (create these in Supabase Dashboard → Storage)
  storage: {
    slipsBucket: 'payment-slips',
    badgesBucket: 'badges',
  },

  // Workshop currently active
  activeWorkshop: 'claude-123',

  // Bank account info for payment
  bank: {
    name: 'กสิกรไทย',
    accountNumber: '752-2-35810-4',
    accountName: 'บจก. เดอะ ฮิวมานิเซอร์',
  },

  // Company info
  company: {
    name: 'บริษัท เดอะ ฮิวมานิเซอร์ จำกัด',
    address: '139/18 ซอยลาดพร้าว 5 แขวงจอมพล เขตจตุจักร กทม. 10900',
    phone: '095-9159-149',
    email: 'bnzaza@gmail.com',
  },
};
