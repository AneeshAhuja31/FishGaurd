from urllib.parse import urlparse
import re
import pickle
import numpy as np
from transformers import DistilBertForSequenceClassification,DistilBertTokenizer
from sklearn.feature_extraction.text import TfidfVectorizer
import torch
from ml.src.utils import extract_url_features
import os

class PhishingDetector:
    def __init__(self,model_path='ml/models/distilbert_phishing'):
        self.model = None
        self.tokenizer = None
        self.tfidf_vectorizer = None
        self.model_path = model_path
        self.load_model()
    
    def load_model(self):
        try:
            self.model = DistilBertForSequenceClassification.from_pretrained(self.model_path) #?? complete name
            self.tokenizer = DistilBertTokenizer.from_pretrained(self.model_path)
            self.model.eval()

            vectorizer_path = os.path.join(self.model_path,"tfidf_vectorizer.pkl")
            # if os.path.exists(vectorizer_path):
            with open(f"{self.model_path}/tfidf_vectorizer.pkl","rb") as f:
                self.tfidf_vectorizer = pickle.load(f)
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            try:
                with open(f"{self.model_path}/tfidf_vectorizer.pkl", "rb") as f:
                    self.tfidf_vectorizer = pickle.load(f)
                return self.tfidf_vectorizer is not None
            except Exception as e2:
                print(f"Error loading fallback vectorizer: {e2}")
                return False
    
    def predict(self,url):
        features,text_representation = extract_url_features(url)
        if self.model is not None and self.tokenizer is not None:
            try:
                inputs = self.tokenizer(text_representation,return_tensors="pt",truncation=True,padding=True,max_length=128) #use pytorch tensor, longer text is truncated and short text is padded
                with torch.no_grad(): #run DistilBERT withot computing grad, to make it faster
                    outputs = self.model(**inputs) #unpack dictionary
                    logits = outputs.logits
                    probabilities = torch.softmax(logits,dim=1)
                    prediction = torch.argmax(probabilities,dim=1).item()
                    confidence = probabilities[0][prediction].item()
                
                result = {
                    "is_phishing":bool(prediction),
                    "confidence":confidence,
                    "features":features
                }
                result['reasons'] = self._get_reasons(features,result['is_phishing'])
                return result
            
            except Exception as e:
                print(f"Error in DistilBERT prediction, falling back to TF-IDF: {e}")
        return self._fallback_prediction(text_representation,features)
        
    def _fallback_prediction(self, text_representation, features):
        """Fallback method using TF-IDF and basic feature analysis."""
        if self.tfidf_vectorizer is None:
            # If no models are available, use purely rule-based
            score = self._calculate_rule_based_score(features)
        else:
            # Use TF-IDF vectorizer
            text_vector = self.tfidf_vectorizer.transform([text_representation])
            tfidf_score = np.mean(text_vector.toarray())
            
            # Combine TF-IDF with rule-based score
            rule_score = self._calculate_rule_based_score(features)
            score = 0.7 * rule_score + 0.3 * min(tfidf_score * 2, 1.0)
        
        # Ensure score is between 0 and 1
        score = max(min(score, 1.0), 0.0)
        is_phishing = score > 0.5
        
        result = {
            "is_phishing": is_phishing,
            "confidence": score,
            "features": features,
            "using_fallback": True
        }
        
        # Add reason based on features
        result["reasons"] = self._get_reasons(features, is_phishing)
        
        return result
    
    def _calculate_rule_based_score(self, features):
        """Calculate a phishing likelihood score based on URL features."""
        score = 0
        
        # URL length (longer URLs are more suspicious)
        if features["url_length"] > 75:
            score += 0.2
        
        # Special characters
        if features["special_chars"] > 10:
            score += 0.2
        
        # IP address in domain
        if features["has_ip"]:
            score += 0.3
        
        # Suspicious keywords
        score += min(features["suspicious_keywords"] * 0.1, 0.3)
        
        # Many dots in domain
        if features["dots_in_domain"] > 3:
            score += 0.2
            
        return min(score, 1.0)
    
    def _get_reasons(self,features,is_phishing):
        reasons = []
        if not is_phishing:
            return ['URL appears to be legimate based on analysis']

        if features['url_length']>75:
            reasons.append("Unusually long URL")

        if features['dots_in_domain']>3:
            reasons.append('Excessive dots in domain')

        if features['special_chars'] > 10:
            reasons.append("High number of special characters")

        if features['has_ip']:
            reasons.append('IP address used instead of domain name')

        if features['suspicious_keywords']>1:
            reasons.append("Contains suspicious keywords")

        return reasons or ["Combination of suspicious URL patterns"]
            

