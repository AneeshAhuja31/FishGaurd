import os
import requests
import hashlib

class VirusTotalClient:
    def __init__(self):
        #api_key = os.environ.get("VIRUSTOTAL_API_KEY")
        api_key = "11792b5654624f02a49779635e40fcb2e55ab5592c36a8093430ebc271a10728"
        if not api_key:
            raise ValueError("Missing VIRUSTOTAL_API_KEY environment variable")
        self.api_key = api_key
        self.base_url = "https://www.virustotal.com/api/v3"
        
    def check_url(self, url):
        headers = {
            "x-apikey": self.api_key
        }
        
        try:
            # URL needs to be encoded for the API
            url_id = hashlib.sha256(url.encode()).hexdigest()
            
            # First try to get existing report
            response = requests.get(
                f"{self.base_url}/urls/{url_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                # Calculate is_phishing based on VirusTotal's analysis
                stats = result.get('data', {}).get('attributes', {}).get('last_analysis_stats', {})
                malicious_count = stats.get('malicious', 0)
                suspicious_count = stats.get('suspicious', 0)
                
                # If more than 2 engines flag it as malicious or suspicious, consider it phishing
                is_phishing = 1 if (malicious_count + suspicious_count) > 2 else 0
                
                return {
                    "is_phishing": is_phishing,
                    "source": "virustotal",
                    "malicious_count": malicious_count,
                    "suspicious_count": suspicious_count
                }
                
            elif response.status_code == 404:
                # URL not found in VirusTotal database
                # Submit the URL for analysis
                submit_url = f"{self.base_url}/urls"
                payload = {"url": url}
                submit_response = requests.post(submit_url, headers=headers, data=payload)
                
                if submit_response.status_code == 200:
                    # Default to suspicious since analysis is pending
                    return {
                        "is_phishing": 1,  # Treat as suspicious until confirmed
                        "source": "virustotal",
                        "status": "pending_analysis"
                    }
                else:
                    return {
                        "is_phishing": 1,  # Default to suspicious on error
                        "source": "error",
                        "error": f"Failed to submit URL to VirusTotal: {submit_response.status_code}"
                    }
            else:
                return {
                    "is_phishing": 1,  #default to sus on error
                    "source": "error",
                    "error": f"VirusTotal API error: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "is_phishing": 1,  # def to sus om error
                "source": "error",
                "error": str(e)
            }