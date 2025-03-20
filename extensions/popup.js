// // popup.js for browser extension

// // Function to track user activity and reset session after inactivity
// function setupSessionTimeout() {
//   // Get last activity time or set current time if none exists
//   chrome.storage.local.get(['lastActivity'], (result) => {
//     const now = Date.now();
//     let lastActivity = result.lastActivity || now;
    
//     // Check if session has timed out (30 minutes of inactivity)
//     if (now - lastActivity > 30 * 60 * 1000) {
//       console.log('[FishGuard] Session timed out, starting new session');
//       startNewSession();
//     } else {
//       // Update last activity time
//       chrome.storage.local.set({ lastActivity: now });
//     }
//   });
// }

// // This function collects links from the email content or LinkedIn pages
// function collectLinks() {
//   // We need to execute script in the context of the webpage
//   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     if (!tabs[0]) {
//       console.error('No active tab found');
//       return;
//     }
    
//     // First, determine if we're on Gmail or LinkedIn
//     chrome.scripting.executeScript({
//       target: {tabId: tabs[0].id},
//       function: detectPlatform
//     }, (results) => {
//       if (results && results[0] && results[0].result) {
//         const platform = results[0].result;
//         console.log(`Detected platform: ${platform}`);
        
//         // Execute the appropriate link grabbing function based on platform
//         chrome.scripting.executeScript({
//           target: {tabId: tabs[0].id},
//           function: platform === 'linkedin' ? grabLinkedInLinks : grabGmailLinks
//         }, (results) => {
//           if (results && results[0] && results[0].result) {
//             const links = results[0].result;
//             console.log(`${platform} content links:`, links);
//             console.log('Total links found:', links.length);
            
//             // Update last activity time when scanning
//             chrome.storage.local.set({ lastActivity: Date.now() });
            
//             // Process the links
//             loadlinks(links, platform);
//           } else {
//             console.error(`No results returned from grabbing links on ${platform}`);
//           }
//         });
//       } else {
//         console.error('Could not detect platform');
//       }
//     });
//   });
// }

// // Detect whether we're on Gmail or LinkedIn
// function detectPlatform() {
//   // Check for LinkedIn-specific elements
//   const linkedInElements = document.querySelector('.feed-shared-update-v2') || 
//                           document.querySelector('.msg-s-event-listitem__body') ||
//                           document.querySelector('.comments-comment-item__main-content');
                          
//   // Check for Gmail-specific elements
//   const gmailElements = document.querySelector('div.ii.gt');
  
//   if (linkedInElements) {
//     return 'linkedin';
//   } else if (gmailElements) {
//     return 'gmail';
//   } else {
//     return 'unknown';
//   }
// }

// // Function to grab links from LinkedIn
// function grabLinkedInLinks() {
//   const links = [];
  
//   // 1. LinkedIn Feed Posts - targeted content area only
//   const feedPostContents = document.querySelectorAll('.feed-shared-inline-show-more-text, .feed-shared-inline-show-more-text--minimal-padding, .feed-shared-inline-show-more-text--2-lines');
//   feedPostContents.forEach(contentArea => {
//     const contentLinks = contentArea.querySelectorAll('a');
//     contentLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // 2. LinkedIn Post Comments - targeted comment text only
//   const commentContents = document.querySelectorAll('.comments-comment-item__main-content');
//   commentContents.forEach(commentContent => {
//     const commentLinks = commentContent.querySelectorAll('a');
//     commentLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // 3. LinkedIn Direct Messages - targeted message content only
//   const messageContents = document.querySelectorAll('.msg-s-event-listitem__body');
//   messageContents.forEach(messageContent => {
//     const messageLinks = messageContent.querySelectorAll('a');
//     messageLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/messaging/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // Remove duplicates
//   const uniqueLinks = [...new Set(links)];
//   console.log('Found ' + uniqueLinks.length + ' links in LinkedIn content');
//   return uniqueLinks;
// }

// // Function to highlight links in LinkedIn
// function highlightLinkedInLinks(urlResults) {
//   console.log('Starting LinkedIn link highlighting with specific targeting');
  
//   // Helper function to process links
//   function processLinks(linkElements) {
//     linkElements.forEach(link => {
//       const url = link.href;
//       const result = urlResults[url];
      
//       if (result) {
//         if (result.is_phishing !== 0) {
//           link.style.color = 'red';
//           link.style.fontWeight = 'bold';
//           link.style.textDecoration = 'line-through';
//           link.title = 'Warning: This link may be malicious';
//           console.log(`Marked malicious link in LinkedIn: ${url}`);
//         }
//         else if(result.is_phishing === 0) {
//           link.style.color = 'green';
//           link.title = 'This link appears to be safe';
//           console.log(`Marked safe link in LinkedIn: ${url}`);
//         }
//       }
//     });
//   }
  
//   // Process LinkedIn Feed Posts - content area only
//   const feedPostContents = document.querySelectorAll('.feed-shared-inline-show-more-text, .feed-shared-inline-show-more-text--minimal-padding, .feed-shared-inline-show-more-text--2-lines');
//   feedPostContents.forEach(contentArea => {
//     const contentLinks = contentArea.querySelectorAll('a');
//     processLinks(contentLinks);
//   });
  
//   // Process LinkedIn Post Comments - comment text only
//   const commentContents = document.querySelectorAll('.comments-comment-item__main-content');
//   commentContents.forEach(commentContent => {
//     const commentLinks = commentContent.querySelectorAll('a');
//     processLinks(commentLinks);
//   });
  
//   // Process LinkedIn Direct Messages - message content only
//   const messageContents = document.querySelectorAll('.msg-s-event-listitem__body');
//   messageContents.forEach(messageContent => {
//     const messageLinks = messageContent.querySelectorAll('a');
//     processLinks(messageLinks);
//   });
  
//   console.log('LinkedIn links have been highlighted based on safety check results');
// }

// // This function runs in the context of the webpage to grab links from email content (Gmail)
// function grabGmailLinks() {
//   // Target the specific div with classes "ii gt" that contains the email content
//   const emailContentContainer = document.querySelector('div.ii.gt');
  
