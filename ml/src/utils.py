import re
from urllib.parse import urlparse

def extract_url_features(url):
        features = {}

        parsed_url = urlparse(url)
        features['domain']=parsed_url.netloc
        features['path']=parsed_url.path
        features['query']=parsed_url.query

        features['url_length'] = len(url)
        features['dots_in_domain']=features['domain'].count('.')
        features['special_chars']=len(re.findall(r'[^a-zA-Z0-9]',url))
        features['has_ip']=1 if re.search(r'\d+\.\d+\.\d+\.\d+',features['domain']) else 0
        suspicious_keywords = ["secure", "account", "update", "login", "verify", "bank", 
                          "confirm", "user", "client", "suspend", "unusual", "verify"]
        features["suspicious_keywords"] = sum(1 for keyword in suspicious_keywords if keyword in url.lower())
    
        # features['suspicious_keywords'] = ['secure','account', 'update', 'login', 'verify', 'bank', 
        #                       'confirm', 'user', 'client', 'suspend', 'unusual', 'verify', 'auth']
        text_representation = f"{features['domain']} {features['path']} {features['query']}"
        
        if features["has_ip"]:
            text_representation += " has_ip_address"
    
        if features["url_length"] > 75:
            text_representation += " long_url"
    
        if features["dots_in_domain"] > 3:
            text_representation += " many_dots"
        
        for keyword in suspicious_keywords:
             if keyword in url.lower():
                  text_representation += f" has_{keyword}"
        
        return features, text_representation