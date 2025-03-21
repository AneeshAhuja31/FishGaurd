from pymongo import MongoClient
import os
from datetime import datetime

try:
    #MONGO_URI = os.getenv('MONGO_URI', "mongodb://localhost:27017")
    MONGO_URI = "mongodb+srv://divyanshtulsiani01:MyItsDdB8s8tKJlv@cluster0.ns4rp.mongodb.net/"
    client = MongoClient(MONGO_URI)
    db = client['fishgaurd'] #create a db
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    exit(1)

phishing_urls = db['phishing_urls'] #global collections
job_postings = db['job_postings']

user_url_tags = db['user_url_tags'] #user specific collection
user_job_tags = db['user_job_tags']


#create indexes for faster lookups
phishing_urls.create_index('url', unique=True)
job_postings.create_index("job_id", unique=True)
user_url_tags.create_index([("user_id", 1), ("url", 1)], unique=True)
user_job_tags.create_index([("user_id", 1), ("job_id", 1)], unique=True)


def get_phishing_urls(url, user_id=None):
    #get URL data with user-specific tagging if available
    global_data = phishing_urls.find_one({'url': url})

    if not global_data:
        return global_data
    
    if not user_id:
        return global_data
    
    user_tag = user_url_tags.find_one({
        'user_id': user_id,
        'url': url
    })
    
    if user_tag: #if user has tagged this url override global is_phishing value 
        result = global_data.copy()  # Create a copy to avoid modifying the global data
        result['is_phishing'] = int(user_tag['is_phishing'])
        result['personalized'] = True
        
        # Add this debug line to see what's being returned
        print(f"User tag found for {url}: is_phishing={result['is_phishing']}, source={user_tag.get('source', 'unknown')}")
        return result
    return global_data

def add_phishing_url(url, is_phishing, source, user_id=None):
    doc = {
        "url": url,
        "is_phishing": int(is_phishing),
        "source": source,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }
    
    result = phishing_urls.update_one( #update global URL database
        {'url': url},
        {'$set': doc},
        upsert=True
    )
    
    # Auto-tag for user if URL is phishing and user_id is provided
    if user_id and int(is_phishing) == 1:
        add_url_tag(url, is_phishing, user_id, source)
    
    return phishing_urls.find_one({'url': url})

def add_url_tag(url, is_phishing, user_id, source="auto_tagged"): #user specific tag
    tag_doc = {
        'user_id': user_id,
        'url': url,
        'is_phishing': int(is_phishing),
        'source': source,
        'tagged_at': datetime.now()
    }
    result = user_url_tags.update_one(
        {
            'user_id': user_id,
            'url': url
        },
        {'$set': tag_doc},
        upsert=True
    )
    return result

def update_phishing_url_tag(url, is_phishing, user_id, source="user_tagged"): #update user specific tag for a URL
    #first verify url exists in global db
    global_url = phishing_urls.find_one({'url': url})
    if not global_url:
        doc = {
            "url": url,
            "is_phishing": int(is_phishing),
            "source": source,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        phishing_urls.insert_one(doc)
    
    tag_result = add_url_tag(url, is_phishing, user_id, source)
    return tag_result.modified_count > 0 or tag_result.upserted_id is not None




def untag_url(url, user_id):
    global_url = phishing_urls.find_one({'url': url})
    if not global_url:
        return False
    
    # Remove the user tag completely instead of setting to opposite value
    result = user_url_tags.delete_one({
        'user_id': user_id,
        'url': url
    })
    
    return result.deleted_count > 0

def get_fake_job_postings(job_id, user_id=None):
    #get job posting with user-specific tagging if available
    global_data = job_postings.find_one({'job_id': job_id})

    if not global_data:
        return global_data
    
    if not user_id:
        return global_data
    
    user_tag = user_job_tags.find_one({
        'user_id': user_id,
        'job_id': job_id
    })
    if user_tag:
        result = global_data.copy()  # Create a copy to avoid modifying the global data
        result['status'] = user_tag['status']
        result['personalized'] = True
        return result
    return global_data

def add_fake_job_posting(job_id, job_title, company_name, status, source, company_id=None, email_sender=None, email_subject=None, user_id=None):
    doc = {
        "job_id": job_id,
        "job_title": job_title,
        "company_name": company_name,
        "status": status,
        "source": source,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }
    
    if company_id:
        doc["company_id"] = company_id
    if email_sender:
        doc["email_sender"] = email_sender
    if email_subject:
        doc["email_subject"] = email_subject
    
    result = job_postings.update_one(
        {'job_id': job_id},
        {'$set': doc},
        upsert=True
    )
    
    # Auto-tag for user if job is malicious or suspicious and user_id is provided
    if user_id and status in ["malicious", "suspicious"]:
        add_job_tag(job_id, status, user_id, source)
    
    return job_postings.find_one({'job_id': job_id})

def add_job_tag(job_id, status, user_id, source="auto_tagged"):
    tag_doc = {
        'user_id': user_id,
        'job_id': job_id,
        'status': status,
        'source': source,
        'tagged_at': datetime.now()
    }
    result = user_job_tags.update_one(
        {
            'user_id': user_id,
            'job_id': job_id
        },
        {'$set': tag_doc},
        upsert=True
    )
    return result

def update_job_posting_tag(job_id, status, user_id, source="user_tagged"):
    global_job = job_postings.find_one({'job_id': job_id})
    if not global_job:
        #insert into global collec if it doesnt exist
        doc = {
            "job_id": job_id,
            "job_title": "Unknown",  #placeholder
            "company_name": "Unknown",  
            "status": status,
            "source": source,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        job_postings.insert_one(doc)
    
    # Always set user tag to "malicious" when using tag endpoint
    tag_result = add_job_tag(job_id, "malicious", user_id, source)
    return tag_result.modified_count > 0 or tag_result.upserted_id is not None

def untag_job(job_id, user_id):
    global_job = job_postings.find_one({'job_id': job_id})
    if not global_job:
        return False
    
    tag_doc = {
        'user_id': user_id,
        'job_id': job_id,
        'status': "ok", #always set to ok when untag
        'source': 'user_untagged',
        'tagged_at': datetime.now()
    }
    
    result = user_job_tags.update_one(
        {
            'user_id': user_id,
            'job_id': job_id
        },
        {'$set': tag_doc},
        upsert=True
    )
    
    return result.modified_count > 0 or result.upserted_id is not None