//   // If we can't find the container, return an empty array
//   if (!emailContentContainer) {
//     console.log('Email content container not found');
//     return [];
//   }
  
//   // Get only links within the email content container
//   const linkElements = emailContentContainer.querySelectorAll('a');
//   const links = [];
  
//   linkElements.forEach(link => {
//     if (link.href) {
//       links.push(link.href);
//     }
//   });
  
//   console.log('Found ' + links.length + ' links in email content');
//   return links;
// }

// // Function to highlight links in Gmail
// function highlightLinks(urlResults) {
//   const emailContentContainer = document.querySelector('div.ii.gt');
//   if (!emailContentContainer) {
//     console.log('Email content container not found when highlighting');
//     return;
//   }
  
//   const linkElements = emailContentContainer.querySelectorAll('a');
//   console.log(`Found ${linkElements.length} links to highlight`);

//   linkElements.forEach(link => {
//     const url = link.href;
//     const result = urlResults[url];

//     if (result) {
//       if (result.is_phishing !== 0) {
//         link.style.color = 'red';
//         link.style.fontWeight = 'bold';
//         link.style.textDecoration = 'line-through';
//         link.title = 'Warning: This link may be malicious';
        
//         console.log(`Marked malicious link: ${url}`);
//       }
//       else if(result.is_phishing === 0) {
//         link.style.color = 'green';
//         link.style.fontWeight = 'normal';
//         link.title = 'This link appears to be safe';
        
//         console.log(`Marked safe link: ${url}`);
//       }
//     }
//   });
//   console.log('Links have been highlighted based on safety check results');
// }

// async function loadlinks(links, platform = 'gmail') {
//   try {
//     let userId = localStorage.getItem('fishguard_user_id');
//     if (!userId) {
//       userId = 'user_' + Math.random().toString(36).substring(2, 15);
//       localStorage.setItem('fishguard_user_id', userId);
//     }
//     console.log('[FishGuard] Using user ID:', userId);
//     const urlResults = new Map();
//     let phishingLinkCount = 0;
    
//     for (const url of links) {
//       const payload = {
//         url: url,
//         source: platform,
//         user_id: userId
//       };
      
//       try {
//         const response = await fetch("http://localhost:8000/check-url", {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(payload)
//         });
        
//         if (response.ok) {
//           const result = await response.json();
//           urlResults.set(url, result);
//           console.log(`URL checked: ${url}`, result);
          
//           if (result.is_phishing !== 0) {
//             phishingLinkCount++;
//           }
//         } else {
//           console.error(`Error checking URL ${url}: ${response.statusText}`);
//         }
//       } catch (fetchError) {
//         console.error(`Network error checking URL ${url}:`, fetchError);
//       }
//     }
    
//     console.log(`[FishGuard] Found ${phishingLinkCount} phishing links in this scan on ${platform}`);
    
//     // Update statistics if phishing links were found
//     if (phishingLinkCount > 0) {
//       chrome.runtime.sendMessage({ 
//         type: 'updateStats', 
//         data: { 
//           phishingDetectedCount: phishingLinkCount 
//         }
//       }, (response) => {
//         console.log('[FishGuard] Statistics update response:', response);
//         displayStatistics();
//       });
//     }
    
//     // Highlight links based on platform
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//       if (!tabs[0]) {
//         console.error('No active tab found');
//         return;
//       }
      
//       chrome.scripting.executeScript({
//         target: {tabId: tabs[0].id},
//         function: platform === 'linkedin' ? highlightLinkedInLinks : highlightLinks,
//         args: [Object.fromEntries(urlResults)]
//       }).catch(err => console.error(`Error executing script for ${platform}:`, err));
//     });
//   }
//   catch (error) {
//     console.error('Error in loadlinks function:', error);
//   }
// }

// // Add event listener when popup loads
// document.addEventListener('DOMContentLoaded', function() {
//   // Check session status and run timeout logic
//   setupSessionTimeout();
  
//   // Display statistics in the popup
//   displayStatistics();
  
//   // Add scan button functionality
//   const refreshButton = document.getElementById('refreshButton');
//   if (refreshButton) {
//     refreshButton.addEventListener('click', function() {
//       collectLinks();
//     });
//   }
  
//   // Add reset button functionality
//   const resetButton = document.getElementById('resetButton');
//   if (resetButton) {
//     resetButton.addEventListener('click', startNewSession);
//   }
// });

// // Check if we need to start a new session
// function checkAndStartSession() {
//   chrome.storage.local.get(['lastActivity'], (result) => {
//     const now = Date.now();
//     const lastActivity = result.lastActivity || 0;
    
//     // If no session or session is older than 30 minutes
//     if (!lastActivity || (now - lastActivity > 30 * 60 * 1000)) {
//       startNewSession();
//     } else {
//       console.log('[FishGuard] Using existing session, last activity:', new Date(lastActivity).toLocaleString());
//     }
//   });
// }

// // Start a new session with reset statistics
// function startNewSession() {
//   const lastActivity = Date.now();
  
//   chrome.runtime.sendMessage({ type: 'startNewSession' }, (response) => {
//     if (response && response.status === 'success') {
//       chrome.storage.local.set({ lastActivity }, () => {
//         console.log('[FishGuard] New session started:', new Date(lastActivity).toLocaleString());
//         displayStatistics(); // Refresh the UI 
//       });
//     } else {
//       console.error('[FishGuard] Failed to start new session');
//     }
//   });
// }

// // Function to display statistics in the popup
// function displayStatistics() {
//   chrome.runtime.sendMessage({ type: 'getSessionStats' }, (response) => {
//     if (response && response.status === 'success') {
//       const stats = response.stats;
//       const statsContainer = document.getElementById('statistics');
      
