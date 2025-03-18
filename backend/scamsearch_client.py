import os
import requests

class ScamSearchClient:
    def __init__(self):
        api_key = os.environ.get("SCAMSEARCH_API_KEY")
        if not api_key:
            raise ValueError("Missing SCAMSEARCH_API_KEY environment variable")
        self.api_key = api_key
        self.base_url = "https://api.scamsearch.io/v1"
    
    def analyze_job_posting(self,company_name,job_title,job_description,email_sender=None):
        headers = {
            "Content-Type":"application/json",
            "Authorization":f"Bearer {self.api_key}"
        }
        data = {
            "company_name":company_name,
            "job_title":job_title,
            "job_descriiption":job_description
        }

        if email_sender:
            data['email'] = email_sender
        
        try:
            response  = requests.post(
                f"{self.base_url}/jobs/analyze",
                headers=headers,
                json=data  
            )
            if response.status_code == 200:
                result = response.json()
                confidence = result.get("confidence",0)
                is_scam = result.get("is_scam",False)

                if confidence >= 0.8:
                    status = "malicious" if is_scam else "ok"
                else:
                    status = "suspicious"
                
                return {
                    "status":status,
                    "confidence":confidence,
                    "source":"scamsearch"
                }
            else: #if api returns an error
                return {
                    "status":"suspicious",
                    "confidence":0,
                    "source":"error",
                    "error":f"API error: {response.status_code}"
                }
        except Exception as e:
            return {
                "status":"suspicious",
                "confidence":0,
                "source":"error",
                "error":str(e)
            }