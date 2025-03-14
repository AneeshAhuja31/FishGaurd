import os
import pandas as pd
import torch
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report,confusion_matrix
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
from transformers import Trainer,TrainingArguments
import pickle
import numpy as np
from datasets import Dataset
from urllib.parse import urlparse
import argparse
from ml.src.utils import extract_url_features
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_data(data_dir,use_processed=True):
    if use_processed:
        try:
            train_df = pd.read_csv(f"{data_dir}/processed/train_urls.csv")
            logger.info(f"Loaded processed training data with {len(train_df)} samples")
            return train_df
        except FileNotFoundError:
            logger.warning("Processed data not found, falling back to raw data")
    
    

def evaluate_model(model,tokenizer,test_df):
    model.eval()
    test_urls = test_df['url'].tolist()
    test_labels = test_df['label'].tolist()
    predictions = []

    batch_size = 32
    for i in range(0,len(test_urls),batch_size):
        batch_urls = test_urls[i:i+batch_size]
        inputs = tokenizer(batch_urls,padding=True,truncation=True,max_length=128,return_tensors='pt')
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            batch_preds = torch.argmax(logits,dim=1).tolist()
            predictions.extend(batch_preds)
        
        report = classification_report(test_labels,predictions,output_dict=True)
        conf_matrix = confusion_matrix(test_labels,predictions)
        logger.info("\nClassification Report:\n" + classification_report(test_labels, predictions))
        logger.info("\nConfusion Matrix:\n" + str(conf_matrix))
        
        return {
            "report": report,
            "confusion_matrix": conf_matrix,
            "accuracy": report['accuracy']
        }
    
def train_model(data_dir='ml/data',output_dir='ml/models/distilbert_phishing',use_processed=True,epochs=3,batch_size=16,learning_rate=5e-5):
    logger.info("Loading data...")
    if use_processed:
        try:
            train_df = pd.read_csv(f"{data_dir}/processed/train_urls.csv")
            val_df = pd.read_csv(f"{data_dir}/processed/val_urls.csv")
            test_df = pd.read_csv(f"{data_dir}/processed/test_urls.csv")
            logger.info(f"Loaded processed data: {len(train_df)} train, {len(val_df)} validation, {len(test_df)} test samples")
        except FileNotFoundError:
            logger.warning("Processed data not found, generating splits from raw data")
            use_processed = False
    tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')

    def tokenize_function(examples):
        return tokenizer(examples['url'],padding='max_length',truncation=True,max_length=128)
    
    #pandas dataset to Hugging Face Dataset 
    train_dataset = Dataset.from_pandas(train_df)
    val_dataset = Dataset.from_pandas(val_df)

    train_tokenized = train_dataset.map(tokenize_function,batched=True)
    val_tokenized = val_dataset.map(tokenize_function,batched=True)

    model = DistilBertForSequenceClassification.from_pretrained('distilbert-base-uncased',num_labels=2)
    training_args = TrainingArguments(
        output_dir=output_dir,
        eval_strategy='epoch',
        learning_rate=learning_rate,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        num_train_epochs=epochs,
        weight_decay=0.01,
        save_strategy='epoch',
        load_best_model_at_end=True,
        metric_for_best_model='eval_loss',
        report_to='none'
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_tokenized,
        eval_dataset=val_tokenized,
        tokenizer=tokenizer
    )
    logger.info("Training the model..")
    train_result = trainer.train()

    logger.info("Saving the model..")
    os.makedirs(output_dir,exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    logger.info("Creating fallback tf-idf vectorizer..")
    tfidf_vectorizer = TfidfVectorizer(max_features=5000)
    all_texts = pd.concat([train_df,val_df])['url']
    tfidf_vectorizer.fit(all_texts)

    with open(f"{output_dir}/tfidf_vectorizer.pkl","wb") as f:
        pickle.dump(tfidf_vectorizer,f)
    
    eval_results = evaluate_model(model,tokenizer,test_df)
    with open(f"{output_dir}/eval_results.pkl",'wb') as f:
        pickle.dump(eval_results,f)
    
    logging.info(f"Model and evaluation results saved to {output_dir}")

    return {
        "training_loss":train_result.training_loss,
        "eval_results":eval_results
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train phishing detection model')
    parser.add_argument('--data_dir',type=str,default='ml/data',help='Directory containing data')
    parser.add_argument('--output_dir',type=str,default='ml/models/distilbert_phishing',help='Directory to save model')
    parser.add_argument('--epochs',type=int,default=3,help='Number of training epochs')
    parser.add_argument('--batch_size',type=int,default=16,help='Batch size')
    parser.add_argument('--learning_rate',type=float,default=5e-5,help='Learning rate')
    parser.add_argument('--use_processed',action='store_true',help='Use processed data if available')
    args = parser.parse_args()

    train_model(data_dir=args.data_dir,
                output_dir=args.output_dir,
                epochs=args.epochs,
                batch_size=args.batch_size,
                learning_rate=args.learning_rate,
                use_processed=True
        )