//       if (statsContainer) {
//         statsContainer.innerHTML = `
//           <p>Current Session Statistics:</p>
//           <div class="stat-row">
//             <span class="stat-label">Phishing links detected:</span>
//             <span class="stat-value">${stats.phishingDetected}</span>
//           </div>
//           <div class="stat-row">
//             <span class="stat-label">Suspicious jobs detected:</span>
//             <span class="stat-value">${stats.suspiciousJobs}</span>
//           </div>
//           <div class="stat-row">
//             <span class="stat-label">Malicious jobs detected:</span>
//             <span class="stat-value">${stats.maliciousJobs}</span>
//           </div>
//         `;
//       }
//     } else {
//       console.error('[FishGuard] Failed to get session statistics');
//     }
//   });
// }

// // Function to update statistics in background.js
// function updateStatistics(data) {
//   chrome.runtime.sendMessage({ 
//     type: 'updateStats', 
//     data: data 
//   }, (response) => {
//     if (response && response.status === 'success') {
//       console.log('[FishGuard] Statistics updated:', response.stats);
//       displayStatistics(); // Refresh the display
//     } else {
//       console.log('Error updating statistics or service worker inactive');
      
//       // Fallback to update statistics locally
//       chrome.storage.local.get(['statistics'], (result) => {
//         const stats = result.statistics || { phishingDetected: 0, suspiciousJobs: 0, maliciousJobs: 0 };
        
//         if (data.phishingDetected) {
//           stats.phishingDetected++;
//         }
//         if (data.phishingDetectedCount) {
//           stats.phishingDetected += data.phishingDetectedCount;
//         }
//         if (data.jobStatus === 'suspicious') {
//           stats.suspiciousJobs++;
//         }
//         if (data.jobStatus === 'malicious') {
//           stats.maliciousJobs++;
//         }
        
//         chrome.storage.local.set({ statistics: stats }, () => {
//           console.log('[FishGuard] Statistics updated locally:', stats);
//           displayStatistics(); // Refresh the display
//         });
//       });
//     }
//   });
// }


























































































































































// popup.js for browser extension

// Function to track user activity and reset session after inactivity
function setupSessionTimeout() {
  // Get last activity time or set current time if none exists
  chrome.storage.local.get(['lastActivity'], (result) => {
    const now = Date.now();
    let lastActivity = result.lastActivity || now;
    
    // Check if session has timed out (30 minutes of inactivity)
    if (now - lastActivity > 30 * 60 * 1000) {
      console.log('[FishGuard] Session timed out, starting new session');
      startNewSession();
    } else {
      // Update last activity time
      chrome.storage.local.set({ lastActivity: now });
    }
  });
}

// This function collects links from the email content or LinkedIn pages
function collectLinks() {
  // We need to execute script in the context of the webpage
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
      console.error('No active tab found');
      return;
    }
    
    // First, determine if we're on Gmail or LinkedIn
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: detectPlatform
    }, (results) => {
      if (results && results[0] && results[0].result) {
        const platform = results[0].result;
        console.log(`Detected platform: ${platform}`);
        
        // Execute the appropriate link grabbing function based on platform
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: platform === 'linkedin' ? grabLinkedInLinks : grabGmailLinks
        }, (results) => {
          if (results && results[0] && results[0].result) {
            const links = results[0].result;
            console.log(`${platform} content links:`, links);
            console.log('Total links found:', links.length);
            
            // Update last activity time when scanning
            chrome.storage.local.set({ lastActivity: Date.now() });
            
            // Process the links
            loadlinks(links, platform);
          } else {
            console.error(`No results returned from grabbing links on ${platform}`);
          }
        });
      } else {
        console.error('Could not detect platform');
      }
    });
  });
}

// Detect whether we're on Gmail or LinkedIn
function detectPlatform() {
  // Check for LinkedIn-specific elements
  const linkedInElements = document.querySelector('.feed-shared-update-v2') || 
                          document.querySelector('.msg-s-event-listitem__body') ||
                          document.querySelector('.comments-comment-item__main-content');
                          
  // Check for Gmail-specific elements
  const gmailElements = document.querySelector('div.ii.gt');
  
  if (linkedInElements) {
    return 'linkedin';
  } else if (gmailElements) {
    return 'gmail';
  } else {
    return 'unknown';
  }
}

// Function to grab links from LinkedIn
function grabLinkedInLinks() {
  const links = [];
  
  // 1. LinkedIn Feed Posts - targeted content area only
  const feedPostContents = document.querySelectorAll('.feed-shared-inline-show-more-text, .feed-shared-inline-show-more-text--minimal-padding, .feed-shared-inline-show-more-text--2-lines');
  feedPostContents.forEach(contentArea => {
    const contentLinks = contentArea.querySelectorAll('a');
    contentLinks.forEach(link => {
      if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
        links.push(link.href);
      }
    });
  });
  
  // 2. LinkedIn Post Comments - targeted comment text only
  const commentContents = document.querySelectorAll('.comments-comment-item__main-content');
  commentContents.forEach(commentContent => {
    const commentLinks = commentContent.querySelectorAll('a');
    commentLinks.forEach(link => {
      if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
        links.push(link.href);
      }
    });
  });
  
  // 3. LinkedIn Direct Messages - targeted message content only
  const messageContents = document.querySelectorAll('.msg-s-event-listitem__body');
  messageContents.forEach(messageContent => {
    const messageLinks = messageContent.querySelectorAll('a');
    messageLinks.forEach(link => {
      if (link.href && !link.href.includes('linkedin.com/messaging/')) {
        links.push(link.href);
      }
    });
  });
  
  // Remove duplicates
  const uniqueLinks = [...new Set(links)];
  console.log('Found ' + uniqueLinks.length + ' links in LinkedIn content');
  return uniqueLinks;
}

