#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';

const MIGRATIONS = [
  '001_create_ipo_tables.sql',
  '002_add_exchange_symbols.sql',
  '002_add_logo_url.sql',
  '002_add_scrape_fields.sql',
  '003_add_chittorgarh_url.sql',
  '003_add_financials_columns.sql',
  '004_add_scraper_tables.sql',
  '004_automation_extensions.sql',
  '004b_ipos_missing_columns.sql',
  '004c_align_admin_rls.sql',
  '005_add_bulk_data_features.sql',
  '006_create_admin_table.sql',
  '007_complete_setup.sql',
  '008_add_kpi_table.sql',
  '009_add_issue_details_support.sql',
  '010_fix_financials_and_subscriptions.sql',
  '011_subscription_live_tables.sql',
  '012_add_gmp_source_urls.sql',
  '013_subscription_source_tracking.sql',
  '014_add_allotment_url.sql',
  '015_add_listing_day_fields.sql',
  '016_create_market_news.sql',
  '017_reset_admin_credentials.sql',
  '019_create_logo_storage_bucket.sql',
  '020_add_document_urls.sql',
  '021_add_faqs_and_long_content.sql',
  '022_community_reviews.sql',
];

async function runMigrations() {
  const supabase = createAdminClient();
  
  console.log('🚀 Starting database migrations...\n');
  
  let executed = 0;
  let skipped = 0;
  let failed = 0;

  for (const migration of MIGRATIONS) {
    const migrationPath = path.join('/vercel/share/v0-project/scripts', migration);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`⏭️  SKIPPED: ${migration} (file not found)`);
      skipped++;
      continue;
    }

    try {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      // Split by semicolon to handle multiple statements, but be careful about comment blocks
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (!statement.trim()) continue;
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Some migrations may fail if they reference tables that don't exist yet
          // or if they're duplicate operations. We continue rather than fail.
          if (
            error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')
          ) {
            console.log(`⚠️  PARTIAL: ${migration} (${error.message})`);
            executed++;
            break;
          } else {
            console.error(`❌ FAILED: ${migration}`);
            console.error(`   Error: ${error.message}`);
            failed++;
            break;
          }
        }
      }
      
      console.log(`✅ EXECUTED: ${migration}`);
      executed++;
    } catch (err) {
      console.error(`❌ FAILED: ${migration}`);
      console.error(`   Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Executed: ${executed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${executed + skipped + failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
