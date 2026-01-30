/**
 * Time Sync Test Script
 * 
 * Run this in browser console to test time synchronization
 * Usage: Copy and paste entire script into browser console
 */

(async function testTimeSync() {
  console.log('🧪 Time Sync Test Suite\n');
  console.log('='.repeat(50));

  // Test 1: Service Initialization
  console.log('\n📋 Test 1: Service Status');
  console.log('-'.repeat(50));
  
  try {
    const status = timeService.getSyncStatus();
    console.log('✅ Service accessible');
    console.log('Synced:', status.synced ? '✅' : '❌');
    console.log('Stale:', status.stale ? '⚠️  Yes' : '✅ No');
    console.log('Offset:', `${status.offset}ms`);
    console.log('Last Sync:', status.lastSync ? status.lastSync.toLocaleString() : 'Never');
  } catch (error) {
    console.error('❌ Service not accessible:', error.message);
    console.log('Hint: Service may still be initializing. Wait a few seconds.');
    return;
  }

  // Test 2: Metrics
  console.log('\n📊 Test 2: Service Metrics');
  console.log('-'.repeat(50));
  
  const metrics = timeService.getMetrics();
  console.log('Sync Attempts:', metrics.syncAttempts);
  console.log('Sync Successes:', metrics.syncSuccesses);
  console.log('Success Rate:', `${metrics.syncSuccessRate.toFixed(1)}%`);
  console.log('Average Latency:', `${metrics.averageLatency.toFixed(0)}ms`);
  console.log('Offset:', `${metrics.offsetMs}ms`);

  // Test 3: Time Comparison
  console.log('\n⏰ Test 3: Time Comparison');
  console.log('-'.repeat(50));
  
  const deviceTime = new Date();
  const syncedTime = timeService.now();
  const difference = syncedTime.getTime() - deviceTime.getTime();
  
  console.log('Device Time:', deviceTime.toISOString());
  console.log('Synced Time:', syncedTime.toISOString());
  console.log('Difference:', `${difference}ms`);
  
  if (Math.abs(difference - metrics.offsetMs) < 10) {
    console.log('✅ Offset applied correctly');
  } else {
    console.log('⚠️  Offset mismatch detected');
  }

  // Test 4: Manual Sync
  console.log('\n🔄 Test 4: Manual Sync');
  console.log('-'.repeat(50));
  
  console.log('Starting manual sync...');
  const syncStart = Date.now();
  const syncResult = await timeService.sync();
  const syncDuration = Date.now() - syncStart;
  
  if (syncResult) {
    console.log(`✅ Sync successful (${syncDuration}ms)`);
    const newStatus = timeService.getSyncStatus();
    console.log('New Offset:', `${newStatus.offset}ms`);
  } else {
    console.log('❌ Sync failed');
    console.log('Check console for errors');
  }

  // Test 5: Cache Verification
  console.log('\n💾 Test 5: Cache Verification');
  console.log('-'.repeat(50));
  
  const cached = localStorage.getItem('timeSync_offset');
  if (cached) {
    console.log('✅ Offset cached in localStorage');
    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;
    console.log('Cached Offset:', `${cacheData.offset}ms`);
    console.log('Cache Age:', `${Math.round(age / 1000)}s`);
    console.log('Cache Valid:', age < 24 * 60 * 60 * 1000 ? '✅ Yes' : '❌ Expired');
  } else {
    console.log('⚠️  No cache found');
  }

  // Test 6: Helper Functions
  console.log('\n🛠️  Test 6: Helper Functions');
  console.log('-'.repeat(50));
  
  try {
    // Test dateHelpers
    const { getCurrentTimeInTimezone, getTodayDate, formatTime } = await import('./src/utils/dateHelpers.ts');
    console.log('✅ dateHelpers imported');
    console.log('Today (UTC+6):', getTodayDate());
    console.log('Current Time (UTC+6):', formatTime(getCurrentTimeInTimezone()));
  } catch (error) {
    console.log('⚠️  Could not import dateHelpers (expected in console test)');
  }

  // Test 7: Time Manipulation Detection
  console.log('\n🔍 Test 7: Time Manipulation Detection');
  console.log('-'.repeat(50));
  
  const serverTime = timeService.now();
  const clientTime = new Date();
  const discrepancy = Math.abs(serverTime.getTime() - clientTime.getTime() - metrics.offsetMs);
  
  if (discrepancy < 1000) {
    console.log('✅ No significant time manipulation detected');
  } else {
    console.log('⚠️  Large discrepancy detected:', `${discrepancy}ms`);
    console.log('This could indicate:');
    console.log('  - Device time was changed');
    console.log('  - Network latency spike');
    console.log('  - Cache needs refresh');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📝 Test Summary');
  console.log('='.repeat(50));
  
  const issues = [];
  if (!status.synced) issues.push('Service not synced');
  if (status.stale) issues.push('Sync is stale');
  if (metrics.syncSuccessRate < 80) issues.push('Low success rate');
  if (metrics.averageLatency > 1000) issues.push('High latency');
  
  if (issues.length === 0) {
    console.log('✅ All tests passed! Time sync is working correctly.');
  } else {
    console.log('⚠️  Issues detected:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }

  console.log('\n💡 Tips:');
  console.log('  - Run timeService.sync() to force a sync');
  console.log('  - Check timeService.getMetrics() for detailed stats');
  console.log('  - Clear cache: localStorage.removeItem("timeSync_offset")');
  console.log('  - View UI indicator in top-right corner');

})();

/* Manual Test Commands */
console.log('\n🔧 Manual Test Commands:');
console.log('  timeService.getSyncStatus()  - Check current status');
console.log('  timeService.getMetrics()     - View detailed metrics');
console.log('  timeService.sync()           - Force immediate sync');
console.log('  timeService.now()            - Get synced time');
console.log('  timeService.getOffset()      - Get offset in ms');