// Function to highlight links in LinkedIn
function highlightLinkedInLinks(urlResults) {
  console.log('Starting LinkedIn link highlighting with specific targeting');
  
  // Helper function to process links
  function processLinks(linkElements) {
    linkElements.forEach(link => {
      const url = link.href;
      const result = urlResults[url];
      
      if (result) {
        if (result.is_phishing !== 0) {
          link.style.color = 'red';
          link.style.fontWeight = 'bold';
          link.style.textDecoration = 'line-through';
          link.title = 'Warning: This link may be malicious';
          console.log(`Marked malicious link in LinkedIn: ${url}`);
        }
        else if(result.is_phishing === 0) {
          link.style.color = 'green';
          link.title = 'This link appears to be safe';
          console.log(`Marked safe link in LinkedIn: ${url}`);
        }
      }
    });
  }
  
  // Process LinkedIn Feed Posts - content area only
  const feedPostContents = document.querySelectorAll('.feed-shared-inline-show-more-text, .feed-shared-inline-show-more-text--minimal-padding, .feed-shared-inline-show-more-text--2-lines');
  feedPostContents.forEach(contentArea => {
    const contentLinks = contentArea.querySelectorAll('a');
    processLinks(contentLinks);
  });
  
  // Process LinkedIn Post Comments - comment text only
  const commentContents = document.querySelectorAll('.comments-comment-item__main-content');
  commentContents.forEach(commentContent => {
    const commentLinks = commentContent.querySelectorAll('a');
    processLinks(commentLinks);
  });
  
  // Process LinkedIn Direct Messages - message content only
  const messageContents = document.querySelectorAll('.msg-s-event-listitem__body');
  messageContents.forEach(messageContent => {
    const messageLinks = messageContent.querySelectorAll('a');
    processLinks(messageLinks);
  });
  
  console.log('LinkedIn links have been highlighted based on safety check results');
}

// This function runs in the context of the webpage to grab links from email content (Gmail)
function grabGmailLinks() {
  // Target the specific div with classes "ii gt" that contains the email content
  const emailContentContainer = document.querySelector('div.ii.gt');
  
  // If we can't find the container, return an empty array
  if (!emailContentContainer) {
    console.log('Email content container not found');
    return [];
  }
  
  // Get only links within the email content container
  const linkElements = emailContentContainer.querySelectorAll('a');
  const links = [];
  
  linkElements.forEach(link => {
    if (link.href) {
      links.push(link.href);
    }
  });
  
  console.log('Found ' + links.length + ' links in email content');
  return links;
}

// Function to highlight links in Gmail
function highlightLinks(urlResults) {
  const emailContentContainer = document.querySelector('div.ii.gt');
  if (!emailContentContainer) {
    console.log('Email content container not found when highlighting');
    return;
  }
  
  const linkElements = emailContentContainer.querySelectorAll('a');
  console.log(`Found ${linkElements.length} links to highlight`);

  linkElements.forEach(link => {
    const url = link.href;
    const result = urlResults[url];

    if (result) {
      if (result.is_phishing !== 0) {
        link.style.color = 'red';
        link.style.fontWeight = 'bold';
        link.style.textDecoration = 'line-through';
        link.title = 'Warning: This link may be malicious';
        
        console.log(`Marked malicious link: ${url}`);
      }
      else if(result.is_phishing === 0) {
        link.style.color = 'green';
        link.style.fontWeight = 'normal';
        link.title = 'This link appears to be safe';
        
        console.log(`Marked safe link: ${url}`);
      }
    }
  });
  console.log('Links have been highlighted based on safety check results');
}

async function loadlinks(links, platform = 'gmail') {
  try {
    let userId = localStorage.getItem('fishguard_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('fishguard_user_id', userId);
    }
    console.log('[FishGuard] Using user ID:', userId);
    const urlResults = new Map();
    let phishingLinkCount = 0;
    
    for (const url of links) {
      const payload = {
        url: url,
        source: platform,
        user_id: userId
      };
      
      try {
        const response = await fetch("http://localhost:8000/check-url", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const result = await response.json();
          urlResults.set(url, result);
          console.log(`URL checked: ${url}`, result);
          
          if (result.is_phishing !== 0) {
            phishingLinkCount++;
          }
        } else {
          console.error(`Error checking URL ${url}: ${response.statusText}`);
        }
      } catch (fetchError) {
        console.error(`Network error checking URL ${url}:`, fetchError);
      }
    }
    
    console.log(`[FishGuard] Found ${phishingLinkCount} phishing links in this scan on ${platform}`);
    
    // Update statistics if phishing links were found
    if (phishingLinkCount > 0) {
      chrome.runtime.sendMessage({ 
        type: 'updateStats', 
        data: { 
          phishingDetectedCount: phishingLinkCount 
        }
      }, (response) => {
        console.log('[FishGuard] Statistics update response:', response);
        displayStatistics();
      });
    }
    
    // Highlight links based on platform
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) {
        console.error('No active tab found');
        return;
      }
      
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: platform === 'linkedin' ? highlightLinkedInLinks : highlightLinks,
        args: [Object.fromEntries(urlResults)]
      }).catch(err => console.error(`Error executing script for ${platform}:`, err));
    });
  }
  catch (error) {
    console.error('Error in loadlinks function:', error);
  }
}

// Add event listener when popup loads
document.addEventListener('DOMContentLoaded', function() {
  // Check session status and run timeout logic
  setupSessionTimeout();
  
  // Display statistics in the popup
  displayStatistics();
  
  // Add scan button functionality
  const refreshButton = document.getElementById('refreshButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', function() {
      collectLinks();
    });
  }
  
  // Add reset button functionality
  const resetButton = document.getElementById('resetButton');
  if (resetButton) {
    resetButton.addEventListener('click', startNewSession);
  }
});

// Check if we need to start a new session
function checkAndStartSession() {
  chrome.storage.local.get(['lastActivity'], (result) => {
    const now = Date.now();
    const lastActivity = result.lastActivity || 0;
    
    // If no session or session is older than 30 minutes
    if (!lastActivity || (now - lastActivity > 30 * 60 * 1000)) {
      startNewSession();
    } else {
      console.log('[FishGuard] Using existing session, last activity:', new Date(lastActivity).toLocaleString());
    }
  });
}

