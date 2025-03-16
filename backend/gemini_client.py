# gemini_client.py
import os
import google.generativeai as genai
from google.generativeai import types

class GeminiClient:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Missing GEMINI_API_KEY environment variable")
        genai.configure(api_key=api_key)
        #self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash"

    def analyze_job_posting_with_prompt(self, prompt):
        model = genai.GenerativeModel(self.model)
        response = model.generate_content(prompt)
        
        result = response.text.strip().lower()
        
        # Validate result
        if result not in ["ok", "suspicious", "malicious"]:
            result = "suspicious"  # Default to suspicious if invalid response
            
        return result
    
    # def analyze_job_posting(self, job_title, company_name, job_description):
    
    #     prompt = f"""
    #     Analyze this job posting and classify it as one of these categories:
    #     "ok" - legitimate job posting
    #     "suspicious" - has some red flags but not clearly fake
    #     "malicious" - clearly a scam or fake job posting
        
    #     Job Title: {job_title}
    #     Company: {company_name}
    #     Description: {job_description}
        
    #     Return only one word: ok, suspicious, or malicious.
    #     """
        
    #     contents = [
    #         types.Content(
    #             role="user",
    #             parts=[types.Part.from_text(text=prompt)],
    #         ),
    #     ]
        
    #     generate_content_config = types.GenerateContentConfig(
    #         temperature=0.2,  # Lower temperature for more consistent responses
    #         top_p=0.95,
    #         top_k=40,
    #         max_output_tokens=10,  # We only need a short response
    #         response_mime_type="text/plain",
    #     )
        
    #     response = self.client.models.generate_content(
    #         model=self.model,
    #         contents=contents,
    #         config=generate_content_config,
    #     )
        
    #     result = response.text.strip().lower()
        
    #     # Validate result
    #     if result not in ["ok", "suspicious", "malicious"]:
    #         result = "suspicious"  # Default to suspicious if invalid response
            
    #     return result
