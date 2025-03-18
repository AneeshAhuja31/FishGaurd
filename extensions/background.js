chrome.runtime.onInstalled.addListener(async () => {
    console.log('FishGuard extension installed');
    
    // Initialize storage
    await chrome.storage.local.set({
      cachedUrls: {},
      cachedJobs: {},
      statistics: {
        phishingDetected: 0,
        suspiciousJobs: 0,
        maliciousJobs: 0
      }
    });
  });
  
  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateStats') {
      chrome.storage.local.get(['statistics'], (result) => {
        const stats = result.statistics || {
          phishingDetected: 0,
          suspiciousJobs: 0,
          maliciousJobs: 0
        };
        
        if (message.data.phishingDetected) {
          stats.phishingDetected++;
        }
        
        if (message.data.jobStatus === 'suspicious') {
          stats.suspiciousJobs++;
        }
        
        if (message.data.jobStatus === 'malicious') {
          stats.maliciousJobs++;
        }
        
        chrome.storage.local.set({ statistics: stats });
      });
    }
    
    return true;
  });
  