// Start a new session with reset statistics
function startNewSession() {
  const lastActivity = Date.now();
  
  chrome.runtime.sendMessage({ type: 'startNewSession' }, (response) => {
    if (response && response.status === 'success') {
      chrome.storage.local.set({ lastActivity }, () => {
        console.log('[FishGuard] New session started:', new Date(lastActivity).toLocaleString());
        displayStatistics(); // Refresh the UI 
      });
    } else {
      console.error('[FishGuard] Failed to start new session');
    }
  });
}

// Function to display statistics in the popup
function displayStatistics() {
  chrome.runtime.sendMessage({ type: 'getSessionStats' }, (response) => {
    if (response && response.status === 'success') {
      const stats = response.stats;
      const statsContainer = document.getElementById('statistics');
      
      if (statsContainer) {
        statsContainer.innerHTML = `
          <p>Current Session Statistics:</p>
          <div class="stat-row">
            <span class="stat-label">Phishing links detected:</span>
            <span class="stat-value">${stats.phishingDetected}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Suspicious jobs detected:</span>
            <span class="stat-value">${stats.suspiciousJobs}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Malicious jobs detected:</span>
            <span class="stat-value">${stats.maliciousJobs}</span>
          </div>
        `;
      }
    } else {
      console.error('[FishGuard] Failed to get session statistics');
    }
  });
}

// Function to update statistics in background.js
function updateStatistics(data) {
  chrome.runtime.sendMessage({ 
    type: 'updateStats', 
    data: data 
  }, (response) => {
    if (response && response.status === 'success') {
      console.log('[FishGuard] Statistics updated:', response.stats);
      displayStatistics(); // Refresh the display
    } else {
      console.log('Error updating statistics or service worker inactive');
      
      // Fallback to update statistics locally
      chrome.storage.local.get(['statistics'], (result) => {
        const stats = result.statistics || { phishingDetected: 0, suspiciousJobs: 0, maliciousJobs: 0 };
        
        if (data.phishingDetected) {
          stats.phishingDetected++;
        }
        if (data.phishingDetectedCount) {
          stats.phishingDetected += data.phishingDetectedCount;
        }
        if (data.jobStatus === 'suspicious') {
          stats.suspiciousJobs++;
        }
        if (data.jobStatus === 'malicious') {
          stats.maliciousJobs++;
        }
        
        chrome.storage.local.set({ statistics: stats }, () => {
          console.log('[FishGuard] Statistics updated locally:', stats);
          displayStatistics(); // Refresh the display
        });
      });
    }
  });
}
              










































// // popup.js for browser extension

// // This function collects links from the email content or LinkedIn pages
// function collectLinks() {
//   // We need to execute script in the context of the webpage
//   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     if (!tabs[0]) {
//       console.error('No active tab found');
//       return;
//     }
    
//     // First, determine if we're on Gmail or LinkedIn
//     chrome.scripting.executeScript({
//       target: {tabId: tabs[0].id},
//       function: detectPlatform
//     }, (results) => {
//       if (results && results[0] && results[0].result) {
//         const platform = results[0].result;
//         console.log(`Detected platform: ${platform}`);
        
//         // Execute the appropriate link grabbing function based on platform
//         chrome.scripting.executeScript({
//           target: {tabId: tabs[0].id},
//           function: platform === 'linkedin' ? grabLinkedInLinks : grabAllLinks
//         }, (results) => {
//           if (results && results[0] && results[0].result) {
//             const links = results[0].result;
//             console.log(`${platform} content links:`, links);
//             console.log('Total links found:', links.length);
            
//             // Process the links
//             loadlinks(links, platform);
//           } else {
//             console.error(`No results returned from grabbing links on ${platform}`);
//           }
//         });
//       } else {
//         console.error('Could not detect platform');
//       }
//     });
//   });
// }
// function detectPlatform() {
//   // Check for LinkedIn-specific elements
//   const linkedInElements = document.querySelector('.feed-shared-update-v2') || 
//                           document.querySelector('.msg-s-event-listitem__body') ||  //.msg-s-event-listitem__body.t-14.t-black--light.t-normal
//                           document.querySelector('.comments-comment-item__main-content');
                          
//   // Check for Gmail-specific elements
//   const gmailElements = document.querySelector('div.ii.gt');
  
//   if (linkedInElements) {
//     return 'linkedin';
//   } else if (gmailElements) {
//     return 'gmail';
//   } else {
//     return 'unknown';
//   }
// }
// // Function to grab links from LinkedIn
// function grabLinkedInLinks() {
//   const links = [];
  
//   // 1. LinkedIn Feed Posts - targeted content area only
//   const feedPostContents = document.querySelectorAll('.feed-shared-inline-show-more-text, .feed-shared-inline-show-more-text--minimal-padding, .feed-shared-inline-show-more-text--2-lines');
//   feedPostContents.forEach(contentArea => {
//     const contentLinks = contentArea.querySelectorAll('a');
//     contentLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // 2. LinkedIn Post Comments - targeted comment text only
//   const commentContents = document.querySelectorAll('.comments-comment-item__main-content');
//   commentContents.forEach(commentContent => {
//     const commentLinks = commentContent.querySelectorAll('a');
//     commentLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // 3. LinkedIn Direct Messages - targeted message content only
//   const messageContents = document.querySelectorAll('.msg-s-event-listitem__body');  //.msg-s-event-listitem__body.t-14.t-black--light.t-normal
//   messageContents.forEach(messageContent => {
//     const messageLinks = messageContent.querySelectorAll('a');
//     messageLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/messaging/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // Remove duplicates
//   const uniqueLinks = [...new Set(links)];
//   console.log('Found ' + uniqueLinks.length + ' links in LinkedIn content');
//   return uniqueLinks;
// }
// // Function to highlight links in LinkedIn
// function highlightLinkedInLinks(urlResults) {
//   console.log('Starting LinkedIn link highlighting with specific targeting');
  
//   // Helper function to process links
//   function processLinks(linkElements) {
//     linkElements.forEach(link => {
//       const url = link.href;
//       const result = urlResults[url];
      
