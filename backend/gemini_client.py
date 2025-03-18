import os
import google.generativeai as genai
from dotenv import load_dotenv
load_dotenv()

class GeminiClient:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Missing GEMINI_API_KEY environment variable")
        genai.configure(api_key=api_key)
        self.model = "gemini-2.0-flash"

    def analyze_job_posting_with_prompt(self, prompt):
        model = genai.GenerativeModel(self.model)
        response = model.generate_content(prompt)
        
        result = response.text.strip().lower()
        
        if result not in ["ok", "suspicious", "malicious"]:
            result = "suspicious"  # def to sus if invalid response
            
        return result
    
    #not in use:
    def analyze_phishing_url(self, url, content, context="a website"):
        """
        Analyze a URL to determine if it's a phishing attempt.
        
        Args:
            url: The URL to analyze
            content: The content associated with the URL (email body, message text, etc.)
            context: Context where this URL was found (email, LinkedIn, etc.)
            
        Returns:
            bool: True if the URL is likely phishing, False if likely safe
        """
        model = genai.GenerativeModel(self.model)
        
        prompt = f"""
        Analyze this URL found in {context} and determine if it's a phishing attempt.
        
        URL: {url}
        Content: {content}
        
        Consider these factors:
        - Domain typosquatting (looks like a legitimate domain but with slight variations)
        - Unusual subdomains or URL patterns
        - Mismatches between the link text and actual URL destination
        - Use of URL shorteners in suspicious contexts
        - Urgency or threats in the surrounding content
        - Requests for personal information or credentials
        - Poor grammar or spelling in the content
        
        Return only one word: "phishing" or "safe".
        """
        
        response = model.generate_content(prompt)
        result = response.text.strip().lower()
        
        if result == "phishing":
            return True
        else:
            return False