from fastapi import FastAPI,HTTPException,Body,Request,Response
from pydantic import BaseModel
from typing import Optional,List,Dict,Any
import os
import json
from gemini_client import GeminiClient
import tensorflow as tf
from model import PhishingDetector
from database import get_phishing_urls,add_phishing_url,update_phishing_url_tag,untag_url,get_fake_job_postings,add_fake_job_posting,update_job_posting_tag,untag_job
from middleware import setup_middleware

app = FastAPI(title='FishGaurd API')

setup_middleware(app)

phishing_detector = PhishingDetector()

gemini_client = GeminiClient()

#define tructure of API requests

class URLCheckRequest(BaseModel): # model for URL checking
    url: str
    content: Optional[str] = None
    source: str #"gmail or "linkedin"
    user_id: Optional[str] = None # Optional user_id for personalized results


class URLTagRequest(BaseModel):
    url: str
    is_phishing: bool
    user_id: str
    source: Optional[str] = "user_tagged"

class JobPostingRequest(BaseModel):
    job_id: str
    job_title: str
    company_name: str
    company_id: Optional[str] = None  # Make optional since Gmail might not have this
    job_description: str
    source: str  # "gmail" or "linkedin"
    email_sender: Optional[str] = None  # For Gmail source
    email_subject: Optional[str] = None  # For Gmail source
    user_id: Optional[str] = None

class JobPostingTagRequest(BaseModel):
    job_id: str
    status: str  # "ok", "suspicious", "malicious"
    user_id: str
    source : Optional[str] = "user_tagged"

class UntagURLRequest(BaseModel):
    url:str
    user_id: str

class UntagJobRequest(BaseModel):
    job_id: str
    user_id: str

@app.get("/")
def read_root():
    return {"message": "Welcome to FishGuard API"}

@app.post("/check-url")
async def check_url(request: URLCheckRequest):
    url_data = get_phishing_urls(request.url,request.user_id) #check for url in MongoDB first

    if url_data:
        response =  {
            'is_phishing':url_data['is_phishing'],
            'source':'database'
        }
        if url_data.get('personalized'):
            response['personalized'] = 1
        
        return response
    
    #if not in database use ml model
    prediction = int(phishing_detector.predict(request.url)[0])
    result_doc = add_phishing_url(request.url, prediction, request.source)
    # Make sure it was actually added to the database
    if not result_doc:
        raise HTTPException(status_code=500, detail="Failed to save URL to database")

    return {"is_phishing": prediction, "source": "model"}

@app.post('/tag-url')
async def tag_url(request: URLTagRequest):
    result = update_phishing_url_tag(request.url,request.is_phishing,request.user_id,request.source)
    if not result:
        raise HTTPException(status_code=404, detail="URL not found in database")
    return {"message": "URL tagged successfully","personalized":1}

@app.post('/untag-url')
async def untag_url_endpoint(request: UntagURLRequest):
    result = untag_url(request.url, request.user_id)
    if not result:
        raise HTTPException(status_code=404, detail="URL not found or no user tag exists")
    return {"message": "URL untagged successfully"}

@app.post("/check-job-posting")
async def check_job_posting(request: JobPostingRequest):
    # Check if job posting exists in MongoDB first
    job_data = get_fake_job_postings(request.job_id,request.user_id)
    
    if job_data:
        # Return stored result if job posting exists
        response = {
            "status": job_data["status"],
            "source": "database"
        }
        if job_data.get('personalized'):
            response['personalized'] = 1
            
        return response
    
    # Prepare the prompt based on the source
    if request.source == "gmail":
        prompt = f"""
        Analyze this job posting from an email and classify it as one of these categories:
        "ok" - legitimate job posting
        "suspicious" - has some red flags but not clearly fake
        "malicious" - clearly a scam or fake job posting
        
        Email Subject: {request.email_subject}
        Email Sender: {request.email_sender}
        Job Title: {request.job_title}
        Email Content: {request.job_description}
        
        Return only one word: ok, suspicious, or malicious.
        """
    else:  # LinkedIn
        prompt = f"""
        Analyze this job posting from LinkedIn and classify it as one of these categories:
        "ok" - legitimate job posting
        "suspicious" - has some red flags but not clearly fake
        "malicious" - clearly a scam or fake job posting
        
        Job Title: {request.job_title}
        Company: {request.company_name}
        Description: {request.job_description}
        
        Return only one word: ok, suspicious, or malicious.
        """
    
    # Use Gemini API to classify job posting
    try:
        # Updated to use the gemini_client
        result = gemini_client.analyze_job_posting_with_prompt(prompt)
        
        # Store in database
        job_doc = add_fake_job_posting(
            job_id=request.job_id,
            job_title=request.job_title,
            company_name=request.company_name,
            company_id=request.company_id,
            source=request.source,
            status=result,
            email_sender=request.email_sender,
            email_subject=request.email_subject
        )
        if not job_doc:
            raise HTTPException(status_code=500, detail="Failed to save job posting to database")
        
        return {"status": result, "source": "gemini"}
    except Exception as e:
        # Log the error
        print(f"Error analyzing job posting: {str(e)}")
        return {"status": "suspicious", "source": "error", "error": str(e)}
    
@app.post("/tag-job-posting")
async def tag_job_posting(request: JobPostingTagRequest):
    result = update_job_posting_tag(request.job_id,request.status,request.user_id,request.source)
    if not result:
        raise HTTPException(status_code=404,detail="Job posting not found in database")
    return {"message": "Job posting tagged successfully","personalized":1}

@app.post("/untag-job-posting")
async def untag_job_posting(request: UntagJobRequest):
    result = untag_job(request.job_id, request.user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Job posting not found or no user tag exists")
    return {"message": "Job posting untagged successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)