//       if (result) {
//         if (result.is_phishing !== 0) {
//           link.style.color = 'red';
//           link.style.fontWeight = 'bold';
//           link.style.textDecoration = 'line-through';
//           link.title = 'Warning: This link may be malicious';
//           console.log(`Marked malicious link in LinkedIn: ${url}`);
//         }
//         else if(result.is_phishing === 0) {
//           link.style.color = 'green';
//           link.title = 'This link appears to be safe';
//           console.log(`Marked safe link in LinkedIn: ${url}`);
//         }
//       }
//     });
//   }
  
//   // Process LinkedIn Feed Posts - content area only
//   const feedPostContents = document.querySelectorAll('.feed-shared-inline-show-more-text, .feed-shared-inline-show-more-text--minimal-padding, .feed-shared-inline-show-more-text--2-lines');
//   feedPostContents.forEach(contentArea => {
//     const contentLinks = contentArea.querySelectorAll('a');
//     processLinks(contentLinks);
//   });
  
//   // Process LinkedIn Post Comments - comment text only
//   const commentContents = document.querySelectorAll('.comments-comment-item__main-content');
//   commentContents.forEach(commentContent => {
//     const commentLinks = commentContent.querySelectorAll('a');
//     processLinks(commentLinks);
//   });
  
//   // Process LinkedIn Direct Messages - message content only
//   const messageContents = document.querySelectorAll('.msg-s-event-listitem__body'); //.msg-s-event-listitem__body.t-14.t-black--light.t-normal
//   messageContents.forEach(messageContent => {
//     const messageLinks = messageContent.querySelectorAll('a');
//     processLinks(messageLinks);
//   });
  
//   console.log('LinkedIn links have been highlighted based on safety check results');
// }

// async function loadlinks(links, platform = 'gmail') {
//   try {
//     let userId = localStorage.getItem('fishguard_user_id');
//     if (!userId) {
//       userId = 'user_' + Math.random().toString(36).substring(2, 15);
//       localStorage.setItem('fishguard_user_id', userId);
//     }
//     console.log('[FishGuard] Using user ID:', userId);
//     const urlResults = new Map();
//     let phishingLinkCount = 0;
    
//     for (const url of links) {
//       const payload = {
//         url: url,
//         source: platform, // Now dynamically set to 'gmail' or 'linkedin'
//         user_id: userId
//       };
      
//       try {
//         const response = await fetch("http://localhost:8000/check-url", {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(payload)
//         });
        
//         if (response.ok) {
//           const result = await response.json();
//           urlResults.set(url, result);
//           console.log(`URL checked: ${url}`, result);
          
//           if (result.is_phishing !== 0) {
//             phishingLinkCount++;
//           }
//         } else {
//           console.error(`Error checking URL ${url}: ${response.statusText}`);
//         }
//       } catch (fetchError) {
//         console.error(`Network error checking URL ${url}:`, fetchError);
//       }
//     }
    
//     console.log(`[FishGuard] Found ${phishingLinkCount} phishing links in this scan on ${platform}`);
    
//     // Update statistics if phishing links were found
//     if (phishingLinkCount > 0) {
//       chrome.storage.local.get(['statistics'], (result) => {
//         const stats = result.statistics || { phishingDetected: 0, suspiciousJobs: 0, maliciousJobs: 0 };
//         stats.phishingDetected += phishingLinkCount;
        
//         chrome.storage.local.set({ statistics: stats }, () => {
//           console.log(`[FishGuard] Statistics updated: added ${phishingLinkCount} phishing links`);
//           chrome.runtime.sendMessage({ 
//             type: 'updateStats', 
//             data: { 
//               phishingDetectedCount: phishingLinkCount 
//             }
//           });
//           displayStatistics();
//         });
//       });
//     }
    
//     // Highlight links based on platform
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//       if (!tabs[0]) {
//         console.error('No active tab found');
//         return;
//       }
      
//       chrome.scripting.executeScript({
//         target: {tabId: tabs[0].id},
//         function: platform === 'linkedin' ? highlightLinkedInLinks : highlightLinks,
//         args: [Object.fromEntries(urlResults)]
//       }).catch(err => console.error(`Error executing script for ${platform}:`, err));
//     });
//   }
//   catch (error) {
//     console.error('Error in loadlinks function:', error);
//   }
// }
// // This function runs in the context of the webpage to grab links from email content
// function grabAllLinks() {
//   // Target the specific div with classes "ii gt" that contains the email content
//   const emailContentContainer = document.querySelector('div.ii.gt');
  
//   // If we can't find the container, return an empty array
//   if (!emailContentContainer) {
//     console.log('Email content container not found');
//     return [];
//   }
  
//   // Get only links within the email content container
//   const linkElements = emailContentContainer.querySelectorAll('a');
//   const links = [];
  
//   linkElements.forEach(link => {
//     if (link.href) {
//       links.push(link.href);
//     }
//   });
  
//   console.log('Found ' + links.length + ' links in email content');
//   return links;
// }

// // Add event listener when popup loads
// //this block of code is responsible for initializing the popup UI
// document.addEventListener('DOMContentLoaded', function() {
//   // Check if we need to start a new session
//   checkAndStartSession();
  
//   // Display statistics in the popup
//   displayStatistics();
  
//   // Add scan button functionality
//   const refreshButton = document.getElementById('refreshButton');
//   if (refreshButton) {
//     refreshButton.addEventListener('click', function() {
//       collectLinks();
//     });
//   }
  
//   // Add reset button functionality
//   const resetButton = document.getElementById('resetButton');
//   if (resetButton) {
//     resetButton.addEventListener('click', startNewSession);
//   }
// });

// // Check if we need to start a new session
// function checkAndStartSession() {
//   chrome.storage.local.get(['sessionStart'], (result) => {
//     const now = Date.now();
//     const sessionStart = result.sessionStart || 0;
    
//     // If no session or session is older than 30 minutes
//     if (!sessionStart || (now - sessionStart > 30 * 60 * 1000)) {
//       startNewSession();
//     } else {
//       console.log('[FishGuard] Using existing session');
//     }
//   });
// }

// // Start a new session with reset statistics
// function startNewSession() {
//   const sessionStart = Date.now();
  
//   chrome.runtime.sendMessage({ type: 'startNewSession' }, (response) => { //Sends a message to background.js, requesting a new session.
//     if (response && response.status === 'success') {
//       chrome.storage.local.set({ sessionStart }, () => {
//         console.log('[FishGuard] New session started:', sessionStart);
//         displayStatistics(); // Refresh the UI 
//       });
//     } else {
//       console.error('[FishGuard] Failed to start new session');
//     }
//   });
// }

// // Function to display statistics in the popup
// function displayStatistics() {
//   chrome.runtime.sendMessage({ type: 'getSessionStats' }, (response) => { //Sends a message to background.js to Requests the current session statistics from chrome.storage.local.
//     if (response && response.status === 'success') { //background.js listens fur the abov messag t gr sesson stats
//       const stats = response.stats;
//       const statsContainer = document.getElementById('statistics');
//       /*When popup.js requests statistics, background.js 
//       retrieves the stored statistics from chrome.storage.local.*/
//       /*It then sends back an object like
//       {
//         "status": "success",
//         "stats": {
//           "phishingDetected": 5,
//           "suspiciousJobs": 2,
//           "maliciousJobs": 1
//         },
//         "sessionId": "abc123"
//       }
//       */
//       if (statsContainer) {
//         statsContainer.innerHTML = `
//           <p>Current Session Statistics:</p>
//           <div class="stat-row">
//             <span class="stat-label">Phishing links detected:</span>
//             <span class="stat-value">${stats.phishingDetected}</span>
//           </div>
//           <div class="stat-row">
//             <span class="stat-label">Suspicious jobs detected:</span>
//             <span class="stat-value">${stats.suspiciousJobs}</span>
//           </div>
//           <div class="stat-row">
//             <span class="stat-label">Malicious jobs detected:</span>
//             <span class="stat-value">${stats.maliciousJobs}</span>
//           </div>
//         `;
//       }
//     } else {
//       console.error('[FishGuard] Failed to get session statistics');
//     }
//   });
// }

// async function loadlinks(links) {
//   /*The loadlinks() function is an async function responsible for:

// Sending extracted links to the backend API (app.py) for phishing analysis.
// Updating phishing detection statistics in chrome.storage.local.
// Highlighting detected phishing links inside the Gmail email body.
// */
//   try {
//     let userId = localStorage.getItem('fishguard_user_id');
//     //let userID = "0100"
//     if (!userId) {
//       userId = 'user_' + Math.random().toString(36).substring(2, 15);
//       localStorage.setItem('fishguard_user_id', userId);
//     }
//     console.log('[FishGuard] Using user ID:', userId); // Add this debug line
//     const urlResults = new Map();//stores api results of each url
//     let phishingLinkCount = 0;
//     /*Retrieves a unique user ID from localStorage (fishguard_user_id).
//     If no user ID exists:
//     Generates a random unique user ID.
//     Stores it in localStorage for future use.
//     This ensures that each user has a consistent ID when sending requests to app.py.*/
    
//     for (const url of links) {
//       const payload = { // CHECK-URL API FORMAT
//         url: url,
//         source: 'gmail',
//         user_id: userId
//       };
      
//       try {
//         const response = await fetch("http://localhost:8000/check-url", { //goto backend
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(payload) // convert to JSON format
//         });
        
//         if (response.ok) {
//           const result = await response.json();
//           urlResults.set(url, result);
//           console.log(`URL checked: ${url}`, result);
          
//           // Count phishing links
//           if (result.is_phishing !== 0) {
//             phishingLinkCount++;
//           }
//         } else {
//           console.error(`Error checking URL ${url}: ${response.statusText}`);
//         }
//       } catch (fetchError) {
//         console.error(`Network error checking URL ${url}:`, fetchError);
//       }
//     }
    
//     console.log(`[FishGuard] Found ${phishingLinkCount} phishing links in this scan`);
    
//     // Only update if phishing links were found
//     if (phishingLinkCount > 0) {
//       // Get current stats first
//       chrome.storage.local.get(['statistics'], (result) => {
//         const stats = result.statistics || { phishingDetected: 0, suspiciousJobs: 0, maliciousJobs: 0 }; //EITHER GIVE CURRENT  stats or init to zero for new session (through button)
        
//         // Add the new phishing links to the count
//         stats.phishingDetected += phishingLinkCount;
        
//         // Update storage with new count
//         chrome.storage.local.set({ statistics: stats }, () => {
//           console.log(`[FishGuard] Statistics updated: added ${phishingLinkCount} phishing links`);
          
//           // Now also notify background.js about the updated statistics
//           chrome.runtime.sendMessage({ 
//             type: 'updateStats', 
//             data: { 
//               phishingDetectedCount: phishingLinkCount 
//             }
//           });
          
//           // Update the display
//           displayStatistics();
//         });
//       });
//     }
    
//     // Highlight links in the email
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) { //getv avtive tab
//       if (!tabs[0]) {
//         console.error('No active tab found');
//         return;
//       }
      
//       chrome.scripting.executeScript({
//         target: {tabId: tabs[0].id},
//         function: highlightLinks,
//         args: [Object.fromEntries(urlResults)]
//       }).catch(err => console.error('Error executing script:', err));
//     });
//   }
//   catch (error) {
//     console.error('Error in loadlinks function:', error);
//   }
// }

// // Function to update statistics in background.js
// function updateStatistics(data) { //send message to background.js with type : with { type: 'updateStats', data }.

//   chrome.runtime.sendMessage({ 
//     type: 'updateStats', 
//     data: data 
//   }, (response) => {
//     if (response && response.status === 'success') { //Check If Background Script Responds
//       console.log('[FishGuard] Statistics updated:', response.stats);
//       displayStatistics(); // Refresh the display
//     } else {
//       console.log('Error updating statistics or service worker inactive');
      
//       // Fallback to update statistics locally
//       chrome.storage.local.get(['statistics'], (result) => {
//         const stats = result.statistics || { phishingDetected: 0, suspiciousJobs: 0, maliciousJobs: 0 }; //If no statistics exist, initializes them to { phishingDetected: 0, suspiciousJobs: 0, maliciousJobs: 0 }.
        
//         if (data.phishingDetected) {
//           stats.phishingDetected++;
//         }
//         if (data.jobStatus === 'suspicious') {
//           stats.suspiciousJobs++;
//         }
//         if (data.jobStatus === 'malicious') {
//           stats.maliciousJobs++;
//         }
//         //saves the updated statistics back to chrome.storage.local.
//         chrome.storage.local.set({ statistics: stats }, () => {
//           console.log('[FishGuard] Statistics updated locally:', stats);
//           displayStatistics(); // Refresh the display
//         });
//       });
//     }
//   });
// }

// function highlightLinks(urlResults) {
//   const emailContentContainer = document.querySelector('div.ii.gt');
//   if (!emailContentContainer) {
//     console.log('Email content container not found when highlighting');
//     return;
//   }
  
//   const linkElements = emailContentContainer.querySelectorAll('a');
//   console.log(`Found ${linkElements.length} links to highlight`);

//   linkElements.forEach(link => {
//     const url = link.href;
//     const result = urlResults[url];

//     if (result) {
//       if (result.is_phishing !== 0) {
//         link.style.color = 'red';
//         link.style.fontWeight = 'bold';
//         link.style.textDecoration = 'line-through';
//         // link.style.border = '2px solid red';
//         // link.style.padding = '2px 4px';
//         // link.style.borderRadius = '3px';
        
//         link.title = 'Warning: This link may be malicious';
        
//         console.log(`Marked malicious link: ${url}`);
//       }
//       else if(result.is_phishing === 0) {
//         link.style.color = 'green';
//         link.style.fontWeight = 'normal';
        
//         // Add title attribute for tooltip
//         link.title = 'This link appears to be safe';
        
//         console.log(`Marked safe link: ${url}`);
//       }
//     }
//   });
//   console.log('Links have been highlighted based on safety check results');
// }

// // popup.js for browser extension

// // This function collects links from the email content or LinkedIn pages
// function collectLinks() {
//   // We need to execute script in the context of the webpage
//   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) { // this queries the active tab in the current window
//     if (!tabs[0]) {
//       console.error('No active tab found');
//       return;
//     }
    
//     // First, determine if we're on Gmail or LinkedIn
//     chrome.scripting.executeScript({
//       target: {tabId: tabs[0].id},
//       function: detectPlatform
//     }, (results) => {
//       if (results && results[0] && results[0].result) {
//         const platform = results[0].result;
//         console.log(`Detected platform: ${platform}`);
        
//         // Execute the appropriate link grabbing function based on platform
//         chrome.scripting.executeScript({
//           target: {tabId: tabs[0].id},
//           function: platform === 'linkedin' ? grabLinkedInLinks : grabGmailLinks
//         }, (results) => {
//           if (results && results[0] && results[0].result) {
//             const links = results[0].result;
//             console.log(`${platform} content links:`, links);
//             console.log('Total links found:', links.length);
            
//             // Process the links
//             loadlinks(links, platform);
//           } else {
//             console.error(`No results returned from grabbing links on ${platform}`);
//           }
//         });
//       } else {
//         console.error('Could not detect platform');
//       }
//     });
//   });
// }

// // Detect whether we're on Gmail or LinkedIn
// function detectPlatform() {
//   // Check for LinkedIn-specific elements
//   const linkedInElements = document.querySelector('.feed-shared-update-v2') || 
//                           document.querySelector('.msg-convo-wrapper') ||
//                           document.querySelector('.comments-comments-list');
                          
//   // Check for Gmail-specific elements
//   const gmailElements = document.querySelector('div.ii.gt');
  
//   if (linkedInElements) {
//     return 'linkedin';
//   } else if (gmailElements) {
//     return 'gmail';
//   } else {
//     return 'unknown';
//   }
// }

// // This function runs in the context of the webpage to grab links from email content
// function grabGmailLinks() {
//   // Target the specific div with classes "ii gt" that contains the email content
//   const emailContentContainer = document.querySelector('div.ii.gt');
  
//   // If we can't find the container, return an empty array
//   if (!emailContentContainer) {
//     console.log('Email content container not found');
//     return [];
//   }
  
//   // Get only links within the email content container
//   const linkElements = emailContentContainer.querySelectorAll('a');
//   const links = [];
  
//   linkElements.forEach(link => {
//     if (link.href) {
//       links.push(link.href);
//     }
//   });
  
//   console.log('Found ' + links.length + ' links in email content');
//   return links;
// }

// //This function runs in the context of the webpage to grab links from LinkedIn
// function grabLinkedInLinks() {
//   const links = [];
  
//   // 1. LinkedIn Feed Posts
//   const feedPosts = document.querySelectorAll('.feed-shared-update-v2');
//   feedPosts.forEach(post => {
//     const postLinks = post.querySelectorAll('a');
//     postLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // 2. LinkedIn Post Comments
//   const commentLists = document.querySelectorAll('.comments-comments-list');
//   commentLists.forEach(commentList => {
//     const commentLinks = commentList.querySelectorAll('a');
//     commentLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/feed/update/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // 3. LinkedIn Direct Messages
//   const messageContainers = document.querySelectorAll('.msg-convo-wrapper');
//   messageContainers.forEach(container => {
//     const messageLinks = container.querySelectorAll('a');
//     messageLinks.forEach(link => {
//       if (link.href && !link.href.includes('linkedin.com/messaging/')) {
//         links.push(link.href);
//       }
//     });
//   });
  
//   // Remove duplicates
//   const uniqueLinks = [...new Set(links)];
//   console.log('Found ' + uniqueLinks.length + ' links in LinkedIn content');
//   return uniqueLinks;
// }

